import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../src/core/logger/logger.js'
import { createRumRouter, RUM_PATH } from '../src/modules/rum/rum.routes.js'
import { createErrorHandler } from '../src/shared/http/index.js'
import { RateLimitExceededError } from '../src/shared/ratelimit/rateLimit.js'
import { testAgent } from './testApp.js'

const report = {
  route: '/app/boards/6f1c2a7e-0b8d-4c3e-9a51-2f7d8e9c1b04',
  metrics: [
    { name: 'LCP', value: 1820.5, rating: 'good', navigationType: 'navigate' },
    { name: 'INP', value: 96, rating: 'good' },
  ],
}

function buildRumApp(consume: () => Promise<void> = async () => undefined) {
  const info = vi.fn()
  const logger = { child: () => ({ info }), error: vi.fn() } as unknown as Logger
  const app = express()
  app.use(
    RUM_PATH,
    createRumRouter({
      logger,
      rateLimiterService: { consume: vi.fn(consume) },
      rateLimit: { max: 60, windowSeconds: 60 },
    }),
  )
  app.use(createErrorHandler(logger))
  return { app, info }
}

describe('RUM intake', () => {
  it('logs the normalized route and metrics, and nothing about the visitor', async () => {
    const { app, info } = buildRumApp()

    const res = await request(app)
      .post(RUM_PATH)
      .set('User-Agent', 'Mozilla/5.0 test')
      .set('X-Forwarded-For', '203.0.113.9')
      .send(report)

    expect(res.status).toBe(204)
    expect(info).toHaveBeenCalledTimes(1)
    const [fields, message] = info.mock.calls[0] as [Record<string, unknown>, string]
    expect(message).toBe('web vitals')
    expect(fields).toEqual({ route: '/app/boards/:id', metrics: report.metrics })
    expect(JSON.stringify(fields)).not.toMatch(/Mozilla|203\.0\.113|6f1c2a7e/)
  })

  it('rejects malformed reports without logging them', async () => {
    const { app, info } = buildRumApp()

    const res = await request(app)
      .post(RUM_PATH)
      .send({ ...report, email: 'someone@example.com' })

    expect(res.status).toBe(400)
    expect(info).not.toHaveBeenCalled()
  })

  it('rejects bodies over 4 KB', async () => {
    const { app } = buildRumApp()

    const res = await request(app)
      .post(RUM_PATH)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...report, route: 'x'.repeat(5_000) }))

    expect(res.status).toBe(413)
  })

  it('is rate limited', async () => {
    const { app, info } = buildRumApp(async () => {
      throw new RateLimitExceededError(30)
    })

    const res = await request(app).post(RUM_PATH).send(report)

    expect(res.status).toBe(429)
    expect(res.headers['retry-after']).toBe('30')
    expect(info).not.toHaveBeenCalled()
  })
})

describe('RUM intake in the full app', () => {
  it('accepts a beacon without a CSRF token, as sendBeacon cannot send one', async () => {
    const res = await testAgent().post('/api/v1/rum').send(report)

    expect(res.status).toBe(204)
  })

  it('still requires a CSRF token everywhere else', async () => {
    const res = await testAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'someone@example.com', password: 'not-the-password' })

    expect(res.status).toBe(403)
  })
})
