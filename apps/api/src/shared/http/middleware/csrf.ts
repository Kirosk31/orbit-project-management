import { randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { forbidden } from '../../../core/errors/index.js'

export const CSRF_COOKIE_NAME = 'orbit_csrf'
export const CSRF_HEADER_NAME = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function csrfTokenHandler(req: Request, res: Response): void {
  const token = randomBytes(32).toString('hex')

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: req.secure,
    sameSite: 'lax',
    path: '/',
  })

  res.json({ data: { csrfToken: token }, requestId: req.requestId })
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.header(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(forbidden('Invalid or missing CSRF token'))
    return
  }

  next()
}
