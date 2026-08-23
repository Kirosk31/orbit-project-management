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
  'tasks-owner@orbit.app',
  'tasks-member@orbit.app',
  'tasks-viewer@orbit.app',
  'tasks-outsider@orbit.app',
]
const TEST_ROLE_KEYS = new Map<string, string[]>([
  ['OWNER', [...PERMISSIONS]],
  ['ADMIN', PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles')],
  ['VIEWER', ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view']],
])

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.task.deleteMany({
    where: { project: { org: { owner: { email: { in: TEST_EMAILS } } } } },
  })
  await app.prisma.taskLabel.deleteMany({
    where: { label: { org: { owner: { email: { in: TEST_EMAILS } } } } },
  })
  await app.prisma.label.deleteMany({
    where: { org: { owner: { email: { in: TEST_EMAILS } } } },
  })
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

describeDb('tasks API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let memberToken: string
  let viewerToken: string
  let outsiderToken: string
  let viewerRoleId: string
  let memberRoleId: string
  let orgSlug: string
  let projectId: string
  let boardId: string
  let columnId: string
  let column2Id: string
  let statusId: string
  let memberId: string
  let outsiderId: string
  let foreignOrgId: string
  let foreignStatusId: string
  let labelId: string
  let taskId: string

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
    roleId: string,
  ): Promise<void> {
    const invite = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/invitations`)
      .set('Authorization', `Bearer ${inviterToken}`)
      .set(await csrfHeaders())
      .send({ email, roleId })
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

    const owner = await register(TEST_EMAILS[0]!, 'Task Owner')
    const member = await register(TEST_EMAILS[1]!, 'Task Member')
    const viewer = await register(TEST_EMAILS[2]!, 'Task Viewer')
    const outsider = await register(TEST_EMAILS[3]!, 'Task Outsider')
    ownerToken = owner.token
    memberToken = member.token
    viewerToken = viewer.token
    outsiderToken = outsider.token
    memberId = member.userId
    outsiderId = outsider.userId

    viewerRoleId = (
      await app.prisma.role.findFirstOrThrow({ where: { orgId: null, key: 'VIEWER' } })
    ).id
    memberRoleId = (
      await app.prisma.role.findFirstOrThrow({ where: { orgId: null, key: 'ADMIN' } })
    ).id

    const createOrg = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Tasks Workspace' })
    expect(createOrg.status).toBe(201)
    orgSlug = createOrg.body.data.slug as string

    foreignOrgId = (
      await app.prisma.organization.create({
        data: { name: 'Foreign Org', slug: 'foreign-org-tasks', ownerId: owner.userId },
      })
    ).id
    foreignStatusId = (
      await app.prisma.taskStatus.create({
        data: { orgId: foreignOrgId, name: 'Foreign', color: '#111111', position: 0 },
      })
    ).id

    await inviteAndAccept(ownerToken, TEST_EMAILS[1]!, memberToken, memberRoleId)
    await inviteAndAccept(ownerToken, TEST_EMAILS[2]!, viewerToken, viewerRoleId)

    const createProject = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Task Project', key: 'TSK' })
    expect(createProject.status).toBe(201)
    projectId = createProject.body.data.id as string

    const createBoard = await request(app.app)
      .post(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Sprint Board' })
    expect(createBoard.status).toBe(201)
    boardId = createBoard.body.data.id as string

    const col1 = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'To Do', color: '#0ea5e9' })
    expect(col1.status).toBe(201)
    columnId = col1.body.data.id as string
    statusId = col1.body.data.statusId as string

    const col2 = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Done', color: '#22c55e' })
    expect(col2.status).toBe(201)
    column2Id = col2.body.data.id as string
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('creates a label and rejects duplicates (task.update)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/labels`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Bug', color: '#ef4444' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: 'Bug', color: '#ef4444', taskCount: 0 })
    labelId = res.body.data.id as string

    const dup = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/labels`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'bug' })
    expect(dup.status).toBe(409)
  })

  it('denies label creation to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/labels`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('lists labels (task.view)', async () => {
    const res = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/labels`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ name: 'Bug' })
  })

  it('creates a task in a column (task.create)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({
        title: 'Fix login bug',
        description: 'Session cookie expires early',
        priority: 'HIGH',
        columnId,
        assigneeIds: [memberId],
        labelIds: [labelId],
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      projectId,
      boardId,
      columnId,
      statusId,
      title: 'Fix login bug',
      priority: 'HIGH',
      statusName: 'To Do',
      isCompleted: false,
      position: 0,
    })
    expect(res.body.data.assignees).toHaveLength(1)
    expect(res.body.data.assignees[0]).toMatchObject({ userId: memberId })
    expect(res.body.data.labels).toHaveLength(1)
    expect(res.body.data.labels[0]).toMatchObject({ name: 'Bug' })
    taskId = res.body.data.id as string
  })

  it('isolates task lists between boards in the same project', async () => {
    const secondBoard = await request(app.app)
      .post(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Second Board' })
    expect(secondBoard.status).toBe(201)

    const secondColumn = await request(app.app)
      .post(`/api/v1/boards/${secondBoard.body.data.id}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Backlog', color: '#8b5cf6' })
    expect(secondColumn.status).toBe(201)

    const secondTask = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Second board task', columnId: secondColumn.body.data.id })
    expect(secondTask.status).toBe(201)
    expect(secondTask.body.data.boardId).toBe(secondBoard.body.data.id)

    const firstBoardTasks = await request(app.app)
      .get(`/api/v1/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
    const secondBoardTasks = await request(app.app)
      .get(`/api/v1/boards/${secondBoard.body.data.id}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)

    expect(firstBoardTasks.body.data.rows.map((task: { id: string }) => task.id)).toEqual([taskId])
    expect(secondBoardTasks.body.data.rows.map((task: { id: string }) => task.id)).toEqual([
      secondTask.body.data.id,
    ])

    await app.prisma.task.delete({ where: { id: secondTask.body.data.id as string } })
    await app.prisma.board.delete({ where: { id: secondBoard.body.data.id as string } })
  })

  it('creates, lists and completes one-level subtasks with inherited authorization', async () => {
    const created = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Write regression test', priority: 'MEDIUM' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      parentId: taskId,
      projectId,
      boardId: null,
      columnId: null,
      statusId,
    })

    const list = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(1)

    const viewerCreate = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Unauthorized child' })
    expect(viewerCreate.status).toBe(403)

    const nested = await request(app.app)
      .post(`/api/v1/tasks/${created.body.data.id}/subtasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Nested child' })
    expect(nested.status).toBe(400)

    const completed = await request(app.app)
      .patch(`/api/v1/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ isCompleted: true })
    expect(completed.status).toBe(200)

    const parent = await request(app.app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(parent.body.data).toMatchObject({ subtaskCount: 1, completedSubtaskCount: 1 })
  })

  it('manages multiple checklists with ordering, RBAC and nested resource isolation', async () => {
    const firstChecklist = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Release readiness' })
    expect(firstChecklist.status).toBe(201)
    expect(firstChecklist.body.data).toMatchObject({
      taskId,
      title: 'Release readiness',
      position: 0,
      completedItems: 0,
      totalItems: 0,
    })
    const checklistId = firstChecklist.body.data.id as string

    const secondChecklist = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Post-release' })
    expect(secondChecklist.status).toBe(201)
    const secondChecklistId = secondChecklist.body.data.id as string

    const firstItem = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Run regression suite' })
    expect(firstItem.status).toBe(201)
    const firstItemId = firstItem.body.data.items[0].id as string

    const secondItem = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Review deployment logs' })
    expect(secondItem.status).toBe(201)
    const secondItemId = secondItem.body.data.items[1].id as string

    const completed = await request(app.app)
      .patch(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items/${firstItemId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ isCompleted: true })
    expect(completed.status).toBe(200)
    expect(completed.body.data).toMatchObject({ completedItems: 1, totalItems: 2 })

    const moved = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items/${secondItemId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ toPosition: 0 })
    expect(moved.status).toBe(200)
    expect(moved.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      secondItemId,
      firstItemId,
    ])

    const viewerList = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(viewerList.status).toBe(200)
    expect(viewerList.body.data).toHaveLength(2)

    const viewerMutation = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Unauthorized item' })
    expect(viewerMutation.status).toBe(403)

    const otherTask = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Isolation target', columnId })
    expect(otherTask.status).toBe(201)

    const wrongTask = await request(app.app)
      .patch(
        `/api/v1/tasks/${otherTask.body.data.id}/checklists/${checklistId}/items/${firstItemId}`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ isCompleted: false })
    expect(wrongTask.status).toBe(404)

    const deletedItem = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/checklists/${checklistId}/items/${secondItemId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deletedItem.status).toBe(200)
    expect(deletedItem.body.data.items).toHaveLength(1)
    expect(deletedItem.body.data.items[0].position).toBe(0)

    const deletedChecklist = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/checklists/${secondChecklistId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deletedChecklist.status).toBe(200)

    await app.prisma.task.delete({ where: { id: otherTask.body.data.id as string } })
  })

  it('tracks time atomically with manual entries, timers, RBAC and task isolation', async () => {
    const logged = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/time-entries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ durationMinutes: 1, note: 'Regression verification' })
    expect(logged.status).toBe(201)
    expect(logged.body.data).toMatchObject({
      taskId,
      durationSeconds: 60,
      note: 'Regression verification',
      isRunning: false,
    })
    const manualEntryId = logged.body.data.id as string

    const started = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/timer/start`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ note: 'Live review' })
    expect(started.status).toBe(201)
    expect(started.body.data).toMatchObject({ taskId, durationSeconds: 0, isRunning: true })

    const duplicateTimer = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/timer/start`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({})
    expect(duplicateTimer.status).toBe(409)

    const viewerList = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/time-entries?page=1&pageSize=10`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(viewerList.status).toBe(200)
    expect(viewerList.body.data.total).toBe(2)
    expect(viewerList.body.data.rows.some((entry: { isRunning: boolean }) => entry.isRunning)).toBe(
      true,
    )

    const stopped = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/timer/stop`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(stopped.status).toBe(200)
    expect(stopped.body.data.isRunning).toBe(false)
    expect(stopped.body.data.durationSeconds).toBeGreaterThanOrEqual(1)
    const timerEntryId = stopped.body.data.id as string
    const timerDuration = stopped.body.data.durationSeconds as number

    const updated = await request(app.app)
      .patch(`/api/v1/tasks/${taskId}/time-entries/${manualEntryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ durationMinutes: 2, note: 'Expanded regression verification' })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({
      durationSeconds: 120,
      note: 'Expanded regression verification',
    })

    const taskAfterUpdate = await app.prisma.task.findUniqueOrThrow({ where: { id: taskId } })
    expect(taskAfterUpdate.trackedSeconds).toBe(120 + timerDuration)

    const viewerMutation = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/time-entries`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ durationMinutes: 10 })
    expect(viewerMutation.status).toBe(403)

    const otherTask = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Time isolation target', columnId })
    expect(otherTask.status).toBe(201)

    const wrongTask = await request(app.app)
      .patch(`/api/v1/tasks/${otherTask.body.data.id}/time-entries/${manualEntryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ durationMinutes: 3 })
    expect(wrongTask.status).toBe(404)

    const deleteTimer = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/time-entries/${timerEntryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deleteTimer.status).toBe(200)

    const deleteManual = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/time-entries/${manualEntryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deleteManual.status).toBe(200)

    const taskAfterDelete = await app.prisma.task.findUniqueOrThrow({ where: { id: taskId } })
    expect(taskAfterDelete.trackedSeconds).toBe(0)
    await app.prisma.task.delete({ where: { id: otherTask.body.data.id as string } })
  })

  it('stores and serves private attachments with content validation and task isolation', async () => {
    const uploaded = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .attach('attachment', Buffer.from('Release evidence\n'), {
        filename: 'release-notes.txt',
        contentType: 'text/plain',
      })
    expect(uploaded.status).toBe(201)
    expect(uploaded.body.data).toMatchObject({
      taskId,
      originalName: 'release-notes.txt',
      mimeType: 'text/plain',
      sizeBytes: 17,
    })
    expect(uploaded.body.data).not.toHaveProperty('storageKey')
    const attachmentId = uploaded.body.data.id as string

    const viewerList = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(viewerList.status).toBe(200)
    expect(viewerList.body.data).toHaveLength(1)

    const download = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .buffer(true)
    expect(download.status).toBe(200)
    expect(download.headers['cache-control']).toBe('private, no-store')
    expect(download.headers['x-content-type-options']).toBe('nosniff')
    expect(download.headers['content-disposition']).toContain('attachment;')
    expect(download.text).toBe('Release evidence\n')

    const viewerUpload = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .attach('attachment', Buffer.from('Unauthorized'), {
        filename: 'unauthorized.txt',
        contentType: 'text/plain',
      })
    expect(viewerUpload.status).toBe(403)

    const mismatchedExtension = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .attach('attachment', Buffer.from('Not a PDF'), {
        filename: 'malicious.pdf',
        contentType: 'text/plain',
      })
    expect(mismatchedExtension.status).toBe(400)

    const invalidPdf = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .attach('attachment', Buffer.from('MZ executable content'), {
        filename: 'malicious.pdf',
        contentType: 'application/pdf',
      })
    expect(invalidPdf.status).toBe(400)

    const outsiderDownload = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(outsiderDownload.status).toBe(404)

    const otherTask = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Attachment isolation target', columnId })
    expect(otherTask.status).toBe(201)

    const wrongTaskDownload = await request(app.app)
      .get(`/api/v1/tasks/${otherTask.body.data.id}/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(wrongTaskDownload.status).toBe(404)

    const removed = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(removed.status).toBe(200)

    const afterDelete = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(afterDelete.status).toBe(404)
    await app.prisma.task.delete({ where: { id: otherTask.body.data.id as string } })
  })

  it('keeps saved board filters private to their owner and validates their query shape', async () => {
    const created = await request(app.app)
      .post(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({
        name: 'Urgent work',
        filters: { priority: 'URGENT', search: 'login', archived: false },
      })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      boardId,
      name: 'Urgent work',
      filters: { priority: 'URGENT', search: 'login', archived: false },
    })
    const filterId = created.body.data.id as string

    const duplicate = await request(app.app)
      .post(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Urgent work', filters: { archived: false } })
    expect(duplicate.status).toBe(409)

    const unknownField = await request(app.app)
      .post(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Unsafe', filters: { archived: false, sql: 'DROP TABLE tasks' } })
    expect(unknownField.status).toBe(400)

    const viewerList = await request(app.app)
      .get(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(viewerList.status).toBe(200)
    expect(viewerList.body.data).toHaveLength(1)

    const ownerList = await request(app.app)
      .get(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(ownerList.status).toBe(200)
    expect(ownerList.body.data).toHaveLength(0)

    const ownerDelete = await request(app.app)
      .delete(`/api/v1/boards/${boardId}/saved-filters/${filterId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(ownerDelete.status).toBe(404)

    const updated = await request(app.app)
      .patch(`/api/v1/boards/${boardId}/saved-filters/${filterId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'High-priority work', filters: { priority: 'HIGH', archived: false } })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({
      name: 'High-priority work',
      filters: { priority: 'HIGH', archived: false },
    })

    const outsiderList = await request(app.app)
      .get(`/api/v1/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(outsiderList.status).toBe(404)

    const removed = await request(app.app)
      .delete(`/api/v1/boards/${boardId}/saved-filters/${filterId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(removed.status).toBe(200)
  })

  it('denies task creation to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('rejects a foreign-org status on create', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Bad status', statusId: foreignStatusId })
    expect(res.status).toBe(400)
  })

  it('rejects a foreign-org label on create', async () => {
    const foreignLabel = await app.prisma.label.create({
      data: { orgId: foreignOrgId, name: 'Foreign Label', color: '#000000' },
    })
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Bad label', labelIds: [foreignLabel.id] })
    expect(res.status).toBe(400)
  })

  it('lists tasks with filters (task.view)', async () => {
    const all = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(all.status).toBe(200)
    expect(all.body.data.total).toBe(1)

    const byPriority = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks?priority=HIGH`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(byPriority.status).toBe(200)
    expect(byPriority.body.data.total).toBe(1)

    const bySearch = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks?search=login`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(bySearch.status).toBe(200)
    expect(bySearch.body.data.total).toBe(1)

    const byAssignee = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks?assigneeId=${memberId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(byAssignee.status).toBe(200)
    expect(byAssignee.body.data.total).toBe(1)

    const byStatus = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks?statusId=${statusId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(byStatus.status).toBe(200)
    expect(byStatus.body.data.total).toBe(1)
  })

  it('lists tasks per board', async () => {
    const res = await request(app.app)
      .get(`/api/v1/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  it('hides the task from outsiders', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(404)
  })

  it('updates a task (task.update)', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Fix login bug ASAP', priority: 'URGENT', isCompleted: true })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      title: 'Fix login bug ASAP',
      priority: 'URGENT',
      isCompleted: true,
    })
    expect(res.body.data.completedAt).toBeTruthy()
  })

  it('denies task updates to viewers', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('moves a task to another column (task.move)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ columnId: column2Id })
    expect(res.status).toBe(200)

    const task = await app.prisma.task.findUniqueOrThrow({ where: { id: taskId } })
    expect(task.columnId).toBe(column2Id)
    expect(task.position).toBe(0)
  })

  it('denies a move to a column of another project', async () => {
    const otherProject = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Other Project', key: 'OTH' })
    expect(otherProject.status).toBe(201)
    const otherBoard = await request(app.app)
      .post(`/api/v1/projects/${otherProject.body.data.id}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Other Board' })
    expect(otherBoard.status).toBe(201)
    const otherColumn = await request(app.app)
      .post(`/api/v1/boards/${otherBoard.body.data.id}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Other Col' })
    expect(otherColumn.status).toBe(201)

    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ columnId: otherColumn.body.data.id })
    expect(res.status).toBe(400)
  })

  it('denies task moves to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ columnId: column2Id })
    expect(res.status).toBe(403)
  })

  it('adds and removes an assignee (task.assign)', async () => {
    const added = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/assignees/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(added.status).toBe(200)

    const task = await app.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { assignees: true },
    })
    expect(task.assignees).toHaveLength(1)

    const removed = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/assignees/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(removed.status).toBe(200)
    expect(removed.body.data.assignees).toHaveLength(0)
  })

  it('rejects assigning a non-member', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/assignees/${outsiderId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(400)
  })

  it('denies assignee changes to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/assignees/${memberId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(403)
  })

  it('adds and removes a label (task.update)', async () => {
    const added = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/labels/${labelId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(added.status).toBe(200)
    expect(added.body.data.labels).toHaveLength(1)

    const removed = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}/labels/${labelId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(removed.status).toBe(200)
    expect(removed.body.data.labels).toHaveLength(0)
  })

  it('records task activity', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/activity`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    const actions = res.body.data.map((row: { action: string }) => row.action)
    expect(actions).toContain('task.created')
    expect(actions).toContain('task.updated')
    expect(actions).toContain('task.moved')
  })

  it('archives and restores a task (task.update)', async () => {
    const archived = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(archived.status).toBe(200)
    expect(archived.body.data.isArchived).toBe(true)

    const filtered = await request(app.app)
      .get(`/api/v1/projects/${projectId}/tasks?archived=true`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(filtered.status).toBe(200)
    expect(filtered.body.data.total).toBe(1)

    const restored = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/unarchive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(restored.status).toBe(200)
    expect(restored.body.data.isArchived).toBe(false)
  })

  it('deletes a task and hides it (task.delete)', async () => {
    const deleted = await request(app.app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(deleted.status).toBe(200)
    expect(deleted.body.data.deleted).toBe(true)

    const audit = await app.prisma.auditLog.findFirst({
      where: { action: 'task.deleted', resourceId: taskId },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).toMatchObject({ orgId: expect.any(String), actorId: expect.any(String) })

    const get = await request(app.app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(get.status).toBe(404)
  })

  it('deletes a label (task.update)', async () => {
    const res = await request(app.app)
      .delete(`/api/v1/labels/${labelId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(200)

    const gone = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/labels`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(gone.status).toBe(200)
    expect(gone.body.data).toHaveLength(0)
  })
})
