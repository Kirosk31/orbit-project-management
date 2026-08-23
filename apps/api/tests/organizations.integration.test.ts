import request from 'supertest'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@orbit/shared'
import type { PrismaClient } from '@prisma/client'
import {
  buildTestApp,
  isTestDatabaseAvailable,
  latestInvitationToken,
  type BuiltTestApp,
} from './testApp.js'

const TEST_EMAILS = ['orgs-owner@orbit.app', 'orgs-member@orbit.app', 'orgs-outsider@orbit.app']
const TEST_ROLE_KEYS = new Map<string, string[]>([
  ['OWNER', [...PERMISSIONS]],
  ['ADMIN', PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles')],
  ['VIEWER', ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view']],
])

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.organization.deleteMany({
    where: { owner: { email: { in: TEST_EMAILS } } },
  })
  await app.prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
}

async function seedRoles(prisma: PrismaClient): Promise<void> {
  const permissions = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, name: key, scope: 'ORGANIZATION' },
      }),
    ),
  )
  const byKey = new Map(permissions.map((permission) => [permission.key, permission]))

  for (const [key, keys] of TEST_ROLE_KEYS) {
    const existing = await prisma.role.findFirst({ where: { orgId: null, key } })
    const role = existing
      ? await prisma.role.update({ where: { id: existing.id }, data: { name: key } })
      : await prisma.role.create({ data: { key, name: key, isSystem: true } })
    await prisma.rolePermission.createMany({
      data: keys.map((permissionKey) => ({
        roleId: role.id,
        permissionId: byKey.get(permissionKey)!.id,
      })),
      skipDuplicates: true,
    })
  }
}

const dbAvailable = await isTestDatabaseAvailable()
const describeDb = dbAvailable ? describe : describe.skip

