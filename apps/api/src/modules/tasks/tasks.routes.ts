import { Router } from 'express'
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { Permission } from '@orbit/shared'
import {
  createChecklistItemSchema,
  createChecklistSchema,
  createLabelSchema,
  createSavedFilterSchema,
  createSubtaskSchema,
  createTaskSchema,
  logTimeEntrySchema,
  moveChecklistItemSchema,
  moveTaskSchema,
  paginationQuerySchema,
  startTaskTimerSchema,
  taskQuerySchema,
  updateChecklistItemSchema,
  updateChecklistSchema,
  updateLabelSchema,
  updateSavedFilterSchema,
  updateTaskSchema,
  updateTimeEntrySchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { AuditService } from '../../shared/audit/audit.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import { notFound } from '../../core/errors/index.js'
import {
  createRateLimitMiddleware,
  requireAuth,
  validateBody,
  validateQuery,
} from '../../shared/http/index.js'
import { requireOrgMember, requireOrgPermission } from '../organizations/rbac.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import { createRequireBoardMember } from '../boards/board-access.js'
import type { BoardsRepository } from '../boards/boards.repository.js'
import { createRequireProjectMember } from '../projects/project-access.js'
import type { ProjectsRepository } from '../projects/projects.repository.js'
import { TasksController } from './tasks.controller.js'
import type { TasksRepository } from './tasks.repository.js'
import type { TasksService } from './tasks.service.js'
import { TaskResourcesController } from './task-resources.controller.js'
import type { TaskResourcesService } from './task-resources.service.js'
import { TaskTimeController } from './task-time.controller.js'
import type { TaskTimeService } from './task-time.service.js'
import { TaskAttachmentsController } from './task-attachments.controller.js'
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  type TaskAttachmentsService,
} from './task-attachments.service.js'
import { TaskFiltersController } from './task-filters.controller.js'
import type { TaskFiltersService } from './task-filters.service.js'

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Tasks, labels and activity within a project (RBAC-scoped)
 */

export interface TasksRouterDependencies {
  service: TasksService
  resourcesService: TaskResourcesService
  timeService: TaskTimeService
  attachmentsService: TaskAttachmentsService
  filtersService: TaskFiltersService
  repository: TasksRepository
  projectsRepository: ProjectsRepository
  organizationsRepository: OrganizationsRepository
  boardsRepository: BoardsRepository
  config: AppConfig
  auditService: AuditService
  rateLimiterService: RateLimitConsumer
}

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => {
    callback(
      null,
      ATTACHMENT_MIME_TYPES.includes(file.mimetype as (typeof ATTACHMENT_MIME_TYPES)[number]),
    )
  },
})

/** Resolves a task from `:id`, then delegates access to the project access middleware. */
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

/** Resolves a label from `:id`, verifying the caller belongs to the label's org. */
function requireLabelOrgMember(tasks: TasksRepository, organizations: OrganizationsRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const label = await tasks.findLabelById(req.params.id as string)
    if (!label) {
      next(notFound('Label not found'))
      return
    }
    const membership = await organizations.getMembership(label.orgId, req.user!.id)
    if (!membership || !membership.isActive) {
      next(notFound('Label not found'))
      return
    }
    res.locals.org = { id: label.orgId, slug: '' }
    res.locals.orgMembership = {
      id: membership.id,
      roleKey: membership.role.key,
      roleName: membership.role.name,
      permissions: new Set(membership.role.permissions.map((p) => p.permission.key)),
    }
    next()
  }
}

