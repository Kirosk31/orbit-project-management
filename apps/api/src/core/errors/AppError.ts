import type { ApiErrorCode } from '@orbit/shared'
import type { HttpStatus } from '../http/HttpStatus.js'

export class AppError extends Error {
  readonly statusCode: HttpStatus
  readonly code: ApiErrorCode
  readonly details?: unknown

  constructor(statusCode: HttpStatus, code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
