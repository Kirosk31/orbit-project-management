import { createServer, type Server } from 'node:http'
import { createAdapter } from '@socket.io/redis-adapter'
import { createApp } from './app.js'
import { createConfig } from './config/index.js'
import { createLogger, type Logger } from './core/logger/logger.js'
import { RedisCacheService } from './shared/cache/CacheService.js'
import { getPrisma, disconnectPrisma } from './shared/database/prisma.js'
import { createMailService } from './shared/mail/mail.js'
import { OutboxEventCodec } from './shared/outbox/outbox.crypto.js'
import { RateLimiterService } from './shared/ratelimit/rateLimit.js'
import { createRedisConnection, getRedis, closeRedis } from './shared/redis/redis.js'
import { createStorageService } from './shared/storage/storage.js'
import { PrismaAuditService } from './shared/audit/audit.js'
import { HealthService } from './modules/health/health.service.js'
import { AuthService } from './modules/auth/auth.service.js'
import { PrismaAuthRepository } from './modules/auth/auth.repository.js'
import { UsersService } from './modules/users/users.service.js'
import { PrismaUsersRepository } from './modules/users/users.repository.js'
import { OrganizationsService } from './modules/organizations/organizations.service.js'
import { PrismaOrganizationsRepository } from './modules/organizations/organizations.repository.js'
import { ProjectsService } from './modules/projects/projects.service.js'
import { PrismaProjectsRepository } from './modules/projects/projects.repository.js'
import { BoardsService } from './modules/boards/boards.service.js'
import { PrismaBoardsRepository } from './modules/boards/boards.repository.js'
import { TasksService } from './modules/tasks/tasks.service.js'
import { PrismaTasksRepository } from './modules/tasks/tasks.repository.js'
import { PrismaTaskResourcesRepository } from './modules/tasks/task-resources.repository.js'
import { TaskResourcesService } from './modules/tasks/task-resources.service.js'
import { PrismaTaskTimeRepository } from './modules/tasks/task-time.repository.js'
import { TaskTimeService } from './modules/tasks/task-time.service.js'
import { PrismaTaskAttachmentsRepository } from './modules/tasks/task-attachments.repository.js'
import { TaskAttachmentsService } from './modules/tasks/task-attachments.service.js'
import { PrismaTaskFiltersRepository } from './modules/tasks/task-filters.repository.js'
import { TaskFiltersService } from './modules/tasks/task-filters.service.js'
import { CommentsService } from './modules/comments/comments.service.js'
import { PrismaCommentsRepository } from './modules/comments/comments.repository.js'
import { PrismaNotificationsRepository } from './modules/notifications/notifications.repository.js'
import { NotificationsService } from './modules/notifications/notifications.service.js'
import { RealtimeService } from './modules/realtime/realtime.service.js'
import { RealtimeAuthorizationService } from './modules/realtime/realtime.authorization.js'
import { DeferredRealtimePublisher } from './modules/realtime/realtime.publisher.js'
import { PrismaSearchRepository } from './modules/search/search.repository.js'
import { SearchService } from './modules/search/search.service.js'
import { PrismaAnalyticsRepository } from './modules/analytics/analytics.repository.js'
import { AnalyticsService } from './modules/analytics/analytics.service.js'
import { PrismaBillingRepository } from './modules/billing/billing.repository.js'
import { BillingService } from './modules/billing/billing.service.js'
import { PlanLimiter } from './modules/billing/billing.plan-limiter.js'

const SHUTDOWN_TIMEOUT_MS = 10_000

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function connectWithRetry<T>(
  description: string,
  operation: () => Promise<T>,
  logger: Logger,
  attempts = 10,
  delayMs = 2_000,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      logger.warn({ attempt, attempts, description }, 'dependency not ready, retrying')
      if (attempt < attempts) {
        await wait(delayMs)
      }
    }
  }

  throw new Error(`Failed to connect to ${description} after ${attempts} attempts`, {
    cause: lastError,
  })
}

