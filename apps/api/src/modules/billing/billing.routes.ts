import { Router } from 'express'
import { Permission, changePlanSchema } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { requireAuth, validateBody } from '../../shared/http/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { requireOrgMember, requireOrgPermission } from '../organizations/rbac.js'
import { BillingController } from './billing.controller.js'
import type { BillingService } from './billing.service.js'

export interface BillingRouterDependencies {
  service: BillingService
  organizationsRepository: OrganizationsRepository
  config: AppConfig
}

export function createBillingRouter(deps: BillingRouterDependencies): Router {
  const controller = new BillingController(deps.service)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const orgMember = requireOrgMember(deps.organizationsRepository)

  const router = Router()

  /**
   * @swagger
   * /billing/plans:
   *   get:
   *     summary: List available billing plans
   *     tags: [Billing]
   *     responses:
   *       '200': { description: Plan list }
   */
  router.get('/billing/plans', controller.listPlans)

  /**
   * @swagger
   * /organizations/{slug}/billing:
   *   get:
   *     summary: Get the subscription for an organization
   *     tags: [Billing]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '200': { description: Current subscription }
   */
  router.get(
    '/organizations/:slug/billing',
    requireAuthMiddleware,
    orgMember,
    requireOrgPermission(Permission.ORG_VIEW),
    controller.getSubscription,
  )

  /**
   * @swagger
   * /organizations/{slug}/billing/checkout:
   *   post:
   *     summary: Create a checkout session (owner only, requires a payment provider)
   *     tags: [Billing]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Checkout result }
   */
  router.post(
    '/organizations/:slug/billing/checkout',
    requireAuthMiddleware,
    orgMember,
    requireOrgPermission(Permission.ORG_UPDATE),
    validateBody(changePlanSchema),
    controller.createCheckout,
  )

  /**
   * @swagger
   * /organizations/{slug}/billing/portal:
   *   post:
   *     summary: Create a billing portal session (owner only, requires a payment provider)
   *     tags: [Billing]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Portal result }
   */
  router.post(
    '/organizations/:slug/billing/portal',
    requireAuthMiddleware,
    orgMember,
    requireOrgPermission(Permission.ORG_UPDATE),
    controller.createPortal,
  )

  return router
}