export function createTasksRouter(deps: TasksRouterDependencies): Router {
  const controller = new TasksController(deps.service, deps.auditService)
  const resourcesController = new TaskResourcesController(deps.resourcesService, deps.auditService)
  const timeController = new TaskTimeController(deps.timeService, deps.auditService)
  const attachmentsController = new TaskAttachmentsController(
    deps.attachmentsService,
    deps.auditService,
  )
  const filtersController = new TaskFiltersController(deps.filtersService)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const projectMember = createRequireProjectMember(
    deps.projectsRepository,
    deps.organizationsRepository,
  )
  const taskMember = requireTaskMember(
    deps.repository,
    createRequireProjectMember(deps.projectsRepository, deps.organizationsRepository, (_req, res) =>
      String((res.locals.task as { projectId: string }).projectId ?? ''),
    ),
  )
  const boardMember = createRequireBoardMember(
    deps.boardsRepository,
    deps.projectsRepository,
    deps.organizationsRepository,
  )
  const labelOrgMember = requireLabelOrgMember(deps.repository, deps.organizationsRepository)
  const orgMember = requireOrgMember(deps.organizationsRepository)
  const uploadRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'task-attachment-upload',
    deps.config.rateLimit.application.upload,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )

  const router = Router()

  /**
   * @swagger
   * /projects/{id}/tasks:
   *   get:
   *     summary: List tasks of a project (task.view)
   *     tags: [Tasks]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: id, in: path, required: true, schema: { type: string } }
   *       - { name: statusId, in: query, schema: { type: string } }
   *       - { name: assigneeId, in: query, schema: { type: string } }
   *       - { name: priority, in: query, schema: { type: string } }
   *       - { name: search, in: query, schema: { type: string } }
   *       - { name: archived, in: query, schema: { type: string, enum: [true, false] } }
   *     responses:
   *       '200': { description: Task list with pagination }
   */
  router.get(
    '/projects/:id/tasks',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateQuery(taskQuerySchema),
    controller.list,
  )

  router.get(
    '/boards/:id/tasks',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateQuery(taskQuerySchema),
    controller.listBoardTasks,
  )

  /**
   * @swagger
   * /projects/{id}/tasks:
   *   post:
   *     summary: Create a task (task.create)
   *     tags: [Tasks]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '201': { description: Created task }
   */
  router.post(
    '/projects/:id/tasks',
    requireAuthMiddleware,
    projectMember,
    requireOrgPermission(Permission.TASK_CREATE),
    validateBody(createTaskSchema),
    controller.create,
  )

  router.get(
    '/tasks/:id',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    controller.get,
  )

  router.get(
    '/tasks/:id/subtasks',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    controller.listSubtasks,
  )

  router.post(
    '/tasks/:id/subtasks',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_CREATE),
    validateBody(createSubtaskSchema),
    controller.createSubtask,
  )

  router.get(
    '/tasks/:id/checklists',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    resourcesController.listChecklists,
  )

  router.post(
    '/tasks/:id/checklists',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(createChecklistSchema),
    resourcesController.createChecklist,
  )

  router.patch(
    '/tasks/:id/checklists/:checklistId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(updateChecklistSchema),
    resourcesController.updateChecklist,
  )

  router.delete(
    '/tasks/:id/checklists/:checklistId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    resourcesController.deleteChecklist,
  )

  router.post(
    '/tasks/:id/checklists/:checklistId/items',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(createChecklistItemSchema),
    resourcesController.createChecklistItem,
  )

  router.patch(
    '/tasks/:id/checklists/:checklistId/items/:itemId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(updateChecklistItemSchema),
    resourcesController.updateChecklistItem,
  )

  router.delete(
    '/tasks/:id/checklists/:checklistId/items/:itemId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    resourcesController.deleteChecklistItem,
  )

  router.post(
    '/tasks/:id/checklists/:checklistId/items/:itemId/move',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(moveChecklistItemSchema),
    resourcesController.moveChecklistItem,
  )

  router.get(
    '/tasks/:id/time-entries',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateQuery(paginationQuerySchema),
    timeController.list,
  )

  router.post(
    '/tasks/:id/time-entries',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(logTimeEntrySchema),
    timeController.log,
  )

  router.patch(
    '/tasks/:id/time-entries/:timeEntryId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(updateTimeEntrySchema),
    timeController.update,
  )

  router.delete(
    '/tasks/:id/time-entries/:timeEntryId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    timeController.remove,
  )

  router.post(
    '/tasks/:id/timer/start',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(startTaskTimerSchema),
    timeController.start,
  )

  router.post(
    '/tasks/:id/timer/stop',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    timeController.stop,
  )

  router.get(
    '/tasks/:id/attachments',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    attachmentsController.list,
  )

  router.post(
    '/tasks/:id/attachments',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_ATTACH),
    uploadRateLimit,
    attachmentUpload.single('attachment'),
    attachmentsController.upload,
  )

  router.get(
    '/tasks/:id/attachments/:attachmentId/download',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    attachmentsController.download,
  )

  router.delete(
    '/tasks/:id/attachments/:attachmentId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_ATTACH),
    attachmentsController.remove,
  )

  router.get(
    '/boards/:id/saved-filters',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.TASK_VIEW),
    filtersController.list,
  )

  router.post(
    '/boards/:id/saved-filters',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateBody(createSavedFilterSchema),
    filtersController.create,
  )

  router.patch(
    '/boards/:id/saved-filters/:filterId',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.TASK_VIEW),
    validateBody(updateSavedFilterSchema),
    filtersController.update,
  )

  router.delete(
    '/boards/:id/saved-filters/:filterId',
    requireAuthMiddleware,
    boardMember,
    requireOrgPermission(Permission.TASK_VIEW),
    filtersController.remove,
  )

  router.patch(
    '/tasks/:id',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(updateTaskSchema),
    controller.update,
  )

  router.delete(
    '/tasks/:id',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_DELETE),
    controller.remove,
  )

  router.post(
    '/tasks/:id/archive',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    controller.archive,
  )

  router.post(
    '/tasks/:id/unarchive',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    controller.unarchive,
  )

  router.post(
    '/tasks/:id/move',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_MOVE),
    validateBody(moveTaskSchema),
    controller.move,
  )

  router.post(
    '/tasks/:id/assignees/:userId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_ASSIGN),
    controller.addAssignee,
  )

  router.delete(
    '/tasks/:id/assignees/:userId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_ASSIGN),
    controller.removeAssignee,
  )

  router.post(
    '/tasks/:id/labels/:labelId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    controller.addLabel,
  )

  router.delete(
    '/tasks/:id/labels/:labelId',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    controller.removeLabel,
  )

  router.get(
    '/tasks/:id/activity',
    requireAuthMiddleware,
    taskMember,
    requireOrgPermission(Permission.TASK_VIEW),
    controller.activity,
  )

  router.get(
    '/organizations/:slug/labels',
    requireAuthMiddleware,
    orgMember,
    requireOrgPermission(Permission.TASK_VIEW),
    controller.listLabels,
  )

  router.post(
    '/organizations/:slug/labels',
    requireAuthMiddleware,
    orgMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(createLabelSchema),
    controller.createLabel,
  )

  router.patch(
    '/labels/:id',
    requireAuthMiddleware,
    labelOrgMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    validateBody(updateLabelSchema),
    controller.updateLabel,
  )

  router.delete(
    '/labels/:id',
    requireAuthMiddleware,
    labelOrgMember,
    requireOrgPermission(Permission.TASK_UPDATE),
    controller.deleteLabel,
  )

  return router
}
