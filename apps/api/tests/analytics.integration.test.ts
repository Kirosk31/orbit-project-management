import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@orbit/shared'
import type { PrismaClient } from '@prisma/client'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

const TEST_EMAILS = [
  'analytics-owner@orbit.app',
  'analytics-viewer@orbit.app',
  'analytics-outsider@orbit.app',
]

async function seedRoles(prisma: PrismaClient): Promise<{ viewerRoleId: string }> {
  const permissions = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, name: key, scope: 'ORGANIZATION' },
      }),
    ),
  )
  const byKey = new Map(permissions.map((permission) => [permission.key, permission.id]))

  const owner =
    (await prisma.role.findFirst({ where: { orgId: null, key: 'OWNER' } })) ??
    (await prisma.role.create({ data: { key: 'OWNER', name: 'Owner', isSystem: true } }))
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: owner.id, permissionId: permission.id })),
    skipDuplicates: true,
  })

  const viewer =
    (await prisma.role.findFirst({ where: { orgId: null, key: 'ANALYTICS_VIEWER' } })) ??
    (await prisma.role.create({
      data: { key: 'ANALYTICS_VIEWER', name: 'Analytics viewer', isSystem: true },
    }))
  await prisma.rolePermission.createMany({
    data: ['org.view', 'project.view', 'task.view'].map((key) => ({
      roleId: viewer.id,
      permissionId: byKey.get(key)!,
    })),
    skipDuplicates: true,
  })
  return { viewerRoleId: viewer.id }
}

async function cleanup(prisma: PrismaClient): Promise<void> {
  await prisma.organization.deleteMany({ where: { owner: { email: { in: TEST_EMAILS } } } })
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
}

const describeDb = (await isTestDatabaseAvailable()) ? describe : describe.skip

describeDb('organization analytics API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let viewerToken: string
  let outsiderToken: string
  let ownerId: string
  let viewerId: string
  let orgId: string
  let orgSlug: string
  let foreignSlug: string

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
    return response.body.data as { id: string; slug: string }
  }

  beforeAll(async () => {
    app = buildTestApp()
    await cleanup(app.prisma)
    const { viewerRoleId } = await seedRoles(app.prisma)
    const owner = await register(TEST_EMAILS[0]!, 'Analytics Owner')
    const viewer = await register(TEST_EMAILS[1]!, 'Analytics Viewer')
    const outsider = await register(TEST_EMAILS[2]!, 'Analytics Outsider')
    ownerToken = owner.token
    viewerToken = viewer.token
    outsiderToken = outsider.token
    ownerId = owner.userId
    viewerId = viewer.userId

    const organization = await createOrganization(ownerToken, 'Analytics Workspace')
    const foreignOrganization = await createOrganization(outsiderToken, 'Analytics Foreign')
    orgId = organization.id
    orgSlug = organization.slug
    foreignSlug = foreignOrganization.slug
    await app.prisma.organizationMember.create({
      data: { orgId, userId: viewerId, roleId: viewerRoleId },
    })

    const project = await app.prisma.project.create({
      data: {
        orgId,
        createdById: ownerId,
        name: 'Analytics Project',
        key: 'ANL',
      },
    })
    const status = await app.prisma.taskStatus.create({
      data: { orgId, name: 'Analytics To Do' },
    })
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1_000)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1_000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1_000)

    const overdue = await app.prisma.task.create({
      data: {
        orgId,
        projectId: project.id,
        statusId: status.id,
        createdById: ownerId,
        title: 'Overdue analytics task',
        createdAt: fortyDaysAgo,
        dueDate: yesterday,
        trackedSeconds: 3_600,
        assignees: { create: { userId: viewerId } },
      },
    })
    await app.prisma.task.create({
      data: {
        orgId,
        projectId: project.id,
        statusId: status.id,
        createdById: ownerId,
        title: 'Completed analytics task',
        dueDate: tomorrow,
        trackedSeconds: 3_600,
        isCompleted: true,
        completedAt: new Date(),
        assignees: { create: { userId: ownerId } },
      },
    })
    const recent = await app.prisma.task.create({
      data: {
        orgId,
        projectId: project.id,
        statusId: status.id,
        createdById: ownerId,
        title: 'Recent analytics task',
      },
    })
    await app.prisma.taskActivity.create({
      data: {
        taskId: recent.id,
        actorId: ownerId,
        action: 'CREATED',
        entityType: 'TASK',
        entityId: recent.id,
      },
    })
    expect(overdue.id).toBeTruthy()
  })

  afterAll(async () => {
    await cleanup(app.prisma)
    await app.prisma.$disconnect()
  })

  it('requires authentication and the dashboard permission', async () => {
    const anonymous = await request(app.app).get(`/api/v1/organizations/${orgSlug}/analytics`)
    expect(anonymous.status).toBe(401)

    const viewer = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/analytics`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(viewer.status).toBe(403)
  })

  it('conceals analytics belonging to another tenant', async () => {
    const response = await request(app.app)
      .get(`/api/v1/organizations/${foreignSlug}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(response.status).toBe(404)
  })

  it('returns bounded summary, progress, workload, velocity, burndown, and activity data', async () => {
    const response = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/analytics?days=30`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data.period.days).toBe(30)
    expect(response.body.data.summary).toEqual({
      totalTasks: 3,
      openTasks: 2,
      completedTasks: 1,
      createdInPeriod: 2,
      completedInPeriod: 1,
      overdueTasks: 1,
      completionRate: 33,
      trackedSeconds: 7_200,
    })
    expect(response.body.data.projectProgress[0]).toMatchObject({
      projectKey: 'ANL',
      totalTasks: 3,
      completedTasks: 1,
      overdueTasks: 1,
      progress: 33,
    })
    expect(response.body.data.workload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: viewerId, openTasks: 1, overdueTasks: 1 }),
        expect.objectContaining({ userId: ownerId, completedInPeriod: 1 }),
      ]),
    )
    expect(response.body.data.trend).toHaveLength(30)
    expect(response.body.data.trend.at(-1)).toMatchObject({
      created: 2,
      completed: 1,
      remaining: 2,
      activity: 1,
    })
  })

  it('rejects abusive reporting windows', async () => {
    const response = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/analytics?days=3650`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(response.status).toBe(400)
  })
})
