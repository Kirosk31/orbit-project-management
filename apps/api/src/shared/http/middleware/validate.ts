import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { validationError } from '../../../core/errors/index.js'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      next(
        validationError('Invalid request body', {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      )
      return
    }

    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      next(
        validationError('Invalid query parameters', {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      )
      return
    }

    res.locals.validatedQuery = result.data
    next()
  }
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)

    if (!result.success) {
      next(
        validationError('Invalid route parameters', {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      )
      return
    }

    req.params = result.data as Request['params']
    res.locals.validatedParams = result.data
    next()
  }
}
