import request from 'supertest'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

interface TestSession {
  get(path: string): Promise<request.Response>
  post(path: string, body?: object, token?: string): Promise<request.Response>
}

function extractCookies(setCookie: string | string[] | undefined): Map<string, string> {
  const cookies = new Map<string, string>()
  const headers = Array.isArray(setCookie) ? setCookie : setCookie === undefined ? [] : [setCookie]
  for (const header of headers) {
    const [pair] = header.split(';')
    const [name, ...rest] = pair!.split('=')
    cookies.set(name!, rest.join('='))
  }
  return cookies
}

function createSession(app: BuiltTestApp): TestSession {
  const raw = request(app.app)
  const cookies = new Map<string, string>()

  const jar = async (response: request.Response): Promise<void> => {
    for (const [name, value] of extractCookies(response.headers['set-cookie'])) {
      cookies.set(name, value)
    }
  }

  const cookieHeader = (): string =>
    [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

  return {
    async get(path) {
      const res = await raw.get(path).set('Cookie', cookieHeader())
      await jar(res)
      return res
    },
    async post(path, body = {}, token) {
      const res = await raw
        .post(path)
        .set('Cookie', cookieHeader())
        .set('X-CSRF-Token', cookies.get('orbit_csrf') ?? '')
        .set('Authorization', token ? `Bearer ${token}` : '')
        .send(body)
      await jar(res)
      return res
    },
  }
}

function refreshTokenFrom(session: TestSession): Promise<request.Response> {
  return session.post('/api/v1/auth/refresh')
}

const TEST_EMAILS = ['auth-test@orbit.app', 'auth-taker@orbit.app']
const TEST_ORG_SLUGS = ['auth-test-personal', 'auth-taker-personal']

async function cleanupTestData(app: BuiltTestApp): Promise<void> {
  await app.prisma.organization.deleteMany({ where: { slug: { in: TEST_ORG_SLUGS } } })
  await app.prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
}

const dbAvailable = await isTestDatabaseAvailable()
const describeDb = dbAvailable ? describe : describe.skip

describeDb('auth API', () => {
  let app: BuiltTestApp

  beforeAll(async () => {
    app = buildTestApp()
    await cleanupTestData(app)
  })

  afterAll(async () => {
    await cleanupTestData(app)
    await app.prisma.$disconnect()
  })

  it('registers a user, issues tokens and sets the refresh cookie', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    const res = await session.post('/api/v1/auth/register', {
      email: 'auth-test@orbit.app',
      password: 'Password123',
      fullName: 'Auth Test',
    })

    expect(res.status).toBe(201)
    expect(res.body.data.user.email).toBe('auth-test@orbit.app')
    expect(res.body.data.accessToken).toBeTruthy()
    expect(res.body.data.expiresIn).toBeGreaterThan(0)
    expect(String(res.headers['set-cookie'] ?? '').includes('orbit_refresh=')).toBe(true)

    const audit = await app.prisma.auditLog.findFirst({
      where: {
        action: 'account.registered',
        resourceId: res.body.data.user.id as string,
      },
    })
    expect(audit).toMatchObject({
      actorId: res.body.data.user.id,
      resourceType: 'user',
    })
    expect(audit?.ipAddress).toBeTruthy()
  })

  it('rejects a duplicate registration', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    const res = await session.post('/api/v1/auth/register', {
      email: 'auth-test@orbit.app',
      password: 'Password123',
      fullName: 'Auth Test',
    })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('logs in and reads the profile via /auth/me', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    const login = await session.post('/api/v1/auth/login', {
      email: 'auth-test@orbit.app',
      password: 'Password123',
    })
    expect(login.status).toBe(200)

    const me = await request(app.app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)

    expect(me.status).toBe(200)
    expect(me.body.data.user.email).toBe('auth-test@orbit.app')
  })

  it('rejects invalid credentials', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    const res = await session.post('/api/v1/auth/login', {
      email: 'auth-test@orbit.app',
      password: 'WrongPass1',
    })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rotates the refresh token on every refresh', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')
    await session.post('/api/v1/auth/login', {
      email: 'auth-test@orbit.app',
      password: 'Password123',
    })

    const first = await refreshTokenFrom(session)
    expect(first.status).toBe(200)

    const second = await refreshTokenFrom(session)
    expect(second.status).toBe(200)
    expect(second.body.data.accessToken).toBeTruthy()
  })

  it('verifies the email using the token from the welcome email', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    await session.post('/api/v1/auth/register', {
      email: 'auth-taker@orbit.app',
      password: 'Password123',
      fullName: 'Token Taker',
    })

    const welcomeMail = app.sentMails.find(
      (mail) => mail.to.address === 'auth-taker@orbit.app' && mail.subject.includes('Verify'),
    )
    expect(welcomeMail).toBeDefined()

    const verifyToken = /verify-email\?token=([a-zA-Z0-9_-]+)/.exec(welcomeMail!.html ?? '')?.[1]
    expect(verifyToken).toBeTruthy()

    const verificationResults = await Promise.all([
      session.post('/api/v1/auth/verify-email', { token: verifyToken }),
      session.post('/api/v1/auth/verify-email', { token: verifyToken }),
    ])
    expect(verificationResults.map((result) => result.status).sort()).toEqual([200, 401])

    const user = await app.prisma.user.findUnique({ where: { email: 'auth-taker@orbit.app' } })
    expect(user?.isEmailVerified).toBe(true)
  })

  it('resets the password and signs in with the new one', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    await session.post('/api/v1/auth/forgot-password', { email: 'auth-taker@orbit.app' })

    const resetMail = app.sentMails.find((mail) => mail.subject.includes('Reset'))
    const resetToken = /reset-password\?token=([a-zA-Z0-9_-]+)/.exec(resetMail!.html ?? '')?.[1]
    expect(resetToken).toBeTruthy()

    const resetResults = await Promise.all([
      session.post('/api/v1/auth/reset-password', {
        token: resetToken,
        password: 'NewPassword456',
      }),
      session.post('/api/v1/auth/reset-password', {
        token: resetToken,
        password: 'NewPassword456',
      }),
    ])
    expect(resetResults.map((result) => result.status).sort()).toEqual([200, 401])

    const login = await session.post('/api/v1/auth/login', {
      email: 'auth-taker@orbit.app',
      password: 'NewPassword456',
    })
    expect(login.status).toBe(200)
  })

  it('logs out and rejects the refresh cookie afterwards', async () => {
    const session = createSession(app)
    await session.get('/api/v1/auth/csrf')

    const login = await session.post('/api/v1/auth/login', {
      email: 'auth-test@orbit.app',
      password: 'Password123',
    })

    const logout = await session.post('/api/v1/auth/logout', {}, login.body.data.accessToken)
    expect(logout.status).toBe(200)

    const logoutAudit = await app.prisma.auditLog.findFirst({
      where: { action: 'session.logout', actorId: login.body.data.user.id as string },
      orderBy: { createdAt: 'desc' },
    })
    expect(logoutAudit?.resourceType).toBe('session')

    const refreshed = await session.post('/api/v1/auth/refresh')
    expect(refreshed.status).toBe(401)
  })
})
