import { ApiErrorCode } from '@orbit/shared'
import { HttpStatus } from '../http/HttpStatus.js'
import { AppError } from './AppError.js'

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, message, details)
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, message, details)
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, message)
}

export function forbidden(message = 'You do not have permission to perform this action'): AppError {
  return new AppError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, message)
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, message)
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, message, details)
}

export function tooManyRequests(message = 'Too many requests, please try again later'): AppError {
  return new AppError(HttpStatus.TOO_MANY_REQUESTS, ApiErrorCode.TOO_MANY_REQUESTS, message)
}

export function payloadTooLarge(message = 'Payload too large'): AppError {
  return new AppError(HttpStatus.PAYLOAD_TOO_LARGE, ApiErrorCode.PAYLOAD_TOO_LARGE, message)
}

export { AppError, isAppError } from './AppError.js'
