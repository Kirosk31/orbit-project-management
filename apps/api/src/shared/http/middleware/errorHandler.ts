import { ApiErrorCode, type ApiErrorBody } from '@orbit/shared'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import type { Logger } from '../../../core/logger/logger.js'
import { isAppError } from '../../../core/errors/index.js'
import { HttpStatus } from '../../../core/http/HttpStatus.js'

interface ZodIssueShape {
  path: string
  message: string
}

function formatZodIssues(error: ZodError): ZodIssueShape[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export function createErrorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.requestId

    let statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
    let code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR
    let message = 'An unexpected error occurred'
    let details: unknown

    if (isAppError(error)) {
      statusCode = error.statusCode
      code = error.code
      message = error.message
      details = error.details
    } else if (error instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST
      code = ApiErrorCode.VALIDATION_ERROR
      message = 'Invalid request payload'
      details = formatZodIssues(error)
    } else if (error instanceof SyntaxError && 'body' in error) {
      statusCode = HttpStatus.BAD_REQUEST
      code = ApiErrorCode.BAD_REQUEST
      message = 'Malformed JSON in request body'
    } else if (error instanceof multer.MulterError) {
      statusCode =
        error.code === 'LIMIT_FILE_SIZE' ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST
      code =
        error.code === 'LIMIT_FILE_SIZE' ? ApiErrorCode.PAYLOAD_TOO_LARGE : ApiErrorCode.BAD_REQUEST
      message = error.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Invalid file upload'
    } else {
      logger.error({ err: error, requestId }, 'unhandled error')
    }

    const body: ApiErrorBody = {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    }

    res.status(statusCode).json(body)
  }
}
