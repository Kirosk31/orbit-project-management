import type { Server as HttpServer } from 'node:http'
import { Server as SocketIoServer } from 'socket.io'
import { z } from 'zod'
import type { PresenceEvent, ProjectSubscriptionResult } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { Logger } from '../../core/logger/logger.js'
import { verifyAccessToken } from '../../core/security/tokens.js'
import type { RealtimeAuthorizer } from './realtime.authorization.js'
import type { RealtimePublisher } from './realtime.publisher.js'

const MAX_PROJECT_SUBSCRIPTIONS_PER_SOCKET = 100
const MAX_SUBSCRIPTION_EVENTS_PER_MINUTE = 120

export const projectSubscriptionSchema = z
  .object({
    projectId: z.uuid(),
  })
  .strict()

export class RealtimeService implements RealtimePublisher {
  private readonly io: SocketIoServer

  constructor(
    server: HttpServer,
    config: AppConfig,
    logger: Logger,
    authorizer: RealtimeAuthorizer,
    adapter?: Parameters<SocketIoServer['adapter']>[0],
  ) {
    this.io = new SocketIoServer(server, {
      cors: {
        origin: config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
      maxHttpBufferSize: 64 * 1_024,
      pingTimeout: 20_000,
      pingInterval: 25_000,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1_000,
        skipMiddlewares: false,
      },
    })
    if (adapter) this.io.adapter(adapter)

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token

      if (typeof token !== 'string' || !token) {
        next(new Error('Missing access token'))
        return
      }

      try {
        const payload = verifyAccessToken(token, config.env.JWT_ACCESS_SECRET)
        socket.data.userId = payload.sub
        socket.data.sessionId = payload.sessionId
        next()
      } catch (error) {
        next(error instanceof Error ? error : new Error('Unauthorized'))
      }
    })

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId as string
      logger.info({ userId }, 'realtime client connected')
      socket.join(this.userRoom(userId))

      const projectSubscriptions = new Set<string>()
      let eventWindowStartedAt = Date.now()
      let subscriptionEventCount = 0

      const consumeSubscriptionEvent = (): boolean => {
        const now = Date.now()
        if (now - eventWindowStartedAt >= 60_000) {
          eventWindowStartedAt = now
          subscriptionEventCount = 0
        }
        subscriptionEventCount += 1
        return subscriptionEventCount <= MAX_SUBSCRIPTION_EVENTS_PER_MINUTE
      }

      socket.on(
        'subscribe',
        async (
          payload: unknown,
          acknowledge?: (result: ProjectSubscriptionResult) => void,
        ): Promise<void> => {
          if (!consumeSubscriptionEvent()) {
            acknowledge?.({ ok: false, error: 'RATE_LIMITED' })
            return
          }
          const parsed = projectSubscriptionSchema.safeParse(payload)
          if (!parsed.success) {
            acknowledge?.({ ok: false, error: 'INVALID_PAYLOAD' })
            return
          }

          const { projectId } = parsed.data
          if (
            !projectSubscriptions.has(projectId) &&
            projectSubscriptions.size >= MAX_PROJECT_SUBSCRIPTIONS_PER_SOCKET
          ) {
            acknowledge?.({ ok: false, error: 'SUBSCRIPTION_LIMIT' })
            return
          }

          try {
            const allowed = await authorizer.canSubscribeToProject(userId, projectId)
            if (!allowed) {
              logger.warn({ userId, projectId }, 'unauthorized realtime subscription rejected')
              acknowledge?.({ ok: false, error: 'FORBIDDEN' })
              return
            }

            const wasOnline = (await this.onlineUsers(projectId)).includes(userId)
            await socket.join(this.projectRoom(projectId))
            if (!projectSubscriptions.has(projectId)) {
              projectSubscriptions.add(projectId)
              if (!wasOnline) this.publishPresence(projectId, userId, 'online')
            }
            acknowledge?.({ ok: true, onlineUserIds: await this.onlineUsers(projectId) })
          } catch (error) {
            logger.error({ error, userId, projectId }, 'realtime subscription authorization failed')
            acknowledge?.({ ok: false, error: 'INTERNAL_ERROR' })
            return
          }
        },
      )

      socket.on(
        'unsubscribe',
        async (
          payload: unknown,
          acknowledge?: (result: ProjectSubscriptionResult) => void,
        ): Promise<void> => {
          if (!consumeSubscriptionEvent()) {
            acknowledge?.({ ok: false, error: 'RATE_LIMITED' })
            return
          }
          const parsed = projectSubscriptionSchema.safeParse(payload)
          if (!parsed.success) {
            acknowledge?.({ ok: false, error: 'INVALID_PAYLOAD' })
            return
          }
          const { projectId } = parsed.data
          if (projectSubscriptions.delete(projectId)) {
            await socket.leave(this.projectRoom(projectId))
            await this.publishOfflineWhenAbsent(projectId, userId)
          }
          acknowledge?.({ ok: true })
        },
      )

      socket.on('disconnect', () => {
        void (async () => {
          for (const projectId of projectSubscriptions) {
            await this.publishOfflineWhenAbsent(projectId, userId)
          }
          projectSubscriptions.clear()
          logger.info({ userId }, 'realtime client disconnected')
        })().catch((error: unknown) => {
          logger.warn({ error, userId }, 'realtime disconnect cleanup failed')
        })
      })
    })
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.io.to(this.userRoom(userId)).emit(event, payload)
  }

  emitToProject(projectId: string, event: string, payload: unknown): void {
    this.io.to(this.projectRoom(projectId)).emit(event, payload)
  }

  private userRoom(userId: string): string {
    return `user:${userId}`
  }

  private projectRoom(projectId: string): string {
    return `project:${projectId}`
  }

  private publishPresence(projectId: string, userId: string, state: PresenceEvent['state']): void {
    const event: PresenceEvent = { projectId, userId, state }
    this.emitToProject(projectId, 'presence.updated', event)
  }

  private async publishOfflineWhenAbsent(projectId: string, userId: string): Promise<void> {
    if (!(await this.onlineUsers(projectId)).includes(userId)) {
      this.publishPresence(projectId, userId, 'offline')
    }
  }

  private async onlineUsers(projectId: string): Promise<string[]> {
    const sockets = await this.io.in(this.projectRoom(projectId)).fetchSockets()
    return [
      ...new Set(
        sockets
          .map((socket) => socket.data.userId)
          .filter((userId): userId is string => typeof userId === 'string'),
      ),
    ]
  }
}
