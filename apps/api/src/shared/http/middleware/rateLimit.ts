import type { NextFunction, Request, Response } from 'express'
import {
  RateLimitExceededError,
  type RateLimitConfig,
  type RateLimitConsumer,
} from '../../ratelimit/rateLimit.js'
import { tooManyRequests } from '../../../core/errors/index.js'

export function createRateLimitMiddleware(
  rateLimiter: RateLimitConsumer,
  keyPrefix: string,
  config: RateLimitConfig,
  identifyRequest: (req: Request) => string = (req) => req.ip ?? 'unknown',
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await rateLimiter.consume(`${keyPrefix}:${identifyRequest(req)}`, config)
      next()
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds))
        next(tooManyRequests())
        return
      }
      next()
    }
  }
}
