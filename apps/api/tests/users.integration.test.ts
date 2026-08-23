import request from 'supertest'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

const TEST_EMAILS = ['users-test@orbit.app', 'users-taker@orbit.app']
const TEST_ORG_SLUGS = ['users-test-personal', 'users-taker-personal']

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.organization.deleteMany({ where: { slug: { in: TEST_ORG_SLUGS } } })
  await app.prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
}

const dbAvailable = await isTestDatabaseAvailable()
const describeDb = dbAvailable ? describe : describe.skip

describeDb('users API', () => {
  let app: BuiltTestApp
  let accessToken: string
  let outsiderAccessToken: string
  let userId: string
  let orgId: string
  let ownerRoleId: string
  let outsiderUserId: string

  /** Fetches a CSRF token and returns headers that pass the double-submit check. */
  async function csrfHeaders(): Promise<Record<string, string>> {
    const res = await request(app.app).get('/api/v1/auth/csrf')
    const cookie = String(res.headers['set-cookie']).split(';')[0] ?? ''
    const token = res.body.data.csrfToken as string
    return { Cookie: cookie, 'X-CSRF-Token': token }
  }

  beforeAll(async () => {
    app = buildTestApp()
    await cleanupTestData(app)

    const csrf = await csrfHeaders()
    const res = await request(app.app).post('/api/v1/auth/register').set(csrf).send({
      email: TEST_EMAILS[0],
      password: 'Password123',
      fullName: 'Users Test',
    })
    expect(res.status).toBe(201)
    accessToken = res.body.data.accessToken as string
    userId = res.body.data.user.id as string

    const ownerMembership = await app.prisma.organizationMember.findFirstOrThrow({
      where: { userId },
    })
    orgId = ownerMembership.orgId
    ownerRoleId = ownerMembership.roleId

    const outsider = await request(app.app)
      .post('/api/v1/auth/register')
      .set(await csrfHeaders())
      .send({
        email: TEST_EMAILS[1],
        password: 'Password123',
        fullName: 'Users Taker',
      })
    expect(outsider.status).toBe(201)
    outsiderAccessToken = outsider.body.data.accessToken as string
    outsiderUserId = outsider.body.data.user.id as string
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('updates the profile', async () => {
    const res = await request(app.app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())
      .send({ fullName: 'Users Test Updated', bio: 'Building orbit' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      fullName: 'Users Test Updated',
      bio: 'Building orbit',
    })
  })

  it('validates profile input', async () => {
    const res = await request(app.app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())
      .send({ fullName: '' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('uploads and then removes an avatar', async () => {
    const jpeg = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: '#14283c',
      },
    })
      .jpeg()
      .toBuffer()

    const uploaded = await request(app.app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())
      .attach('avatar', jpeg, {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })

    expect(uploaded.status).toBe(200)
    expect(uploaded.body.data.avatarKey).toMatch(/^avatars\/.+\/.+\.jpg$/)

    const downloaded = await request(app.app)
      .get(`/api/v1/users/${userId}/avatar`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(downloaded.status).toBe(200)
    expect(downloaded.headers['content-type']).toContain('image/jpeg')
    expect(downloaded.headers['cache-control']).toBe('private, max-age=300')

    const anonymous = await request(app.app).get(`/api/v1/users/${userId}/avatar`)
    expect(anonymous.status).toBe(401)

    const crossTenant = await request(app.app)
      .get(`/api/v1/users/${userId}/avatar`)
      .set('Authorization', `Bearer ${outsiderAccessToken}`)
    expect(crossTenant.status).toBe(404)

    const removed = await request(app.app)
      .delete('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())

    expect(removed.status).toBe(200)
    expect(removed.body.data.avatarKey).toBeNull()
  })

  it('rejects a missing avatar file', async () => {
    const res = await request(app.app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it('rejects unsupported avatar types', async () => {
    const res = await request(app.app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())
      .attach('avatar', Buffer.from('gif-bytes'), {
        filename: 'avatar.gif',
        contentType: 'image/gif',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it('returns defaults, updates and persists preferences', async () => {
    const defaults = await request(app.app)
      .get('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(defaults.status).toBe(200)
    expect(defaults.body.data).toEqual({
      theme: 'system',
      locale: 'en',
      digestSummaries: true,
      emailNotifications: true,
      weeklyReport: false,
    })

    const updated = await request(app.app)
      .patch('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(await csrfHeaders())
      .send({ theme: 'dark', locale: 'es' })

    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({ theme: 'dark', locale: 'es' })

    const persisted = await request(app.app)
      .get('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(persisted.body.data).toMatchObject({ theme: 'dark', locale: 'es' })
  })

  it('searches users and excludes the caller', async () => {
    const isolated = await request(app.app)
      .get('/api/v1/users/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orgId, q: 'users' })

    expect(isolated.status).toBe(200)
    expect(isolated.body.data).toEqual([])

    await app.prisma.organizationMember.create({
      data: { orgId, userId: outsiderUserId, roleId: ownerRoleId },
    })

    const res = await request(app.app)
      .get('/api/v1/users/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orgId, q: 'users' })

    expect(res.status).toBe(200)
    const emails = (res.body.data as Array<{ email: string }>).map((user) => user.email)
    expect(emails).toContain(TEST_EMAILS[1])
    expect(emails).not.toContain(TEST_EMAILS[0])
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 1 })
  })

  it('requires authentication', async () => {
    const res = await request(app.app)
      .patch('/api/v1/users/me')
      .set(await csrfHeaders())
      .send({ fullName: 'Nope' })

    expect(res.status).toBe(401)
  })
})
