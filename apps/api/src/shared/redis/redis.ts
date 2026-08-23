import { Redis } from 'ioredis'
import type { Logger } from '../../core/logger/logger.js'

let redis: Redis | null = null

export function createRedisConnection(url: string, logger: Logger, purpose: string): Redis {
  const connection = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 2_000),
  })

  connection.on('error', (error) => {
    logger.warn({ error, purpose }, 'redis client error')
  })

  return connection
}

export function getRedis(url: string, logger: Logger): Redis {
  redis ??= createRedisConnection(url, logger, 'application')

  return redis
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
