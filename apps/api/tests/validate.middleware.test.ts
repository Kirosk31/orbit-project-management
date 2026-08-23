import express, { Router } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { registerSchema } from '@orbit/shared'
import { createErrorHandler, validateBody } from '../src/shared/http/index.js'
import { createLogger } from '../src/core/logger/logger.js'
import { requestIdMiddleware } from '../src/shared/http/index.js'

function buildValidateApp(): express.Express {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  const router = Router()

  router.post('/test', validateBody(registerSchema), (req, res) => {
    res.json({ data: req.body })
  })

  app.use(router)
  app.use(createErrorHandler(createLogger({ level: 'silent', isProduction: false })))
  return app
}

describe('validateBody middleware', () => {
  it('passes valid payloads through', async () => {
    const res = await request(buildValidateApp()).post('/test').send({
      email: 'ada@lovelace.dev',
      password: 'StrongPass1',
      fullName: 'Ada Lovelace',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.fullName).toBe('Ada Lovelace')
  })

  it('returns a validation error envelope for invalid payloads', async () => {
    const res = await request(buildValidateApp()).post('/test').send({
      email: 'not-an-email',
      password: 'short',
      fullName: '',
    })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details.issues.length).toBeGreaterThan(0)
  })

  it('returns a bad request for malformed JSON', async () => {
    const res = await request(buildValidateApp())
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('{"broken": ')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })
})
