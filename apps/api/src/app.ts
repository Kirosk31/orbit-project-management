import { randomUUID } from 'node:crypto'
import cookieParser from 'cookie-parser'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import type { AppConfig } from './config/index.js'
import type { Logger } from './core/logger/logger.js'
import type { CacheService } from './shared/cache/CacheService.js'
import {
  createCorsMiddleware,
  createErrorHandler,
  createRateLimitMiddleware,
  notFoundHandler,
  requestIdMiddleware,
  requireCsrf,
} from './shared/http/index.js'
import type { MailService } from './shared/mail/mail.js'
import type { RateLimitConsumer } from './shared/ratelimit/rateLimit.js'
import type { StorageService } from './shared/storage/storage.js'
import type { AuditService } from './shared/audit/audit.js'
import type { HealthService } from './modules/health/health.service.js'
import { createHealthRouter } from './modules/health/health.routes.js'
import type { AuthService } from './modules/auth/auth.service.js'
import type { UsersService } from './modules/users/users.service.js'
import type { OrganizationsRepository } from './modules/organizations/organizations.repository.js'
import type { OrganizationsService } from './modules/organizations/organizations.service.js'
import type { ProjectsRepository } from './modules/projects/projects.repository.js'
import type { ProjectsService } from './modules/projects/projects.service.js'
import type { BoardsRepository } from './modules/boards/boards.repository.js'
import type { BoardsService } from './modules/boards/boards.service.js'
import type { TasksRepository } from './modules/tasks/tasks.repository.js'
import type { TasksService } from './modules/tasks/tasks.service.js'
import type { TaskResourcesService } from './modules/tasks/task-resources.service.js'
import type { TaskTimeService } from './modules/tasks/task-time.service.js'
import type { TaskAttachmentsService } from './modules/tasks/task-attachments.service.js'
import type { TaskFiltersService } from './modules/tasks/task-filters.service.js'
import type { CommentsRepository } from './modules/comments/comments.repository.js'
import type { CommentsService } from './modules/comments/comments.service.js'
import type { NotificationsRepository } from './modules/notifications/notifications.repository.js'
import type { NotificationsService } from './modules/notifications/notifications.service.js'
import type { SearchService } from './modules/search/search.service.js'
import type { AnalyticsService } from './modules/analytics/analytics.service.js'
import { createDocsRouter } from './modules/docs/docs.routes.js'
import { createApiRouter } from './routes.js'

export interface AppDependencies {
  config: AppConfig
  logger: Logger
  cacheService: CacheService
  mailService: MailService
  storageService: StorageService
  rateLimiterService: RateLimitConsumer
  auditService: AuditService
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
  searchService: SearchService
  analyticsService: AnalyticsService
}

export function createApp(deps: AppDependencies): Express {
  const app = express()

  app.disable('x-powered-by')
  if (deps.config.trustProxy !== false) {
    app.set('trust proxy', deps.config.trustProxy)
  }

  app.use(requestIdMiddleware)
  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: (req) => (req as Express.Request).requestId ?? randomUUID(),
    }),
  )
  app.use(helmet())
  app.use(createCorsMiddleware(deps.config.cors))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use(
    '/api/v1',
    createRateLimitMiddleware(deps.rateLimiterService, 'global', deps.config.rateLimit.global),
  )
  app.use('/api/v1', requireCsrf)
  app.use(
    '/api/v1',
    createApiRouter({
      config: deps.config,
      healthService: deps.healthService,
      authService: deps.authService,
      usersService: deps.usersService,
      organizationsService: deps.organizationsService,
      organizationsRepository: deps.organizationsRepository,
      projectsService: deps.projectsService,
      projectsRepository: deps.projectsRepository,
      boardsService: deps.boardsService,
      boardsRepository: deps.boardsRepository,
      tasksService: deps.tasksService,
      taskResourcesService: deps.taskResourcesService,
      taskTimeService: deps.taskTimeService,
      taskAttachmentsService: deps.taskAttachmentsService,
      taskFiltersService: deps.taskFiltersService,
      tasksRepository: deps.tasksRepository,
      commentsService: deps.commentsService,
      commentsRepository: deps.commentsRepository,
      notificationsService: deps.notificationsService,
      notificationsRepository: deps.notificationsRepository,
      searchService: deps.searchService,
      analyticsService: deps.analyticsService,
      rateLimiterService: deps.rateLimiterService,
      auditService: deps.auditService,
    }),
  )

  app.use(createHealthRouter(deps.healthService))
  if (deps.config.exposeApiDocs) {
    app.use(createDocsRouter())
  }

  app.use(notFoundHandler)
  app.use(createErrorHandler(deps.logger))

  return app
}
