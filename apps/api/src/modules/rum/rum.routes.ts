import express, { Router } from 'express'
import { rumReportSchema } from '@orbit/shared'
import type { z } from 'zod'
import type { Logger } from '../../core/logger/logger.js'
import { createRateLimitMiddleware, validateBody } from '../../shared/http/index.js'
import type { RateLimitConfig, RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'

/** Where the web app beacons its Core Web Vitals. */
export const RUM_PATH = '/api/v1/rum'

export interface RumRouterDependencies {
  logger: Logger
  rateLimiterService: RateLimitConsumer
  rateLimit: RateLimitConfig
}

/**
 * Real-user monitoring intake. The browser sends this with
 * navigator.sendBeacon, which cannot set the CSRF header, so the router is
 * mounted ahead of the CSRF check. That is safe because the endpoint is
 * anonymous and does nothing but write a log line: it reads no cookie or
 * session, changes no state, and accepts only a strict, bounded schema
 * (a normalized route plus numeric metrics). Per-IP rate limiting and a
 * 4 KB body cap keep it from being used to flood the logs.
 */
export function createRumRouter(deps: RumRouterDependencies): Router {
  const router = Router()
  const logger = deps.logger.child({ module: 'rum' })

  router.post(
    '/',
    createRateLimitMiddleware(deps.rateLimiterService, 'rum', deps.rateLimit),
    express.json({ limit: '4kb' }),
    validateBody(rumReportSchema),
    (req, res) => {
      const report = req.body as z.output<typeof rumReportSchema>
      // Only the screen and the numbers: no IP, user agent, user or session.
      logger.info({ route: report.route, metrics: report.metrics }, 'web vitals')
      res.status(204).end()
    },
  )

  return router
}
