import { Router } from 'express'
import { globalSearchQuerySchema } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { createRateLimitMiddleware, requireAuth, validateQuery } from '../../shared/http/index.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import { SearchController } from './search.controller.js'
import type { SearchService } from './search.service.js'

export interface SearchRouterDependencies {
  service: SearchService
  config: AppConfig
  rateLimiterService: RateLimitConsumer
}

export function createSearchRouter(deps: SearchRouterDependencies): Router {
  const router = Router()
  const controller = new SearchController(deps.service)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const searchRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'global-search',
    deps.config.rateLimit.application.search,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )

  router.get(
    '/search',
    requireAuthMiddleware,
    searchRateLimit,
    validateQuery(globalSearchQuerySchema),
    controller.search,
  )

  return router
}
