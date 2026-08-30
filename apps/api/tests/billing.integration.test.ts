import request from 'supertest'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@orbit/shared'
import { Prisma, type PrismaClient } from '@prisma/client'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

const TEST_EMAILS = ['billing-owner@orbit.app', 'billing-outsider@orbit.app']

const TEST_ROLE_KEYS = new Map<string, string[]>([
  ['OWNER', [...PERMISSIONS]],
  ['ADMIN', PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles')],
  ['VIEWER', ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view']],
])

const DEFAULT_PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    priceUSD: new Prisma.Decimal(0),
    currency: 'USD',
    maxMembers: 5,
    maxProjects: 1,
    maxStorageBytes: BigInt(1_073_741_824),
    isDefault: true,
  },
  {
    key: 'STARTUP',
    name: 'Startup',
    priceUSD: new Prisma.Decimal(29),
    currency: 'USD',
    maxMembers: 10,
    maxProjects: 10,
    maxStorageBytes: BigInt(5_368_709_120),
  },
  {
    key: 'TEAM',
    name: 'Team',
    priceUSD: new Prisma.Decimal(79),
    currency: 'USD',
    maxMembers: 25,
    maxProjects: 50,
    maxStorageBytes: BigInt(21_474_836_480),
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    priceUSD: new Prisma.Decimal(199),
    currency: 'USD',
    maxMembers: 100,
    maxProjects: 500,
    maxStorageBytes: BigInt(107_374_182_400),
    customRoles: true,
    whiteLabel: true,
    webhooks: true,
    publicShare: true,
    auditExport: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    priceUSD: new Prisma.Decimal(0),
    currency: 'USD',
    maxMembers: 1000,
    maxProjects: 5000,
    maxStorageBytes: BigInt(1_073_741_824_000),
    customRoles: true,
    whiteLabel: true,
    webhooks: true,
    publicShare: true,
    sso: true,
    auditExport: true,
  },
]

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

async function seedBillingPlans(prisma: PrismaClient): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await prisma.billingPlan.upsert({
      where: { key: plan.key },
      update: plan,
      create: plan,
    })
  }
}

const dbAvailable = await isTestDatabaseAvailable()
const describeDb = dbAvailable ? describe : describe.skip

describeDb('billing API', () => {
  let app: BuiltTestApp
  let ownerToken: string
  let outsiderToken: string
  let orgSlug: string

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
    await seedBillingPlans(app.prisma)

    const owner = await register(TEST_EMAILS[0]!, 'Billing Owner')
    const outsider = await register(TEST_EMAILS[1]!, 'Billing Outsider')
    ownerToken = owner.token
    outsiderToken = outsider.token

    const orgRes = await request(app.app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ name: 'Billing Test Workspace' })
    expect(orgRes.status).toBe(201)
    orgSlug = orgRes.body.data.slug as string
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('lists plans publicly', async () => {
    const res = await request(app.app).get('/api/v1/billing/plans')
    expect(res.status).toBe(200)
    expect(res.body.data.rows).toHaveLength(5)
    expect(res.body.data.rows[0]).toMatchObject({ key: 'FREE', isDefault: true })
  })

  it('returns the default subscription without an active plan', async () => {
    const res = await request(app.app)
      .get(`/api/v1/organizations/${orgSlug}/billing`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ planKey: 'FREE', status: 'ACTIVE', usedSeats: 1 })
  })

  it('requires authentication', async () => {
    const res = await request(app.app).get(`/api/v1/organizations/${orgSlug}/billing`)
    expect(res.status).toBe(401)
  })

  it.each([
    ['post', 'activate'],
    ['patch', 'plan'],
    ['post', 'cancel'],
  ] as const)(
    'does not expose manual subscription mutation through %s /%s',
    async (method, path) => {
      const res = await request(app.app)
        [method](`/api/v1/organizations/${orgSlug}/billing/${path}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set(await csrfHeaders())
        .send({ planKey: 'ENTERPRISE', trialDays: 30 })
      expect(res.status).toBe(404)
    },
  )

  it('rejects checkout when no payment provider is configured', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/billing/checkout`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set(await csrfHeaders())
      .send({ planKey: 'STARTUP' })
    expect(res.status).toBe(400)
  })

  it('blocks a non-member from managing billing', async () => {
    const res = await request(app.app)
      .post(`/api/v1/organizations/${orgSlug}/billing/checkout`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set(await csrfHeaders())
      .send({ planKey: 'BUSINESS' })
    expect(res.status).toBe(404)
  })
})
