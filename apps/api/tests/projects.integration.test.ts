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
  'projects-owner@orbit.app',
  'projects-member@orbit.app',
  'projects-viewer@orbit.app',
  'projects-outsider@orbit.app',
]
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

describeDb('projects API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let memberToken: string
  let viewerToken: string
  let outsiderToken: string
  let memberUserId: string
  let viewerUserId: string
  let outsiderUserId: string
  let orgSlug: string
  let projectId: string
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

    const owner = await register(TEST_EMAILS[0]!, 'Project Owner')
    const member = await register(TEST_EMAILS[1]!, 'Project Member')
    const viewer = await register(TEST_EMAILS[2]!, 'Project Viewer')
    const outsider = await register(TEST_EMAILS[3]!, 'Project Outsider')
    ownerToken = owner.token
    memberToken = member.token
    viewerToken = viewer.token
    outsiderToken = outsider.token
    memberUserId = member.userId
    viewerUserId = viewer.userId
    outsiderUserId = outsider.userId

    viewerRoleId = (
      await app.prisma.role.findFirstOrThrow({ where: { orgId: null, key: 'VIEWER' } })
    ).id

    const createOrg = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Projects Workspace' })
    expect(createOrg.status).toBe(201)
    orgSlug = createOrg.body.data.slug as string

    await inviteAndAccept(ownerToken, TEST_EMAILS[1]!, memberToken)
    await inviteAndAccept(ownerToken, TEST_EMAILS[2]!, viewerToken)
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('creates a project and adds the creator as a member', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({
        name: 'Orbit Web',
        key: 'WEB',
        description: 'Main web app',
        color: '#6366f1',
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      name: 'Orbit Web',
      key: 'WEB',
      description: 'Main web app',
      color: '#6366f1',
      isArchived: false,
      isFavorite: true,
      memberCount: 1,
    })
    projectId = res.body.data.id as string
  })

  it('rejects a duplicate project key', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Duplicate', key: 'WEB' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('validates project input', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: '', key: 'x!', color: 'blue' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('lists projects for org members, filtering archived', async () => {
    const res = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${memberToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ key: 'WEB', isFavorite: false })

    const archived = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/projects?archived=true`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(archived.status).toBe(200)
    expect(archived.body.data).toHaveLength(0)
  })

  it('allows viewers to view but not create projects', async () => {
    const create = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Nope', key: 'NOPE' })
    expect(create.status).toBe(403)

    const list = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(1)
  })

  it('hides the org from outsiders', async () => {
    const res = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(404)
  })

  it('hides projects from org non-members', async () => {
    const res = await request(app.app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(404)
  })

  it('gets a project by id', async () => {
    const res = await request(app.app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: projectId, key: 'WEB', memberCount: 1 })
  })

  it('updates a project (project.update)', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Orbit Web App', color: '#0ea5e9' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ name: 'Orbit Web App', color: '#0ea5e9' })
  })

  it('denies project.update to viewers', async () => {
    const res = await request(app.app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('toggles favorites per user', async () => {
    const favorite = await request(app.app)
      .post(`/api/v1/projects/${projectId}/favorite`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
    expect(favorite.status).toBe(200)

    const res = await request(app.app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(res.body.data.isFavorite).toBe(true)

    await request(app.app)
      .delete(`/api/v1/projects/${projectId}/favorite`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set(await csrfHeaders())
      .expect(200)

    const after = await request(app.app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(after.body.data.isFavorite).toBe(false)
  })

  it('adds and removes project members (org members only)', async () => {
    const added = await request(app.app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ userId: memberUserId })
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ userId: memberUserId })

    const duplicate = await request(app.app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ userId: memberUserId })
    expect(duplicate.status).toBe(409)

    const outsider = await request(app.app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ userId: outsiderUserId })
    expect(outsider.status).toBe(400)

    const list = await request(app.app)
      .get(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(2)

    await request(app.app)
      .delete(`/api/v1/projects/${projectId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .expect(200)

    const after = await request(app.app)
      .get(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(after.body.data).toHaveLength(1)
  })

  it('denies member management to viewers', async () => {
    const res = await request(app.app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
      .send({ userId: viewerUserId })
    expect(res.status).toBe(403)
  })

  it('records activity for project changes', async () => {
    const res = await request(app.app)
      .get(`/api/v1/projects/${projectId}/activity`)
      .set('Authorization', `Bearer ${memberToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    const actions = res.body.data.map((row: { action: string }) => row.action)
    expect(actions).toContain('project.created')
    expect(actions).toContain('project.updated')
    expect(actions).toContain('project.member_added')
    expect(actions).toContain('project.member_removed')
    expect(res.body.data[0]).toHaveProperty('actorName')
    expect(res.body.data[0]).toHaveProperty('createdAt')
  })

  it('archives and restores a project (project.archive)', async () => {
    const archived = await request(app.app)
      .post(`/api/v1/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
    expect(archived.status).toBe(200)
    expect(archived.body.data.isArchived).toBe(true)

    const onlyArchived = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/projects?archived=true`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(onlyArchived.body.data).toHaveLength(1)

    const viewerArchive = await request(app.app)
      .post(`/api/v1/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(viewerArchive.status).toBe(403)

    await request(app.app)
      .post(`/api/v1/projects/${projectId}/unarchive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .expect(200)
  })

  it('soft-deletes a project (project.delete)', async () => {
    const create = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Doomed', key: 'DOOM' })
    expect(create.status).toBe(201)
    const doomedId = create.body.data.id as string

    const viewerDelete = await request(app.app)
      .delete(`/api/v1/projects/${doomedId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set(await csrfHeaders())
    expect(viewerDelete.status).toBe(403)

    await request(app.app)
      .delete(`/api/v1/projects/${doomedId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .expect(200)

    const gone = await request(app.app)
      .get(`/api/v1/projects/${doomedId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(gone.status).toBe(404)

    const createAgain = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Doomed', key: 'DOOM' })
    expect(createAgain.status).toBe(409)
  })
})
