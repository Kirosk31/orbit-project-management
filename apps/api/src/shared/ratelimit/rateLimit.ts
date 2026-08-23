import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'
import type { Redis } from 'ioredis'
import type { Logger } from '../../core/logger/logger.js'

export interface RateLimitConfig {
  max: number
  windowSeconds: number
}

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Rate limit exceeded')
    this.name = 'RateLimitExceededError'
  }
}

interface LimiterPair {
  redis: RateLimiterRedis
  memory: RateLimiterMemory
}

export interface RateLimitConsumer {
  consume(key: string, config: RateLimitConfig): Promise<void>
}

export class RateLimiterService implements RateLimitConsumer {
  private readonly limiters = new Map<string, LimiterPair>()

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  private getLimiter(key: string, config: RateLimitConfig): LimiterPair {
    const existing = this.limiters.get(key)
    if (existing) {
      return existing
    }

    const limiter = this.createLimiter(key, config)
    this.limiters.set(key, limiter)
    return limiter
  }

  private createLimiter(key: string, config: RateLimitConfig): LimiterPair {
    return {
      redis: new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `rl:${key}:`,
        points: config.max,
        duration: config.windowSeconds,
      }),
      memory: new RateLimiterMemory({
        keyPrefix: `rl:${key}:`,
        points: config.max,
        duration: config.windowSeconds,
      }),
    }
  }

  async consume(key: string, config: RateLimitConfig): Promise<void> {
    const separatorIndex = key.indexOf(':')
    const policyKey = separatorIndex === -1 ? key : key.slice(0, separatorIndex)
    const limiters = this.getLimiter(policyKey, config)

    try {
      await limiters.redis.consume(key)
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        throw new RateLimitExceededError(Math.ceil(error.msBeforeNext / 1000))
      }

      this.logger.warn({ error, policyKey }, 'redis rate limiter unavailable, using memory store')
      try {
        await limiters.memory.consume(key)
      } catch (fallbackError) {
        if (fallbackError instanceof RateLimiterRes) {
          throw new RateLimitExceededError(Math.ceil(fallbackError.msBeforeNext / 1000))
        }
        throw fallbackError
      }
    }
  }
}
