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

const TEST_EMAILS = [
  'boards-owner@orbit.app',
  'boards-member@orbit.app',
  'boards-viewer@orbit.app',
  'boards-outsider@orbit.app',
]
const TEST_ROLE_KEYS = new Map<string, string[]>([
  ['OWNER', [...PERMISSIONS]],
  ['ADMIN', PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles')],
  ['VIEWER', ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view']],
])

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.column.deleteMany({
    where: { board: { project: { org: { owner: { email: { in: TEST_EMAILS } } } } } },
  })
  await app.prisma.taskStatus.deleteMany({
    where: {
      OR: [
        { org: { owner: { email: { in: TEST_EMAILS } } } },
        { orgId: '00000000-0000-0000-0000-000000000000' },
      ],
    },
  })
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

describeDb('boards API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let viewerToken: string
  let outsiderToken: string
  let viewerRoleId: string
  let orgSlug: string
  let projectId: string
  let boardId: string
  let statusId: string
  let foreignOrgId: string

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

  async function inviteAndAccept(
    inviterToken: string,
    email: string,
    accepterToken: string,
  ): Promise<void> {
    const invite = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/invitations`)
      .set('Authorization', `Bearer ${inviterToken}`)
      .set(await csrfHeaders())
      .send({ email, roleId: viewerRoleId })
    expect(invite.status).toBe(201)
    const accept = await request(app.app)
      .post('/api/v1/organizations/invitations/accept')
      .set('Authorization', `Bearer ${accepterToken}`)
      .set(await csrfHeaders())
      .send({ token: latestInvitationToken(app, email) })
    expect(accept.status).toBe(200)
  }

  beforeAll(async () => {
    app = buildTestApp()
    await cleanupTestData(app)
    await seedRoles(app.prisma)

    const owner = await register(TEST_EMAILS[0]!, 'Board Owner')
    const viewer = await register(TEST_EMAILS[2]!, 'Board Viewer')
    const outsider = await register(TEST_EMAILS[3]!, 'Board Outsider')
    ownerToken = owner.token
    viewerToken = viewer.token
    outsiderToken = outsider.token

    viewerRoleId = (
      await app.prisma.role.findFirstOrThrow({ where: { orgId: null, key: 'VIEWER' } })
    ).id

    const createOrg = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Boards Workspace' })
    expect(createOrg.status).toBe(201)
    orgSlug = createOrg.body.data.slug as string

    foreignOrgId = (
      await app.prisma.organization.create({
        data: { name: 'Foreign Org', slug: 'foreign-org', ownerId: owner.userId },
      })
    ).id

    await inviteAndAccept(ownerToken, TEST_EMAILS[2]!, viewerToken)

    const createProject = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Board Project', key: 'BRD' })
    expect(createProject.status).toBe(201)
    projectId = createProject.body.data.id as string
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('creates a board (board.create)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Sprint Board', description: 'Current sprint' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      projectId,
      name: 'Sprint Board',
      description: 'Current sprint',
      isArchived: false,
      columnCount: 0,
    })
    boardId = res.body.data.id as string
  })

  it('denies board creation to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('lists boards (project.view)', async () => {
    const res = await request(app.app)
      .get(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ name: 'Sprint Board' })
  })

  it('hides the board from outsiders', async () => {
    const res = await request(app.app)
      .get(`/api/v1/boards/${boardId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(404)
  })

  it('creates a column and auto-creates its org status', async () => {
    const res = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'To Do', color: '#0ea5e9', wipLimit: 3 })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      name: 'To Do',
      color: '#0ea5e9',
      wipLimit: 3,
      position: 0,
      statusName: 'To Do',
      taskCount: 0,
    })
    statusId = res.body.data.statusId as string
    expect(statusId).toBeTruthy()

    const status = await app.prisma.taskStatus.findUnique({ where: { id: statusId } })
    expect(status?.isSystem).toBe(false)
  })

  it('reuses an existing status by name', async () => {
    const org = await app.prisma.organization.findFirstOrThrow({
      where: { slug: orgSlug },
    })
    const unattached = await app.prisma.taskStatus.create({
      data: { orgId: org.id, name: 'In Review', color: '#a855f7', position: 5 },
    })

    const res = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'in review' })

    expect(res.status).toBe(201)
    expect(res.body.data.statusId).toBe(unattached.id)
  })

  it('rejects a column whose status is already on the board', async () => {
    const res = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Duplicate', statusId })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('rejects a status from another organization', async () => {
    const foreign = await app.prisma.taskStatus.create({
      data: {
        orgId: foreignOrgId,
        name: 'Foreign',
        color: '#000000',
        position: 99,
      },
    })
    const res = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Foreign', statusId: foreign.id })
    expect(res.status).toBe(400)
    await app.prisma.taskStatus.delete({ where: { id: foreign.id } })
  })

  it('lists columns in position order', async () => {
    const res = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data.map((column: { name: string }) => column.name)).toEqual([
      'To Do',
      'in review',
    ])
  })

  it('moves a column via toPosition (board.update)', async () => {
    const columns = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const firstId = columns.body.data[0].id as string

    const res = await request(app.app)
      .post(`/api/v1/columns/${firstId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ toPosition: 1 })
    expect(res.status).toBe(200)

    const after = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(after.body.data[0].id).not.toBe(firstId)
    expect(after.body.data[1].id).toBe(firstId)
  })

  it('denies column moves to viewers', async () => {
    const columns = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const res = await request(app.app)
      .post(`/api/v1/columns/${columns.body.data[0].id}/move`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ toPosition: 0 })
    expect(res.status).toBe(403)
  })

  it('updates a column', async () => {
    const columns = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const columnId = columns.body.data[0].id as string

    const res = await request(app.app)
      .patch(`/api/v1/columns/${columnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'In Progress', wipLimit: 5 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ name: 'In Progress', wipLimit: 5 })
  })

  it('clears a wip limit with null', async () => {
    const columns = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const columnId = columns.body.data[0].id as string

    const res = await request(app.app)
      .patch(`/api/v1/columns/${columnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ wipLimit: null })
    expect(res.status).toBe(200)
    expect(res.body.data.wipLimit).toBeNull()
  })

  it('validates column payloads', async () => {
    const res = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: '', wipLimit: 999 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('updates the board (board.update)', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Sprint Board 2026' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Sprint Board 2026')
  })

  it('archives and restores a board', async () => {
    const archived = await request(app.app)
      .post(`/api/v1/boards/${boardId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(archived.status).toBe(200)
    expect(archived.body.data.isArchived).toBe(true)

    const visible = await request(app.app)
      .get(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(visible.body.data).toHaveLength(0)

    const withArchived = await request(app.app)
      .get(`/api/v1/projects/${projectId}/boards?archived=true`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(withArchived.body.data).toHaveLength(1)

    await request(app.app)
      .post(`/api/v1/boards/${boardId}/unarchive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .expect(200)
  })

  it('deletes a column', async () => {
    const columns = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const columnId = columns.body.data[1].id as string

    const res = await request(app.app)
      .delete(`/api/v1/columns/${columnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(200)

    const after = await request(app.app)
      .get(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(after.body.data).toHaveLength(1)
  })

  it('soft-deletes a board (board.delete)', async () => {
    const viewerDelete = await request(app.app)
      .delete(`/api/v1/boards/${boardId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(viewerDelete.status).toBe(403)

    await request(app.app)
      .delete(`/api/v1/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .expect(200)

    const gone = await request(app.app)
      .get(`/api/v1/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(gone.status).toBe(404)
  })
})
