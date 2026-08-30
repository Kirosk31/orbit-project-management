import { Router } from 'express'
import { Permission } from '@orbit/shared'
import {
  acceptInvitationSchema,
  addTeamMemberSchema,
  createOrganizationSchema,
  createTeamSchema,
  inviteMemberSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateTeamSchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import type { AuditService } from '../../shared/audit/audit.js'
import { createRateLimitMiddleware, requireAuth, validateBody } from '../../shared/http/index.js'
import { OrganizationsController } from './organizations.controller.js'
import { requireOrgMember, requireOrgPermission } from './rbac.js'
import type { OrganizationsRepository } from './organizations.repository.js'
import type { OrganizationsService } from './organizations.service.js'

/**
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organizations, members, invitations and teams (RBAC-scoped)
 */

export interface OrganizationsRouterDependencies {
  service: OrganizationsService
  repository: OrganizationsRepository
  config: AppConfig
  rateLimiterService: RateLimitConsumer
  auditService: AuditService
}

export function createOrganizationsRouter(deps: OrganizationsRouterDependencies): Router {
  const controller = new OrganizationsController(deps.service, deps.auditService)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const member = requireOrgMember(deps.repository)
  const invitationRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'organization-invitation',
    deps.config.rateLimit.application.invitation,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )

  const router = Router()

  /**
   * @swagger
   * /organizations:
   *   post:
   *     summary: Create an organization (creator becomes owner)
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string, maxLength: 100 }
   *               description: { type: string, maxLength: 500 }
   *     responses:
   *       '201': { description: Created organization }
   *       '401': { description: Not authenticated }
   */
  router.post('/', requireAuthMiddleware, validateBody(createOrganizationSchema), controller.create)

  /**
   * @swagger
   * /organizations:
   *   get:
   *     summary: List organizations the user belongs to
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Organization list }
   */
  router.get('/', requireAuthMiddleware, controller.list)

  /**
   * @swagger
   * /organizations/invitations/accept:
   *   post:
   *     summary: Accept an invitation by token and join the organization
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token: { type: string }
   *     responses:
   *       '200': { description: Joined organization }
   *       '404': { description: Invitation not found }
   */
  router.post(
    '/invitations/accept',
    requireAuthMiddleware,
    invitationRateLimit,
    validateBody(acceptInvitationSchema),
    controller.acceptInvitation,
  )

  /**
   * @swagger
   * /organizations/{slug}:
   *   get:
   *     summary: Get an organization by slug (members only)
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '200': { description: Organization }
   *       '404': { description: Not a member or not found }
   */
  router.get('/:slug', requireAuthMiddleware, member, controller.get)

  /**
   * @swagger
   * /organizations/{slug}:
   *   patch:
   *     summary: Update an organization (org.update)
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '200': { description: Updated organization }
   */
  router.patch(
    '/:slug',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_UPDATE),
    validateBody(updateOrganizationSchema),
    controller.update,
  )

  /**
   * @swagger
   * /organizations/{slug}:
   *   delete:
   *     summary: Soft-delete an organization (org.delete)
   *     tags: [Organizations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '200': { description: Organization deleted }
   */
  router.delete(
    '/:slug',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_DELETE),
    controller.remove,
  )

  router.get('/:slug/members', requireAuthMiddleware, member, controller.listMembers)

  router.get('/:slug/roles', requireAuthMiddleware, member, controller.listRoles)

  router.patch(
    '/:slug/members/:userId',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_MEMBERS),
    validateBody(updateMemberRoleSchema),
    controller.updateMemberRole,
  )

  router.delete(
    '/:slug/members/:userId',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_MEMBERS),
    controller.removeMember,
  )

  router.post(
    '/:slug/transfer-ownership',
    requireAuthMiddleware,
    member,
    validateBody(transferOwnershipSchema),
    controller.transferOwnership,
  )

  router.get('/:slug/teams', requireAuthMiddleware, member, controller.listTeams)

  router.post(
    '/:slug/teams',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_TEAMS),
    validateBody(createTeamSchema),
    controller.createTeam,
  )

  router.patch(
    '/:slug/teams/:teamId',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_TEAMS),
    validateBody(updateTeamSchema),
    controller.updateTeam,
  )

  router.delete(
    '/:slug/teams/:teamId',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_TEAMS),
    controller.deleteTeam,
  )

  router.get(
    '/:slug/teams/:teamId/members',
    requireAuthMiddleware,
    member,
    controller.listTeamMembers,
  )

  router.post(
    '/:slug/teams/:teamId/members',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_TEAMS),
    validateBody(addTeamMemberSchema),
    controller.addTeamMember,
  )

  router.delete(
    '/:slug/teams/:teamId/members/:userId',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_MANAGE_TEAMS),
    controller.removeTeamMember,
  )

  router.get('/:slug/invitations', requireAuthMiddleware, member, controller.listInvitations)

  router.post(
    '/:slug/invitations',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_INVITE),
    invitationRateLimit,
    validateBody(inviteMemberSchema),
    controller.invite,
  )

  router.post(
    '/:slug/invitations/:invitationId/revoke',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.ORG_INVITE),
    controller.revokeInvitation,
  )

  return router
}