async function bootstrap(): Promise<void> {
  const config = createConfig()
  const logger = createLogger({
    level: config.env.LOG_LEVEL,
    isProduction: config.isProduction,
  })

  logger.info({ env: config.env.NODE_ENV, port: config.env.PORT }, 'booting orbit api')

  const redis = getRedis(config.env.REDIS_URL, logger)
  await connectWithRetry(
    'redis',
    async () => {
      await redis.connect()
      await redis.ping()
    },
    logger,
  )

  const prisma = getPrisma()
  await connectWithRetry(
    'database',
    async () => {
      await prisma.$queryRaw`SELECT 1`
    },
    logger,
  )

  const cacheService = new RedisCacheService(redis)
  const mailService = createMailService(config, logger)
  const outboxCodec = new OutboxEventCodec(
    config.env.OUTBOX_ENCRYPTION_KEY,
    config.env.JWT_ACCESS_SECRET,
    config.outbox.maxAttempts,
  )
  const storageService = createStorageService(config, logger)
  const rateLimiterService = new RateLimiterService(redis, logger)
  const auditService = new PrismaAuditService(prisma)
  const realtimePublisher = new DeferredRealtimePublisher()
  const authRepository = new PrismaAuthRepository(prisma)
  const authService = new AuthService({
    repository: authRepository,
    config,
    mailService,
    outboxCodec,
    logger,
    realtime: realtimePublisher,
  })
  const usersService = new UsersService({
    repository: new PrismaUsersRepository(prisma),
    storage: storageService,
    logger,
  })
  const organizationsRepository = new PrismaOrganizationsRepository(prisma)
  const billingRepository = new PrismaBillingRepository(prisma)
  const billingService = new BillingService({
    repository: billingRepository,
    organizations: organizationsRepository,
    defaultPlanKey: config.billing.defaultPlanKey,
    checkoutEnabled: config.billing.enabled,
    webAppUrl: config.env.WEB_APP_URL,
  })
  const planLimiter = new PlanLimiter(billingService, config.billing.enabled)
  const organizationsService = new OrganizationsService({
    repository: organizationsRepository,
    logger,
    mailService,
    outboxCodec,
    webAppUrl: config.env.WEB_APP_URL,
    planLimiter,
    realtime: realtimePublisher,
  })
  const projectsRepository = new PrismaProjectsRepository(prisma)
  const projectsService = new ProjectsService({
    repository: projectsRepository,
    organizationsRepository,
  })
  const boardsRepository = new PrismaBoardsRepository(prisma)
  const boardsService = new BoardsService({
    repository: boardsRepository,
    realtime: realtimePublisher,
  })
  const notificationsRepository = new PrismaNotificationsRepository(prisma)
  const notificationsService = new NotificationsService({
    repository: notificationsRepository,
    realtime: realtimePublisher,
  })

  const tasksRepository = new PrismaTasksRepository(prisma)
  const tasksService = new TasksService({
    repository: tasksRepository,
    boards: boardsRepository,
    organizations: organizationsRepository,
    notifications: notificationsService,
    realtime: realtimePublisher,
  })
  const taskResourcesService = new TaskResourcesService({
    repository: new PrismaTaskResourcesRepository(prisma),
    tasks: tasksRepository,
    realtime: realtimePublisher,
  })
  const taskTimeService = new TaskTimeService({
    repository: new PrismaTaskTimeRepository(prisma),
    tasks: tasksRepository,
    realtime: realtimePublisher,
  })
  const taskAttachmentsService = new TaskAttachmentsService({
    repository: new PrismaTaskAttachmentsRepository(prisma),
    tasks: tasksRepository,
    storage: storageService,
    logger,
    realtime: realtimePublisher,
  })
  const taskFiltersService = new TaskFiltersService(new PrismaTaskFiltersRepository(prisma))
  const searchService = new SearchService(new PrismaSearchRepository(prisma))
  const analyticsService = new AnalyticsService(new PrismaAnalyticsRepository(prisma))
  const commentsRepository = new PrismaCommentsRepository(prisma)
  const commentsService = new CommentsService({
    repository: commentsRepository,
    tasks: tasksRepository,
    organizations: organizationsRepository,
    notifications: notificationsService,
    realtime: realtimePublisher,
  })

  const healthService = new HealthService(
    {
      database: async () => {
        await prisma.$queryRaw`SELECT 1`
      },
      redis: () => cacheService.ping(),
    },
    new Date(),
  )

  const app = createApp({
    config,
    logger,
    cacheService,
    mailService,
    storageService,
    rateLimiterService,
    auditService,
    healthService,
    authService,
    usersService,
    organizationsService,
    organizationsRepository,
    projectsService,
    projectsRepository,
    boardsService,
    boardsRepository,
    tasksService,
    taskResourcesService,
    taskTimeService,
    taskAttachmentsService,
    taskFiltersService,
    tasksRepository,
    commentsService,
    commentsRepository,
    notificationsService,
    notificationsRepository,
    searchService,
    analyticsService,
    billingService,
  })

  const server: Server = createServer(app)
  const realtimeAuthorizationService = new RealtimeAuthorizationService(
    projectsRepository,
    organizationsRepository,
  )
  const realtimePublisherRedis = createRedisConnection(
    config.env.REDIS_URL,
    logger,
    'realtime-publisher',
  )
  const realtimeSubscriberRedis = createRedisConnection(
    config.env.REDIS_URL,
    logger,
    'realtime-subscriber',
  )
  await Promise.all([
    connectWithRetry('realtime redis publisher', () => realtimePublisherRedis.connect(), logger),
    connectWithRetry('realtime redis subscriber', () => realtimeSubscriberRedis.connect(), logger),
  ])
  const realtimeService = new RealtimeService(
    server,
    config,
    logger,
    realtimeAuthorizationService,
    authService,
    createAdapter(realtimePublisherRedis, realtimeSubscriberRedis, {
      publishOnSpecificResponseChannel: true,
    }),
  )
  realtimePublisher.bind(realtimeService)

  server.listen(config.env.PORT, () => {
    logger.info({ port: config.env.PORT }, 'orbit api listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down')

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out, forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    forceExit.unref()

    server.close(async (error) => {
      if (error) {
        logger.error({ error }, 'error while closing http server')
      }
      await Promise.all([realtimePublisherRedis.quit(), realtimeSubscriberRedis.quit()])
      await disconnectPrisma()
      await closeRedis()
      logger.info('shutdown complete')
      process.exit(error ? 1 : 0)
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

bootstrap().catch((error: unknown) => {
  const logger = createLogger({ level: 'error', isProduction: false })
  logger.fatal({ error }, 'fatal error during bootstrap')
  process.exit(1)
})
