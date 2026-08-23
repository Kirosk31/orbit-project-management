import { Router } from 'express'
import { Permission } from '@orbit/shared'
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { AuditService } from '../../shared/audit/audit.js'
import { requireAuth, validateBody, validateQuery } from '../../shared/http/index.js'
import { requireOrgMember, requireOrgPermission } from '../organizations/rbac.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { createRequireProjectMember } from './project-access.js'
import { ProjectsController } from './projects.controller.js'
import type { ProjectsRepository } from './projects.repository.js'
import type { ProjectsService } from './projects.service.js'

/**
 * @swagger
 * tags:
 *   - name: Projects
 *     description: Projects, members, favorites and activity (RBAC-scoped)
 */

export interface ProjectsRouterDependencies {
  service: ProjectsService
  repository: ProjectsRepository
  organizationsRepository: OrganizationsRepository
  config: AppConfig
  auditService: AuditService
}

export function createProjectsRouter(deps: ProjectsRouterDependencies): Router {
  const controller = new ProjectsController(deps.service, deps.auditService)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const member = requireOrgMember(deps.organizationsRepository)
  const projectMember = createRequireProjectMember(deps.repository, deps.organizationsRepository)

  const router = Router()

  /**
   * @swagger
   * /organizations/{slug}/projects:
   *   get:
   *     summary: List projects of an organization (project.view)
   *     tags: [Projects]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *       - { name: archived, in: query, schema: { type: string, enum: [true, false] } }
   *     responses:
   *       '200': { description: Project list }
   *       '404': { description: Not a member or not found }
   */
  router.get(
    '/organizations/:slug/projects',
    requireAuthMiddleware,
    member,
    validateQuery(projectQuerySchema),
    controller.list,
  )

  /**
   * @swagger
   * /organizations/{slug}/projects:
   *   post:
   *     summary: Create a project (project.create)
   *     tags: [Projects]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: slug, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '201': { description: Created project }
   */
  router.post(
    '/organizations/:slug/projects',
    requireAuthMiddleware,
    member,
    requireOrgPermission(Permission.PROJECT_CREATE),
    validateBody(createProjectSchema),
    controller.create,
  )

  /**
   * @swagger
   * /projects/{id}:
   *   get:
   *     summary: Get a project (project.view)
   *     tags: [Projects]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: id, in: path, required: true, schema: { type: string } }
   *     responses:
   *       '200': { description: Project }
   *       '404': { description: Not a member or not found }
   */
  router.get('/projects/:id', requireAuthMiddleware, projectMember, controller.get)

  router.patch(
    '/projects/:id',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_UPDATE),
    validateBody(updateProjectSchema),
    controller.update,
  )

  router.delete(
    '/projects/:id',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_DELETE),
    controller.remove,
  )

  router.post(
    '/projects/:id/archive',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_ARCHIVE),
    controller.archive,
  )

  router.post(
    '/projects/:id/unarchive',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_ARCHIVE),
    controller.unarchive,
  )

  router.post('/projects/:id/favorite', requireAuthMiddleware, projectMember, controller.favorite)

  router.delete(
    '/projects/:id/favorite',
    requireAuthMiddleware,
    projectMember,
    controller.unfavorite,
  )

  router.get('/projects/:id/members', requireAuthMiddleware, projectMember, controller.listMembers)

  router.post(
    '/projects/:id/members',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_MANAGE_MEMBERS),
    validateBody(addProjectMemberSchema),
    controller.addMember,
  )

  router.delete(
    '/projects/:id/members/:userId',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.PROJECT_MANAGE_MEMBERS),
    controller.removeMember,
  )

  router.get(
    '/projects/:id/activity',
    requireAuthMiddleware,
    projectMember,
    controller.listActivity,
  )

  return router
}
