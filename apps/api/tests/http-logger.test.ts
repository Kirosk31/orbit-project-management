import { Writable } from 'node:stream'
import express from 'express'
import { pino } from 'pino'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  createHttpLogger,
  requestLogLevel,
  SLOW_REQUEST_MS,
} from '../src/core/logger/http-logger.js'

function captureLogs() {
  const lines: Array<{ level: number; msg: string; responseTime?: number; req?: { url: string } }> =
    []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)))
      done()
    },
  })
  return { logger: pino({ level: 'info' }, stream), lines }
}

const INFO = 30
const WARN = 40

describe('requestLogLevel', () => {
  const base = { statusCode: 200, responseTimeMs: 20, failed: false, isRumBeacon: false }

  it('logs ordinary requests at info and slow ones at warn', () => {
    expect(requestLogLevel(base)).toBe('info')
    expect(requestLogLevel({ ...base, responseTimeMs: SLOW_REQUEST_MS })).toBe('info')
    expect(requestLogLevel({ ...base, responseTimeMs: SLOW_REQUEST_MS + 1 })).toBe('warn')
    expect(requestLogLevel({ ...base, statusCode: 500, responseTimeMs: 900 })).toBe('warn')
  })

  it('skips accepted Web Vitals beacons but keeps rejected or slow ones', () => {
    expect(requestLogLevel({ ...base, statusCode: 204, isRumBeacon: true })).toBe('silent')
    expect(requestLogLevel({ ...base, statusCode: 429, isRumBeacon: true })).toBe('info')
    expect(requestLogLevel({ ...base, isRumBeacon: true, responseTimeMs: 800 })).toBe('warn')
  })
})

describe('createHttpLogger', () => {
  it('writes a warn line with the response time for a request over 500 ms', async () => {
    const { logger, lines } = captureLogs()
    const app = express()
    app.use(createHttpLogger(logger, '/api/v1/rum'))
    app.get('/fast', (_req, res) => {
      res.json({ ok: true })
    })
    app.get('/slow', (_req, res) => {
      setTimeout(() => res.json({ ok: true }), SLOW_REQUEST_MS + 50)
    })
    app.post('/api/v1/rum', (_req, res) => {
      res.status(204).end()
    })

    await request(app).get('/fast')
    await request(app).get('/slow')
    await request(app).post('/api/v1/rum')

    const byUrl = (url: string) => lines.filter((line) => line.req?.url === url)
    expect(byUrl('/fast').map((line) => line.level)).toEqual([INFO])
    const [slow] = byUrl('/slow')
    expect(slow?.level).toBe(WARN)
    expect(slow?.responseTime).toBeGreaterThan(SLOW_REQUEST_MS)
    expect(byUrl('/api/v1/rum')).toEqual([])
  })
})
