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
  'comments-owner@orbit.app',
  'comments-member@orbit.app',
  'comments-viewer@orbit.app',
  'comments-outsider@orbit.app',
]
const TEST_ROLE_KEYS = new Map<string, string[]>([
  ['OWNER', [...PERMISSIONS]],
  ['ADMIN', PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles')],
  ['VIEWER', ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view']],
])

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.comment.deleteMany({
    where: { task: { project: { org: { owner: { email: { in: TEST_EMAILS } } } } } },
  })
  await app.prisma.task.deleteMany({
    where: { project: { org: { owner: { email: { in: TEST_EMAILS } } } } },
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

describeDb('comments API', () => {
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
  let taskId: string
  let memberId: string
  let outsiderId: string
  let commentId: string
  let replyId: string

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

    const owner = await register(TEST_EMAILS[0]!, 'Comment Owner')
    const member = await register(TEST_EMAILS[1]!, 'Comment Member')
    const viewer = await register(TEST_EMAILS[2]!, 'Comment Viewer')
    const outsider = await register(TEST_EMAILS[3]!, 'Comment Outsider')
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
      .send({ name: 'Comments Workspace' })
    expect(createOrg.status).toBe(201)
    orgSlug = createOrg.body.data.slug as string

    await inviteAndAccept(ownerToken, TEST_EMAILS[1]!, memberToken, memberRoleId)
    await inviteAndAccept(ownerToken, TEST_EMAILS[2]!, viewerToken, viewerRoleId)

    const createProject = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Comment Project', key: 'CMT' })
    expect(createProject.status).toBe(201)
    projectId = createProject.body.data.id as string

    const createBoard = await request(app.app)
      .post(`/api/v1/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Comment Board' })
    expect(createBoard.status).toBe(201)
    boardId = createBoard.body.data.id as string

    const col = await request(app.app)
      .post(`/api/v1/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'To Do' })
    expect(col.status).toBe(201)
    columnId = col.body.data.id as string

    const task = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Discuss this', columnId })
    expect(task.status).toBe(201)
    taskId = task.body.data.id as string
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('creates a comment with mentions (task.comment)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Hello @Comment Member, please review this', mentionIds: [memberId] })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      taskId,
      body: 'Hello @Comment Member, please review this',
      parentId: null,
      replyCount: 0,
      isEdited: false,
    })
    expect(res.body.data.author).toMatchObject({ fullName: 'Comment Owner' })
    expect(res.body.data.mentions).toHaveLength(1)
    expect(res.body.data.mentions[0]).toMatchObject({ userId: memberId })
    expect(res.body.data.reactions).toEqual([])
    commentId = res.body.data.id as string
  })

  it('allows viewers to comment (task.comment)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Viewer says hi' })
    expect(res.status).toBe(201)
  })

  it('rejects mentioning a non-member', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Spam', mentionIds: [outsiderId] })
    expect(res.status).toBe(400)
  })

  it('hides comments from outsiders', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(404)
  })

  it('lists comments (task.view)', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(2)
    expect(res.body.data.rows[0]).toMatchObject({
      body: 'Hello @Comment Member, please review this',
    })
  })

  it('creates a reply to a comment', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Will do', parentId: commentId })

    expect(res.status).toBe(201)
    expect(res.body.data.parentId).toBe(commentId)
    replyId = res.body.data.id as string
  })

  it('rejects a reply to a reply (max depth 1)', async () => {
    const res = await request(app.app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Deep nesting', parentId: replyId })
    expect(res.status).toBe(400)
  })

  it('rejects a reply to a comment of another task', async () => {
    const otherTask = await request(app.app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ title: 'Other task', columnId })
    expect(otherTask.status).toBe(201)

    const res = await request(app.app)
      .post(`/api/v1/tasks/${otherTask.body.data.id}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Wrong parent', parentId: commentId })
    expect(res.status).toBe(400)
  })

  it('counts replies on the parent comment', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    const parent = res.body.data.rows.find((row: { id: string }) => row.id === commentId)
    expect(parent).toMatchObject({ replyCount: 1 })
  })

  it('denies editing another authors comment', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Hijacked' })
    expect(res.status).toBe(403)
  })

  it('edits own comment (author only)', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ body: 'Edited version' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ body: 'Edited version', isEdited: true })
  })

  it('toggles a reaction and reports the count', async () => {
    const added = await request(app.app)
      .post(`/api/v1/comments/${commentId}/reactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ emoji: '👍' })
    expect(added.status).toBe(200)
    expect(added.body.data).toMatchObject({ reacted: true, count: 1, emoji: '👍' })

    const memberReacted = await request(app.app)
      .post(`/api/v1/comments/${commentId}/reactions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ emoji: '👍' })
    expect(memberReacted.status).toBe(200)
    expect(memberReacted.body.data).toMatchObject({ reacted: true, count: 2 })

    const removed = await request(app.app)
      .post(`/api/v1/comments/${commentId}/reactions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .send({ emoji: '👍' })
    expect(removed.status).toBe(200)
    expect(removed.body.data).toMatchObject({ reacted: false, count: 1 })

    const list = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${memberToken}`)
    const parent = list.body.data.rows.find((row: { id: string }) => row.id === commentId)
    expect(parent.reactions).toEqual([{ emoji: '👍', count: 1, reactedByMe: false }])
  })

  it('denies deletion of another authors comment to a viewer', async () => {
    const res = await request(app.app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(403)
  })

  it('deletes own comment', async () => {
    const res = await request(app.app)
      .delete(`/api/v1/comments/${replyId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)

    const list = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(list.body.data.total).toBe(2)
    expect(list.body.data.rows).not.toContainEqual(expect.objectContaining({ id: replyId }))
  })

  it('hides deleted comments from listing', async () => {
    const res = await request(app.app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    for (const row of res.body.data.rows as Array<{ id: string }>) {
      expect(row.id).not.toBe(replyId)
    }
  })
})
