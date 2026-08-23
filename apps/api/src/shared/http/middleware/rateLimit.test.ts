import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { RateLimitExceededError, type RateLimitConsumer } from '../../ratelimit/rateLimit.js'
import { createRateLimitMiddleware } from './rateLimit.js'

function createContext(): {
  req: Request
  res: Response
  next: NextFunction
  setHeader: ReturnType<typeof vi.fn>
} {
  const setHeader = vi.fn()
  return {
    req: { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as Request,
    res: { setHeader } as unknown as Response,
    next: vi.fn() as NextFunction,
    setHeader,
  }
}

describe('createRateLimitMiddleware', () => {
  it('uses the configured authenticated identity and policy', async () => {
    const rateLimiter: RateLimitConsumer = { consume: vi.fn(async () => undefined) }
    const middleware = createRateLimitMiddleware(
      rateLimiter,
      'avatar-upload',
      { max: 10, windowSeconds: 60 },
      (req) => req.user?.id ?? 'anonymous',
    )
    const context = createContext()

    await middleware(context.req, context.res, context.next)

    expect(rateLimiter.consume).toHaveBeenCalledWith('avatar-upload:user-1', {
      max: 10,
      windowSeconds: 60,
    })
    expect(context.next).toHaveBeenCalledWith()
  })

  it('returns a safe error and Retry-After value when the policy is exhausted', async () => {
    const rateLimiter: RateLimitConsumer = {
      consume: vi.fn(async () => {
        throw new RateLimitExceededError(17)
      }),
    }
    const middleware = createRateLimitMiddleware(rateLimiter, 'search', {
      max: 20,
      windowSeconds: 60,
    })
    const context = createContext()

    await middleware(context.req, context.res, context.next)

    expect(context.setHeader).toHaveBeenCalledWith('Retry-After', '17')
    expect(context.next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOO_MANY_REQUESTS', statusCode: 429 }),
    )
  })
})