describeDb('organizations API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let memberToken: string
  let outsiderToken: string
  let memberUserId: string
  let teamId: string
  let invitationId: string
  let viewerRoleId: string

  async function csrfHeaders(): Promise<Record<string, string>> {
    const res = await request(app.app).get('/api/v1/auth/csrf')
    const cookie = String(res.headers['set-cookie']).split(';')[0] ?? ''
    const token = res.body.data.csrfToken as string
    return { Cookie: cookie, 'X-CSRF-Token': token }
  }

  async function register(
    email: string,
    fullName: string,
  ): Promise<{ token: string; userId: string }> {
    const res = await request(app.app)
      .post('/api/v1/auth/register')
      .set(await csrfHeaders())
      .send({ email, password: 'Password123', fullName })
    expect(res.status).toBe(201)
    return {
      token: res.body.data.accessToken as string,
      userId: res.body.data.user.id as string,
    }
  }

  beforeAll(async () => {
    app = buildTestApp()
    await cleanupTestData(app)
    await seedRoles(app.prisma)

    const owner = await register(TEST_EMAILS[0]!, 'Org Owner')
    const member = await register(TEST_EMAILS[1]!, 'Org Member')
    const outsider = await register(TEST_EMAILS[2]!, 'Org Outsider')
    ownerToken = owner.token
    memberToken = member.token
    outsiderToken = outsider.token
    memberUserId = member.userId

    viewerRoleId = (
      await app.prisma.role.findFirstOrThrow({ where: { orgId: null, key: 'VIEWER' } })
    ).id
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('creates an organization with the owner membership', async () => {
    const res = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Orbit Test Workspace', description: 'Testing orgs' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      slug: 'orbit-test-workspace',
      name: 'Orbit Test Workspace',
      description: 'Testing orgs',
      isPersonal: false,
      roleKey: 'OWNER',
      memberCount: 1,
    })
  })

  it('lists organizations the user belongs to', async () => {
    const res = await request(app.app)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'orbit-test-workspace', roleKey: 'OWNER' }),
      ]),
    )
  })

  it('requires authentication', async () => {
    const res = await request(app.app).get('/api/v1/organizations')
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-members and unknown slugs', async () => {
    const notMember = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(notMember.status).toBe(404)

    const unknown = await request(app.app)
      .get('/api/v1/organizations/does-not-exist')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(unknown.status).toBe(404)
  })

  it('gets and updates an organization', async () => {
    const getRes = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(getRes.status).toBe(200)
    expect(getRes.body.data).toMatchObject({
      slug: 'orbit-test-workspace',
      memberCount: 1,
    })

    const updateRes = await request(app.app)
      .patch('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Orbit Test Workspace 2', description: '' })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data).toMatchObject({
      name: 'Orbit Test Workspace 2',
      description: null,
    })

    const audit = await app.prisma.auditLog.findFirst({
      where: {
        orgId: updateRes.body.data.id as string,
        action: 'organization.updated',
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit?.changes).toEqual({ fields: ['name', 'description'] })
  })

  it('invites, lists and revokes invitations', async () => {
    const invited = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ email: TEST_EMAILS[1], roleId: viewerRoleId })

    expect(invited.status).toBe(201)
    expect(invited.body.data).toMatchObject({
      email: TEST_EMAILS[1],
      status: 'PENDING',
      roleName: 'VIEWER',
    })
    invitationId = invited.body.data.id as string

    const duplicate = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ email: TEST_EMAILS[1], roleId: viewerRoleId })
    expect(duplicate.status).toBe(409)

    const list = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0]).toMatchObject({
      email: TEST_EMAILS[1],
      inviterName: 'Org Owner',
    })

    const revoked = await request(app.app)
      .post(`/api/v1/organizations/orbit-test-workspace/invitations/${invitationId}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(revoked.status).toBe(200)
    expect(revoked.body.data).toEqual({ revoked: true })
  })

  it('accepts an invitation and joins the organization', async () => {
    const created = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ email: TEST_EMAILS[1], roleId: viewerRoleId })
    expect(created.body.data).not.toHaveProperty('token')
    const token = latestInvitationToken(app, TEST_EMAILS[1]!)

    const wrongAccount = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set(await csrfHeaders())
      .send({ token })
    expect(wrongAccount.status).toBe(404)

    const accepted = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ token })

    expect(accepted.status).toBe(200)
    expect(accepted.body.data).toMatchObject({
      slug: 'orbit-test-workspace',
      roleKey: 'VIEWER',
      memberCount: 2,
    })

    const secondAccept = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ token })
    expect(secondAccept.status).toBe(409)

    const invalid = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set(await csrfHeaders())
      .send({ token: 'totally-made-up' })
    expect(invalid.status).toBe(404)
  })

  it('enforces org.update permission for viewers', async () => {
    const res = await request(app.app)
      .patch('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Hijack' })

    expect(res.status).toBe(403)
  })

  it('enforces org.manageMembers permission for viewers', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/organizations/orbit-test-workspace/members/${memberUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ roleId: viewerRoleId })

    expect(res.status).toBe(403)
  })

  it('enforces org.manageTeams permission for viewers', async () => {
    const res = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/teams')
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Sneaky' })
    expect(res.status).toBe(403)
  })

  it('rejects expired invitations', async () => {
    const created = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ email: TEST_EMAILS[2], roleId: viewerRoleId })
    const token = latestInvitationToken(app, TEST_EMAILS[2]!)
    const id = created.body.data.id as string

    await app.prisma.invitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const res = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set(await csrfHeaders())
      .send({ token })

    expect(res.status).toBe(409)

    const stored = await app.prisma.invitation.findUnique({ where: { id } })
    expect(stored?.status).toBe('EXPIRED')
  })

  it('lists members and changes roles', async () => {
    const members = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace/members')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(members.status).toBe(200)
    expect(members.body.data).toHaveLength(2)

    const adminRole = await app.prisma.role.findFirstOrThrow({
      where: { orgId: null, key: 'ADMIN' },
    })
    const promoted = await request(app.app)
      .patch(`/api/v1/organizations/orbit-test-workspace/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ roleId: adminRole.id })

    expect(promoted.status).toBe(200)
    expect(promoted.body.data).toMatchObject({ roleKey: 'ADMIN', roleName: 'ADMIN' })
  })

  it('protects the owner membership', async () => {
    const ownerMember = await app.prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: TEST_EMAILS[0] }, org: { slug: 'orbit-test-workspace' } },
    })

    const changeRole = await request(app.app)
      .patch(`/api/v1/organizations/orbit-test-workspace/members/${ownerMember.userId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ roleId: viewerRoleId })
    expect(changeRole.status).toBe(403)

    const remove = await request(app.app)
      .delete(`/api/v1/organizations/orbit-test-workspace/members/${ownerMember.userId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(remove.status).toBe(403)
  })

  it('manages teams with member constraints', async () => {
    const created = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Platform', description: 'Core platform crew' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Platform', memberCount: 0 })
    teamId = created.body.data.id as string

    const duplicate = await request(app.app)
      .post('/api/v1/organizations/orbit-test-workspace/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Platform' })
    expect(duplicate.status).toBe(409)

    const added = await request(app.app)
      .post(`/api/v1/organizations/orbit-test-workspace/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ userId: memberUserId })
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ fullName: 'Org Member' })

    const outsiderId = (
      await app.prisma.user.findUniqueOrThrow({ where: { email: TEST_EMAILS[2] } })
    ).id
    const nonMember = await request(app.app)
      .post(`/api/v1/organizations/orbit-test-workspace/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ userId: outsiderId })
    expect(nonMember.status).toBe(400)

    const teams = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(teams.status).toBe(200)
    expect(teams.body.data[0]).toMatchObject({ name: 'Platform', memberCount: 1 })

    const removed = await request(app.app)
      .delete(`/api/v1/organizations/orbit-test-workspace/teams/${teamId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(removed.status).toBe(200)

    const deleted = await request(app.app)
      .delete(`/api/v1/organizations/orbit-test-workspace/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deleted.status).toBe(200)
  })

  it('soft-deletes the organization with org.delete', async () => {
    const res = await request(app.app)
      .delete('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(200)

    const gone = await request(app.app)
      .get('/api/v1/organizations/orbit-test-workspace')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(gone.status).toBe(404)
  })
})
