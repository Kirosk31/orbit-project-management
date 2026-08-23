import { Router } from 'express'
import { csrfTokenHandler } from './shared/http/index.js'
import { createHealthRouter } from './modules/health/health.routes.js'
import type { HealthService } from './modules/health/health.service.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import type { AuthService } from './modules/auth/auth.service.js'
import { createUsersRouter } from './modules/users/users.routes.js'
import type { UsersService } from './modules/users/users.service.js'
import { createOrganizationsRouter } from './modules/organizations/organizations.routes.js'
import type { OrganizationsRepository } from './modules/organizations/organizations.repository.js'
import type { OrganizationsService } from './modules/organizations/organizations.service.js'
import { createProjectsRouter } from './modules/projects/projects.routes.js'
import type { ProjectsRepository } from './modules/projects/projects.repository.js'
import type { ProjectsService } from './modules/projects/projects.service.js'
import { createBoardsRouter } from './modules/boards/boards.routes.js'
import type { BoardsRepository } from './modules/boards/boards.repository.js'
import type { BoardsService } from './modules/boards/boards.service.js'
import { createTasksRouter } from './modules/tasks/tasks.routes.js'
import type { TasksRepository } from './modules/tasks/tasks.repository.js'
import type { TasksService } from './modules/tasks/tasks.service.js'
import type { TaskResourcesService } from './modules/tasks/task-resources.service.js'
import type { TaskTimeService } from './modules/tasks/task-time.service.js'
import type { TaskAttachmentsService } from './modules/tasks/task-attachments.service.js'
import type { TaskFiltersService } from './modules/tasks/task-filters.service.js'
import { createCommentsRouter } from './modules/comments/comments.routes.js'
import type { CommentsRepository } from './modules/comments/comments.repository.js'
import type { CommentsService } from './modules/comments/comments.service.js'
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js'
import type { NotificationsRepository } from './modules/notifications/notifications.repository.js'
import type { NotificationsService } from './modules/notifications/notifications.service.js'
import type { RateLimitConsumer } from './shared/ratelimit/rateLimit.js'
import type { AppConfig } from './config/index.js'
import type { AuditService } from './shared/audit/audit.js'
import { createSearchRouter } from './modules/search/search.routes.js'
import type { SearchService } from './modules/search/search.service.js'
import { createAnalyticsRouter } from './modules/analytics/analytics.routes.js'
import type { AnalyticsService } from './modules/analytics/analytics.service.js'

export interface ApiDependencies {
  config: AppConfig
  healthService: HealthService
  authService: AuthService
  usersService: UsersService
  organizationsService: OrganizationsService
  organizationsRepository: OrganizationsRepository
  projectsService: ProjectsService
  projectsRepository: ProjectsRepository
  boardsService: BoardsService
  boardsRepository: BoardsRepository
  tasksService: TasksService
  taskResourcesService: TaskResourcesService
  taskTimeService: TaskTimeService
  taskAttachmentsService: TaskAttachmentsService
  taskFiltersService: TaskFiltersService
  tasksRepository: TasksRepository
  commentsService: CommentsService
  commentsRepository: CommentsRepository
  notificationsService: NotificationsService
  notificationsRepository: NotificationsRepository
  rateLimiterService: RateLimitConsumer
  auditService: AuditService
  searchService: SearchService
  analyticsService: AnalyticsService
}

export function createApiRouter(deps: ApiDependencies): Router {
  const router = Router()

  router.get('/auth/csrf', csrfTokenHandler)
  router.use(
    '/auth',
    createAuthRouter({
      service: deps.authService,
      config: deps.config,
      rateLimiterService: deps.rateLimiterService,
      auditService: deps.auditService,
    }),
  )
  router.use(
    '/users',
    createUsersRouter({
      service: deps.usersService,
      config: deps.config,
      rateLimiterService: deps.rateLimiterService,
    }),
  )
  router.use(
    '/organizations',
    createOrganizationsRouter({
      service: deps.organizationsService,
      repository: deps.organizationsRepository,
      config: deps.config,
      rateLimiterService: deps.rateLimiterService,
      auditService: deps.auditService,
    }),
  )
  router.use(
    createProjectsRouter({
      service: deps.projectsService,
      repository: deps.projectsRepository,
      organizationsRepository: deps.organizationsRepository,
      config: deps.config,
      auditService: deps.auditService,
    }),
  )
  router.use(
    createBoardsRouter({
      service: deps.boardsService,
      repository: deps.boardsRepository,
      projectsRepository: deps.projectsRepository,
      organizationsRepository: deps.organizationsRepository,
      config: deps.config,
      auditService: deps.auditService,
    }),
  )
  router.use(
    createTasksRouter({
      service: deps.tasksService,
      resourcesService: deps.taskResourcesService,
      timeService: deps.taskTimeService,
      attachmentsService: deps.taskAttachmentsService,
      filtersService: deps.taskFiltersService,
      repository: deps.tasksRepository,
      projectsRepository: deps.projectsRepository,
      organizationsRepository: deps.organizationsRepository,
      boardsRepository: deps.boardsRepository,
      config: deps.config,
      auditService: deps.auditService,
      rateLimiterService: deps.rateLimiterService,
    }),
  )
  router.use(
    createCommentsRouter({
      service: deps.commentsService,
      repository: deps.commentsRepository,
      projectsRepository: deps.projectsRepository,
      organizationsRepository: deps.organizationsRepository,
      tasksRepository: deps.tasksRepository,
      config: deps.config,
    }),
  )

  router.use(
    createNotificationsRouter({
      service: deps.notificationsService,
      repository: deps.notificationsRepository,
      config: deps.config,
    }),
  )

  router.use(
    createSearchRouter({
      service: deps.searchService,
      config: deps.config,
      rateLimiterService: deps.rateLimiterService,
    }),
  )

  router.use(
    createAnalyticsRouter({
      service: deps.analyticsService,
      organizationsRepository: deps.organizationsRepository,
      config: deps.config,
      rateLimiterService: deps.rateLimiterService,
    }),
  )

  router.use(createHealthRouter(deps.healthService))

  return router
}
