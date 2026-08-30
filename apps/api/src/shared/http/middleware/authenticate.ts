import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../../../core/security/tokens.js'
import { unauthorized } from '../../../core/errors/index.js'

export interface AuthUser {
  id: string
  sessionId: string
}

const BEARER_PREFIX = 'Bearer '

export interface AccessSessionValidator {
  isSessionActive(userId: string, sessionId: string): Promise<boolean>
}

export function requireAuth(secret: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const validator = req.app.locals.accessSessionValidator as AccessSessionValidator | undefined
      if (!validator || !(await validator.isSessionActive(payload.sub, payload.sessionId))) {
        next(unauthorized('Invalid or expired session'))
        return
      }
      req.user = { id: payload.sub, sessionId: payload.sessionId }
      next()
    } catch (error) {
      next(error)
    }
  }
}
