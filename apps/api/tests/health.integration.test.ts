import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { buildTestApp, testAgent } from './testApp.js'

describe('health endpoints', () => {
  it('reports liveness', async () => {
    const res = await testAgent().get('/health')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0)
    expect(res.body.data.startedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(res.body.requestId).toBeDefined()
  })

  it('reports ready when all dependencies are reachable', async () => {
    const res = await testAgent().get('/health/ready')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.checks).toEqual({ database: 'ok', redis: 'ok' })
  })

  it('reports degraded when a dependency is down', async () => {
    const res = await testAgent({ databaseUp: false }).get('/health/ready')

    expect(res.status).toBe(503)
    expect(res.body.data.status).toBe('degraded')
    expect(res.body.data.checks.database).toBe('error')
    expect(res.body.data.checks.redis).toBe('ok')
  })
})

describe('request id propagation', () => {
  it('generates a request id and echoes it in the response header', async () => {
    const res = await testAgent().get('/health')

    expect(res.headers['x-request-id']).toBeDefined()
    expect(res.body.requestId).toBe(res.headers['x-request-id'])
  })

  it('honors an incoming request id when it is well formed', async () => {
    const res = await testAgent().get('/health').set('X-Request-Id', 'req-12345678')

    expect(res.headers['x-request-id']).toBe('req-12345678')
  })
})

describe('unknown routes', () => {
  it('returns a 404 envelope', async () => {
    const res = await testAgent().get('/api/v1/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toContain('does-not-exist')
  })
})

describe('csrf protection', () => {
  it('issues a csrf token via GET /api/v1/auth/csrf', async () => {
    const res = await testAgent().get('/api/v1/auth/csrf')

    expect(res.status).toBe(200)
    expect(res.body.data.csrfToken).toBeDefined()
    expect(res.headers['set-cookie']?.[0]).toContain('orbit_csrf')
  })

  it('rejects unsafe requests without a valid csrf token', async () => {
    const res = await testAgent().post('/api/v1/something').send({})

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('accepts unsafe requests carrying a matching csrf token', async () => {
    const agent = request.agent(buildTestApp().app)
    const csrf = await agent.get('/api/v1/auth/csrf')
    const token = csrf.body.data.csrfToken

    const res = await agent.post('/api/v1/does-not-exist').set('X-CSRF-Token', token).send({})

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
