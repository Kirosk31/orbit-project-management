import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { Permission } from '@orbit/shared'
import {
  createCommentSchema,
  paginationQuerySchema,
  toggleReactionSchema,
  updateCommentSchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { notFound } from '../../core/errors/index.js'
import { requireAuth, validateBody, validateQuery } from '../../shared/http/index.js'
import { requireOrgPermission } from '../organizations/rbac.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { createRequireProjectMember } from '../projects/project-access.js'
import type { ProjectsRepository } from '../projects/projects.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import { CommentsController } from './comments.controller.js'
import type { CommentsRepository } from './comments.repository.js'
import type { CommentsService } from './comments.service.js'

/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: Task comments with replies, mentions and reactions (RBAC-scoped)
 */

export interface CommentsRouterDependencies {
  service: CommentsService
  repository: CommentsRepository
  projectsRepository: ProjectsRepository
  organizationsRepository: OrganizationsRepository
  tasksRepository: TasksRepository
  config: AppConfig
}

/** Resolves a comment from `:id`, then delegates access to the task's project middleware. */
function requireCommentMember(
  comments: CommentsRepository,
  tasks: TasksRepository,
  requireProjectMember: ReturnType<typeof createRequireProjectMember>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const comment = await comments.findCommentById(req.params.id as string)
    if (!comment) {
      next(notFound('Comment not found'))
      return
    }
    const task = await tasks.findTaskById(comment.taskId)
    if (!task) {
      next(notFound('Comment not found'))
      return
    }
    res.locals.comment = { id: comment.id, taskId: comment.taskId }
    res.locals.task = { id: task.id, projectId: task.projectId }
    requireProjectMember(req, res, next)
  }
}

/** Resolves a task from `:id`, then delegates access to the project middleware. */
function requireTaskMember(
  tasks: TasksRepository,
  requireProjectMember: ReturnType<typeof createRequireProjectMember>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const row = await tasks.findTaskById(req.params.id as string)
    if (!row) {
      next(notFound('Task not found'))
      return
    }
    res.locals.task = { id: row.id, projectId: row.projectId, orgId: row.orgId }
    requireProjectMember(req, res, next)
  }
}

export function createCommentsRouter(deps: CommentsRouterDependencies): Router {
  const controller = new CommentsController(deps.service)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const taskMember = requireTaskMember(
    deps.tasksRepository,
    createRequireProjectMember(deps.projectsRepository, deps.organizationsRepository, (_req, res) =>
      String((res.locals.task as { projectId: string }).projectId ?? ''),
    ),
  )
  const commentMember = requireCommentMember(
    deps.repository,
    deps.tasksRepository,
    createRequireProjectMember(deps.projectsRepository, deps.organizationsRepository, (_req, res) =>
      String((res.locals.task as { projectId: string }).projectId ?? ''),
    ),
  )

  const router = Router()

  /**
   * @swagger
   * /tasks/{id}/comments:
   *   get:
   *     summary: List comments of a task (task.view)
   *     tags: [Comments]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Comment list with pagination }
   */
  router.get(
    '/tasks/:id/comments',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateQuery(paginationQuerySchema),
    controller.list,
  )

  /**
   * @swagger
   * /tasks/{id}/comments:
   *   post:
   *     summary: Create a comment (task.comment)
   *     tags: [Comments]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '201': { description: Created comment }
   */
  router.post(
    '/tasks/:id/comments',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_COMMENT),
    validateBody(createCommentSchema),
    controller.create,
  )

  router.patch(
    '/comments/:id',
    requireAuthMiddleware,
    commentMember,
    requireOrgPermission(Permission.TASK_COMMENT),
    validateBody(updateCommentSchema),
    controller.update,
  )

  router.delete(
    '/comments/:id',
    requireAuthMiddleware,
    commentMember,
    requireOrgPermission(Permission.TASK_COMMENT_MODERATE),
    controller.remove,
  )

  router.post(
    '/comments/:id/reactions',
    requireAuthMiddleware,
    commentMember,
    requireOrgPermission(Permission.TASK_COMMENT),
    validateBody(toggleReactionSchema),
    controller.toggleReaction,
  )

  return router
}
