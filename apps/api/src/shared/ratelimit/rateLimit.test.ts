import { Redis } from 'ioredis'
import { afterEach, describe, expect, it } from 'vitest'
import { createLogger } from '../../core/logger/logger.js'
import { RateLimitExceededError, RateLimiterService } from './rateLimit.js'

describe('RateLimiterService', () => {
  let redis: Redis | undefined

  afterEach(() => {
    redis?.disconnect()
    redis = undefined
  })

  it('enforces an in-memory policy when Redis is unavailable', async () => {
    redis = new Redis({
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
    })
    const service = new RateLimiterService(
      redis,
      createLogger({ level: 'silent', isProduction: false }),
    )
    const policy = { max: 1, windowSeconds: 60 }

    await expect(service.consume('auth-login:127.0.0.1', policy)).resolves.toBeUndefined()
    await expect(service.consume('auth-login:127.0.0.1', policy)).rejects.toBeInstanceOf(
      RateLimitExceededError,
    )
  })
})
