import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id')

  if (incoming && REQUEST_ID_PATTERN.test(incoming)) {
    req.requestId = incoming
  } else {
    req.requestId = randomUUID()
  }

  res.setHeader('X-Request-Id', req.requestId)
  next()
}
