import type { Express } from 'express'
import request from 'supertest'
import type { PrismaClient } from '@prisma/client'
import { createApp } from '../src/app.js'
import { createConfig } from '../src/config/index.js'
import { parseEnv } from '../src/config/env.js'
import { createLogger } from '../src/core/logger/logger.js'
import type { CacheService } from '../src/shared/cache/CacheService.js'
import type { MailService, SendMailOptions } from '../src/shared/mail/mail.js'
import type { RateLimitConsumer } from '../src/shared/ratelimit/rateLimit.js'
import type { StorageService } from '../src/shared/storage/storage.js'
import { PrismaAuditService } from '../src/shared/audit/audit.js'
import { createPrismaClient } from '../src/shared/database/prisma.js'
import { HealthService } from '../src/modules/health/health.service.js'
import { AuthService } from '../src/modules/auth/auth.service.js'
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository.js'
import { UsersService } from '../src/modules/users/users.service.js'
import { PrismaUsersRepository } from '../src/modules/users/users.repository.js'
import { OrganizationsService } from '../src/modules/organizations/organizations.service.js'
import { PrismaOrganizationsRepository } from '../src/modules/organizations/organizations.repository.js'
import { ProjectsService } from '../src/modules/projects/projects.service.js'
import { PrismaProjectsRepository } from '../src/modules/projects/projects.repository.js'
import { BoardsService } from '../src/modules/boards/boards.service.js'
import { PrismaBoardsRepository } from '../src/modules/boards/boards.repository.js'
import { TasksService } from '../src/modules/tasks/tasks.service.js'
import { PrismaTasksRepository } from '../src/modules/tasks/tasks.repository.js'
import { PrismaTaskResourcesRepository } from '../src/modules/tasks/task-resources.repository.js'
import { TaskResourcesService } from '../src/modules/tasks/task-resources.service.js'
import { PrismaTaskTimeRepository } from '../src/modules/tasks/task-time.repository.js'
import { TaskTimeService } from '../src/modules/tasks/task-time.service.js'
import { PrismaTaskAttachmentsRepository } from '../src/modules/tasks/task-attachments.repository.js'
import { TaskAttachmentsService } from '../src/modules/tasks/task-attachments.service.js'
import { PrismaTaskFiltersRepository } from '../src/modules/tasks/task-filters.repository.js'
import { TaskFiltersService } from '../src/modules/tasks/task-filters.service.js'
import { CommentsService } from '../src/modules/comments/comments.service.js'
import { PrismaCommentsRepository } from '../src/modules/comments/comments.repository.js'
import { PrismaNotificationsRepository } from '../src/modules/notifications/notifications.repository.js'
import { NotificationsService } from '../src/modules/notifications/notifications.service.js'
import { PrismaSearchRepository } from '../src/modules/search/search.repository.js'
import { SearchService } from '../src/modules/search/search.service.js'
import { PrismaAnalyticsRepository } from '../src/modules/analytics/analytics.repository.js'
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js'

export interface TestAppOptions {
  databaseUp?: boolean
  redisUp?: boolean
}

const env = parseEnv({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: '0',
  DATABASE_URL: 'postgresql://orbit:orbit@localhost:5432/orbit_test',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'test-only-secret-that-is-longer-than-thirty-two-characters',
})

const TEST_DATABASE_URL = 'postgresql://orbit:orbit@localhost:5432/orbit_test?connection_limit=5'

export async function isTestDatabaseAvailable(): Promise<boolean> {
  const client = createPrismaClient(TEST_DATABASE_URL, 1)
  try {
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  } finally {
    await client.$disconnect()
  }
}

export interface BuiltTestApp {
  app: Express
  sentMails: SendMailOptions[]
  prisma: PrismaClient
}

export function latestInvitationToken(app: BuiltTestApp, email: string): string {
  const mail = [...app.sentMails]
    .reverse()
    .find((item) => item.to.address === email && item.subject.startsWith('Join '))
  const token = /invitationToken=([a-zA-Z0-9_-]+)/.exec(mail?.html ?? '')?.[1]

  if (!token) {
    throw new Error(`No invitation token was delivered to ${email}`)
  }

  return token
}

export function buildTestApp(options: TestAppOptions = {}): BuiltTestApp {
  const config = createConfig(env)

  const logger = createLogger({ level: 'silent', isProduction: false })

  const cacheService: CacheService = {
    get: async () => null,
    set: async () => undefined,
    del: async () => undefined,
    delByPattern: async () => undefined,
    flush: async () => undefined,
    ping: async () => options.redisUp ?? true,
  }

  const prisma = createPrismaClient(TEST_DATABASE_URL, 5)
  const sentMails: SendMailOptions[] = []

  const mailService: MailService = {
    sendMail: async (options) => {
      sentMails.push(options)
    },
  }

  const storedFiles = new Map<string, { data: Buffer; mimeType: string }>()
  const storageService: StorageService = {
    put: async (key, data, storageOptions) => {
      storedFiles.set(key, { data: Buffer.from(data), mimeType: storageOptions.mimeType })
      return { key, size: data.byteLength, mimeType: storageOptions.mimeType }
    },
    get: async (key) => Buffer.from(storedFiles.get(key)?.data ?? Buffer.alloc(0)),
    delete: async (key) => {
      storedFiles.delete(key)
    },
    exists: async (key) => storedFiles.has(key),
  }

  const rateLimiterService: RateLimitConsumer = {
    consume: async () => undefined,
  }
  const auditService = new PrismaAuditService(prisma)

  const healthService = new HealthService(
    {
      database: async () => {
        if (!(options.databaseUp ?? true)) {
          throw new Error('database unavailable')
        }
      },
      redis: () => cacheService.ping(),
    },
    new Date('2026-01-01T00:00:00.000Z'),
  )

  const authService = new AuthService({
    repository: new PrismaAuthRepository(prisma),
    config,
    mailService,
    logger,
  })

  const usersService = new UsersService({
    repository: new PrismaUsersRepository(prisma),
    storage: storageService,
    logger,
  })

  const organizationsRepository = new PrismaOrganizationsRepository(prisma)
  const organizationsService = new OrganizationsService({
    repository: organizationsRepository,
    logger,
    mailService,
    webAppUrl: config.env.WEB_APP_URL,
  })

  const projectsRepository = new PrismaProjectsRepository(prisma)
  const projectsService = new ProjectsService({
    repository: projectsRepository,
    organizationsRepository,
  })

  const boardsRepository = new PrismaBoardsRepository(prisma)
  const boardsService = new BoardsService({
    repository: boardsRepository,
  })

  const notificationsRepository = new PrismaNotificationsRepository(prisma)
  const notificationsService = new NotificationsService({ repository: notificationsRepository })

  const tasksRepository = new PrismaTasksRepository(prisma)
  const tasksService = new TasksService({
    repository: tasksRepository,
    boards: boardsRepository,
    organizations: organizationsRepository,
    notifications: notificationsService,
  })
  const taskResourcesService = new TaskResourcesService({
    repository: new PrismaTaskResourcesRepository(prisma),
    tasks: tasksRepository,
  })
  const taskTimeService = new TaskTimeService({
    repository: new PrismaTaskTimeRepository(prisma),
    tasks: tasksRepository,
  })
  const taskAttachmentsService = new TaskAttachmentsService({
    repository: new PrismaTaskAttachmentsRepository(prisma),
    tasks: tasksRepository,
    storage: storageService,
    logger,
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
  })

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
  })

  return { app, sentMails, prisma }
}

export function testAgent(options: TestAppOptions = {}): ReturnType<typeof request.agent> {
  return request.agent(buildTestApp(options).app)
}
