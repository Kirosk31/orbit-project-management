import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@orbit/shared'
import type { PrismaClient } from '@prisma/client'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

const TEST_EMAILS = ['search-owner@orbit.app', 'search-outsider@orbit.app']

async function seedOwnerRole(prisma: PrismaClient): Promise<void> {
  const permissions = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, name: key, scope: 'ORGANIZATION' },
      }),
    ),
  )
  const existing = await prisma.role.findFirst({ where: { orgId: null, key: 'OWNER' } })
  const role = existing
    ? await prisma.role.update({ where: { id: existing.id }, data: { name: 'Owner' } })
    : await prisma.role.create({
        data: { key: 'OWNER', name: 'Owner', isSystem: true },
      })
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  })
}

async function cleanup(prisma: PrismaClient): Promise<void> {
  await prisma.organization.deleteMany({
    where: { owner: { email: { in: TEST_EMAILS } } },
  })
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
}

const describeDb = (await isTestDatabaseAvailable()) ? describe : describe.skip

describeDb('global search API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let outsiderToken: string
  let ownerId: string
  let outsiderId: string
  let orgId: string
  let foreignOrgId: string
  let taskId: string

  async function csrfHeaders(): Promise<Record<string, string>> {
    const response = await request(app.app).get('/api/v1/auth/csrf')
    return {
      Cookie: String(response.headers['set-cookie']).split(';')[0] ?? '',
      'X-CSRF-Token': response.body.data.csrfToken as string,
    }
  }

  async function register(email: string, fullName: string) {
    const response = await request(app.app)
      .post('/api/v1/auth/register')
      .set(await csrfHeaders())
      .send({ email, password: 'Password123', fullName })
    expect(response.status).toBe(201)
    return {
      token: response.body.data.accessToken as string,
      userId: response.body.data.user.id as string,
    }
  }

  async function createOrganization(token: string, name: string) {
    const response = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .set(await csrfHeaders())
      .send({ name })
    expect(response.status).toBe(201)
    return response.body.data.id as string
  }

  beforeAll(async () => {
    app = buildTestApp()
    await cleanup(app.prisma)
    await seedOwnerRole(app.prisma)

    const owner = await register(TEST_EMAILS[0]!, 'Search Owner')
    const outsider = await register(TEST_EMAILS[1]!, 'Search Outsider')
    ownerToken = owner.token
    outsiderToken = outsider.token
    ownerId = owner.userId
    outsiderId = outsider.userId
    orgId = await createOrganization(ownerToken, 'Search Workspace')
    foreignOrgId = await createOrganization(outsiderToken, 'Foreign Search Workspace')

    const project = await app.prisma.project.create({
      data: {
        orgId,
        createdById: ownerId,
        name: 'Apollo Search Project',
        key: 'ASP',
        description: 'A searchable project description',
      },
    })
    const status = await app.prisma.taskStatus.create({
      data: { orgId, name: 'Search To Do', position: 0 },
    })
    const task = await app.prisma.task.create({
      data: {
        orgId,
        projectId: project.id,
        statusId: status.id,
        createdById: ownerId,
        title: 'Apollo launch checklist',
        description: 'Verify the search isolation controls',
      },
    })
    taskId = task.id
    await app.prisma.comment.create({
      data: { taskId, authorId: ownerId, body: 'Apollo comment search marker' },
    })
    await app.prisma.label.create({ data: { orgId, name: 'Apollo label' } })

    const foreignProject = await app.prisma.project.create({
      data: {
        orgId: foreignOrgId,
        createdById: outsiderId,
        name: 'Apollo Confidential Project',
        key: 'ACP',
      },
    })
    const foreignStatus = await app.prisma.taskStatus.create({
      data: { orgId: foreignOrgId, name: 'Foreign To Do', position: 0 },
    })
    await app.prisma.task.create({
      data: {
        orgId: foreignOrgId,
        projectId: foreignProject.id,
        statusId: foreignStatus.id,
        createdById: outsiderId,
        title: 'Apollo secret task',
      },
    })
  })

  afterAll(async () => {
    await cleanup(app.prisma)
    await app.prisma.$disconnect()
  })

  it('requires authentication', async () => {
    const response = await request(app.app).get('/api/v1/search?q=Apollo')
    expect(response.status).toBe(401)
  })

  it('searches all supported resource types inside authorized tenants only', async () => {
    const response = await request(app.app)
      .get('/api/v1/search?q=Apollo&pageSize=20')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data.total).toBe(4)
    expect(new Set(response.body.data.rows.map((row: { type: string }) => row.type))).toEqual(
      new Set(['TASK', 'PROJECT', 'COMMENT', 'LABEL']),
    )
    expect(response.body.data.rows.every((row: { orgId: string }) => row.orgId === orgId)).toBe(
      true,
    )
    expect(
      response.body.data.rows.find((row: { type: string }) => row.type === 'TASK').linkUrl,
    ).toBe(`/app/tasks/${taskId}`)
  })

  it('applies type and organization scopes without exposing another tenant', async () => {
    const allowed = await request(app.app)
      .get(`/api/v1/search?q=Apollo&types=TASK&orgId=${orgId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(allowed.status).toBe(200)
    expect(allowed.body.data.rows).toHaveLength(1)
    expect(allowed.body.data.rows[0]).toMatchObject({ type: 'TASK', orgId })

    const forbiddenTenant = await request(app.app)
      .get(`/api/v1/search?q=Apollo&orgId=${foreignOrgId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(forbiddenTenant.status).toBe(200)
    expect(forbiddenTenant.body.data).toEqual({ rows: [], total: 0 })
  })

  it('validates query bounds and type allowlists', async () => {
    const tooShort = await request(app.app)
      .get('/api/v1/search?q=a')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(tooShort.status).toBe(400)

    const invalidType = await request(app.app)
      .get('/api/v1/search?q=Apollo&types=TASK,DATABASE')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(invalidType.status).toBe(400)

    const oversizedPage = await request(app.app)
      .get('/api/v1/search?q=Apollo&pageSize=999')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(oversizedPage.status).toBe(400)
  })

  it('treats SQL wildcard characters as literal text', async () => {
    const response = await request(app.app)
      .get('/api/v1/search?q=%25%25')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ rows: [], total: 0 })
  })
})
