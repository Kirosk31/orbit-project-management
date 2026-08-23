import { Router } from 'express'
import { Permission } from '@orbit/shared'
import {
  createBoardSchema,
  createColumnSchema,
  moveColumnSchema,
  updateBoardSchema,
  updateColumnSchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { AuditService } from '../../shared/audit/audit.js'
import { requireAuth, validateBody } from '../../shared/http/index.js'
import { requireOrgPermission } from '../organizations/rbac.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { createRequireProjectMember } from '../projects/project-access.js'
import type { ProjectsRepository } from '../projects/projects.repository.js'
import { createRequireBoardMember } from './board-access.js'
import { BoardsController } from './boards.controller.js'
import type { BoardsRepository } from './boards.repository.js'
import type { BoardsService } from './boards.service.js'

/**
 * @swagger
 * tags:
 *   - name: Boards
 *     description: Boards and columns within a project (RBAC-scoped)
 */

export interface BoardsRouterDependencies {
  service: BoardsService
  repository: BoardsRepository
  projectsRepository: ProjectsRepository
  organizationsRepository: OrganizationsRepository
  config: AppConfig
  auditService: AuditService
}

export function createBoardsRouter(deps: BoardsRouterDependencies): Router {
  const controller = new BoardsController(deps.service, deps.auditService)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const projectMember = createRequireProjectMember(
    deps.projectsRepository,
    deps.organizationsRepository,
  )
  const boardMember = createRequireBoardMember(
    deps.repository,
    deps.projectsRepository,
    deps.organizationsRepository,
  )

  const router = Router()

  /**
   * @swagger
   * /projects/{id}/boards:
   *   get:
   *     summary: List boards of a project (project.view)
   *     tags: [Boards]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: id, in: path, required: true, schema: { type: string } }
   *       - { name: archived, in: query, schema: { type: string, enum: [true, false] } }
   *     responses:
   *       '200': { description: Board list }
   */
  router.get('/projects/:id/boards', requireAuthMiddleware, projectMember, controller.list)

  /**
   * @swagger
   * /projects/{id}/boards:
   *   post:
   *     summary: Create a board (board.create)
   *     tags: [Boards]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '201': { description: Created board }
   */
  router.post(
    '/projects/:id/boards',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.BOARD_CREATE),
    validateBody(createBoardSchema),
    controller.create,
  )

  router.get('/boards/:id', requireAuthMiddleware, boardMember, controller.get)

  router.patch(
    '/boards/:id',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    validateBody(updateBoardSchema),
    controller.update,
  )

  router.delete(
    '/boards/:id',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_DELETE),
    controller.remove,
  )

  router.post(
    '/boards/:id/archive',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    controller.archive,
  )

  router.post(
    '/boards/:id/unarchive',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    controller.unarchive,
  )

  router.get('/boards/:id/columns', requireAuthMiddleware, boardMember, controller.listColumns)

  router.post(
    '/boards/:id/columns',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    validateBody(createColumnSchema),
    controller.createColumn,
  )

  router.patch(
    '/columns/:columnId',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    validateBody(updateColumnSchema),
    controller.updateColumn,
  )

  router.delete(
    '/columns/:columnId',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    controller.deleteColumn,
  )

  router.post(
    '/columns/:columnId/move',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.BOARD_UPDATE),
    validateBody(moveColumnSchema),
    controller.moveColumn,
  )

  return router
}
