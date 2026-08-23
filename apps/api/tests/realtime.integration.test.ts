import { createServer, type Server } from 'node:http'
import { createAdapter } from '@socket.io/redis-adapter'
import { io as createClient, type Socket } from 'socket.io-client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PresenceEvent, ProjectRealtimeEvent, ProjectSubscriptionResult } from '@orbit/shared'
import { createConfig } from '../src/config/index.js'
import { parseEnv } from '../src/config/env.js'
import { createLogger } from '../src/core/logger/logger.js'
import { signAccessToken } from '../src/core/security/tokens.js'
import { RealtimeService } from '../src/modules/realtime/realtime.service.js'
import { createRedisConnection } from '../src/shared/redis/redis.js'

const ACCESS_SECRET = 'realtime-test-secret-that-is-longer-than-thirty-two-characters'
const ALLOWED_PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const FORBIDDEN_PROJECT_ID = '22222222-2222-4222-8222-222222222222'

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2_000)
    socket.once(event, (payload: T) => {
      clearTimeout(timeout)
      resolve(payload)
    })
  })
}

function connect(url: string, token?: string): Socket {
  return createClient(url, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: token ? { token } : {},
    forceNew: true,
    reconnection: false,
  })
}

function waitForConnect(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out connecting')), 2_000)
    socket.once('connect', () => {
      clearTimeout(timeout)
      resolve()
    })
    socket.once('connect_error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

function subscribe(socket: Socket, projectId: unknown): Promise<ProjectSubscriptionResult> {
  return new Promise((resolve) => socket.emit('subscribe', { projectId }, resolve))
}

function unsubscribe(socket: Socket, projectId: string): Promise<ProjectSubscriptionResult> {
  return new Promise((resolve) => socket.emit('unsubscribe', { projectId }, resolve))
}

describe('RealtimeService', () => {
  let httpServer: Server
  let realtime: RealtimeService
  let url: string
  const clients: Socket[] = []
  const canSubscribeToProject = vi.fn(
    async (_userId: string, projectId: string) => projectId === ALLOWED_PROJECT_ID,
  )

  beforeAll(async () => {
    const config = createConfig(
      parseEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        PORT: '0',
        DATABASE_URL: 'postgresql://orbit:orbit@localhost:5432/orbit_test',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGINS: 'http://localhost:5173',
        JWT_ACCESS_SECRET: ACCESS_SECRET,
      }),
    )
    httpServer = createServer()
    realtime = new RealtimeService(
      httpServer,
      config,
      createLogger({ level: 'silent', isProduction: false }),
      { canSubscribeToProject },
    )
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const address = httpServer.address()
    if (!address || typeof address === 'string') throw new Error('Test server did not bind')
    url = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    for (const client of clients) client.disconnect()
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  })

  it('rejects connections without a valid access token', async () => {
    const client = connect(url)
    clients.push(client)
    const error = await once<Error>(client, 'connect_error')
    expect(error.message).toBe('Missing access token')
  })

  it('authorizes project rooms, publishes events and tracks presence', async () => {
    const tokenOne = signAccessToken(
      { sub: 'user-1', sessionId: 'session-1', type: 'access' },
      ACCESS_SECRET,
      60,
    )
    const tokenTwo = signAccessToken(
      { sub: 'user-2', sessionId: 'session-2', type: 'access' },
      ACCESS_SECRET,
      60,
    )
    const first = connect(url, tokenOne)
    const second = connect(url, tokenTwo)
    clients.push(first, second)
    await Promise.all([waitForConnect(first), waitForConnect(second)])

    expect(await subscribe(first, 'not-a-uuid')).toEqual({ ok: false, error: 'INVALID_PAYLOAD' })
    expect(await subscribe(first, FORBIDDEN_PROJECT_ID)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    })

    const firstSubscription = await subscribe(first, ALLOWED_PROJECT_ID)
    expect(firstSubscription).toEqual({ ok: true, onlineUserIds: ['user-1'] })

    const presencePromise = once<PresenceEvent>(first, 'presence.updated')
    const secondSubscription = await subscribe(second, ALLOWED_PROJECT_ID)
    expect(new Set(secondSubscription.onlineUserIds)).toEqual(new Set(['user-1', 'user-2']))
    expect(await presencePromise).toEqual({
      projectId: ALLOWED_PROJECT_ID,
      userId: 'user-2',
      state: 'online',
    })

    const eventPromise = once<ProjectRealtimeEvent>(second, 'task.updated')
    const event: ProjectRealtimeEvent = {
      projectId: ALLOWED_PROJECT_ID,
      actorId: 'user-1',
      entityId: 'task-1',
      taskId: 'task-1',
    }
    realtime.emitToProject(ALLOWED_PROJECT_ID, 'task.updated', event)
    expect(await eventPromise).toEqual(event)

    const offlinePromise = once<PresenceEvent>(first, 'presence.updated')
    second.emit('unsubscribe', { projectId: ALLOWED_PROJECT_ID })
    expect(await offlinePromise).toEqual({
      projectId: ALLOWED_PROJECT_ID,
      userId: 'user-2',
      state: 'offline',
    })
  })

  it('fans out project events and presence across API instances through Redis', async () => {
    const logger = createLogger({ level: 'silent', isProduction: false })
    const config = createConfig(
      parseEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        PORT: '0',
        DATABASE_URL: 'postgresql://orbit:orbit@localhost:5432/orbit_test',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGINS: 'http://localhost:5173',
        JWT_ACCESS_SECRET: ACCESS_SECRET,
      }),
    )
    const redisConnections = ['one-pub', 'one-sub', 'two-pub', 'two-sub'].map((purpose) =>
      createRedisConnection(config.env.REDIS_URL, logger, `test-${purpose}`),
    )
    const [onePublisher, oneSubscriber, twoPublisher, twoSubscriber] = redisConnections
    if (!onePublisher || !oneSubscriber || !twoPublisher || !twoSubscriber) {
      throw new Error('Failed to create realtime test Redis connections')
    }
    await Promise.all(redisConnections.map((connection) => connection.connect()))

    const serverOne = createServer()
    const serverTwo = createServer()
    const serviceOne = new RealtimeService(
      serverOne,
      config,
      logger,
      { canSubscribeToProject },
      createAdapter(onePublisher, oneSubscriber, { publishOnSpecificResponseChannel: true }),
    )
    new RealtimeService(
      serverTwo,
      config,
      logger,
      { canSubscribeToProject },
      createAdapter(twoPublisher, twoSubscriber, { publishOnSpecificResponseChannel: true }),
    )
    await Promise.all([
      new Promise<void>((resolve) => serverOne.listen(0, '127.0.0.1', resolve)),
      new Promise<void>((resolve) => serverTwo.listen(0, '127.0.0.1', resolve)),
    ])

    const addressOne = serverOne.address()
    const addressTwo = serverTwo.address()
    if (
      !addressOne ||
      typeof addressOne === 'string' ||
      !addressTwo ||
      typeof addressTwo === 'string'
    ) {
      throw new Error('Cluster test servers did not bind')
    }
    const first = connect(
      `http://127.0.0.1:${addressOne.port}`,
      signAccessToken(
        { sub: 'cluster-user-1', sessionId: 'cluster-session-1', type: 'access' },
        ACCESS_SECRET,
        60,
      ),
    )
    const second = connect(
      `http://127.0.0.1:${addressTwo.port}`,
      signAccessToken(
        { sub: 'cluster-user-2', sessionId: 'cluster-session-2', type: 'access' },
        ACCESS_SECRET,
        60,
      ),
    )

    try {
      await Promise.all([waitForConnect(first), waitForConnect(second)])
      expect(await subscribe(first, ALLOWED_PROJECT_ID)).toEqual({
        ok: true,
        onlineUserIds: ['cluster-user-1'],
      })

      const presence = once<PresenceEvent>(first, 'presence.updated')
      expect(new Set((await subscribe(second, ALLOWED_PROJECT_ID)).onlineUserIds)).toEqual(
        new Set(['cluster-user-1', 'cluster-user-2']),
      )
      expect(await presence).toMatchObject({ userId: 'cluster-user-2', state: 'online' })

      const delivered = once<ProjectRealtimeEvent>(second, 'task.updated')
      serviceOne.emitToProject(ALLOWED_PROJECT_ID, 'task.updated', {
        projectId: ALLOWED_PROJECT_ID,
        actorId: 'cluster-user-1',
        entityId: 'cluster-task',
        taskId: 'cluster-task',
      })
      expect(await delivered).toMatchObject({ taskId: 'cluster-task' })
    } finally {
      if (first.connected) await unsubscribe(first, ALLOWED_PROJECT_ID)
      if (second.connected) await unsubscribe(second, ALLOWED_PROJECT_ID)
      first.disconnect()
      second.disconnect()
      await Promise.all([
        new Promise<void>((resolve) => serverOne.close(() => resolve())),
        new Promise<void>((resolve) => serverTwo.close(() => resolve())),
      ])
      await Promise.all(redisConnections.map((connection) => connection.quit()))
    }
  })
})
