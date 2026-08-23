import { ApiErrorCode, type ApiErrorBody } from '@orbit/shared'
import type { NextFunction, Request, Response } from 'express'

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const body: ApiErrorBody = {
    error: {
      code: ApiErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  }

  res.status(404).json(body)
}
