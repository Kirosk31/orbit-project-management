import { Router } from 'express'
import { organizationAnalyticsQuerySchema, Permission } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { createRateLimitMiddleware, requireAuth, validateQuery } from '../../shared/http/index.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { requireOrgMember, requireOrgPermission } from '../organizations/rbac.js'
import { AnalyticsController } from './analytics.controller.js'
import type { AnalyticsService } from './analytics.service.js'

export interface AnalyticsRouterDependencies {
  service: AnalyticsService
  organizationsRepository: OrganizationsRepository
  config: AppConfig
  rateLimiterService: RateLimitConsumer
}

export function createAnalyticsRouter(deps: AnalyticsRouterDependencies): Router {
  const router = Router()
  const controller = new AnalyticsController(deps.service)
  const analyticsRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'organization-analytics',
    deps.config.rateLimit.application.analytics,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )

  router.get(
    '/organizations/:slug/analytics',
    requireAuth(deps.config.env.JWT_ACCESS_SECRET),
    analyticsRateLimit,
    requireOrgMember(deps.organizationsRepository),
    requireOrgPermission(Permission.ORG_DASHBOARD_VIEW),
    validateQuery(organizationAnalyticsQuerySchema),
    controller.organization,
  )

  return router
}
