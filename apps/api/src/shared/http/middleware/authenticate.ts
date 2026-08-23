import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../../../core/security/tokens.js'
import { unauthorized } from '../../../core/errors/index.js'

export interface AuthUser {
  id: string
  sessionId: string
}

const BEARER_PREFIX = 'Bearer '

export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization')

    if (!header?.startsWith(BEARER_PREFIX)) {
      next(unauthorized('Missing Bearer token'))
      return
    }

    const token = header.slice(BEARER_PREFIX.length).trim()
    if (!token) {
      next(unauthorized('Missing Bearer token'))
      return
    }

    try {
      const payload = verifyAccessToken(token, secret)
      req.user = { id: payload.sub, sessionId: payload.sessionId }
      next()
    } catch (error) {
      next(error)
    }
  }
}
