import { describe, expect, it } from 'vitest'
import { ApiErrorCode } from '@orbit/shared'
import { AppError, isAppError } from '../src/core/errors/index.js'
import { HttpStatus } from '../src/core/http/HttpStatus.js'
import { err, isErr, isOk, ok } from '../src/core/result/Result.js'

describe('AppError', () => {
  it('carries status code, error code and details', () => {
    const error = new AppError(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, 'duplicate', {
      field: 'slug',
    })

    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('CONFLICT')
    expect(error.details).toEqual({ field: 'slug' })
    expect(isAppError(error)).toBe(true)
  })

  it('does not classify plain errors as AppError', () => {
    expect(isAppError(new Error('boom'))).toBe(false)
  })
})

describe('Result', () => {
  it('represents a successful value', () => {
    const result = ok(42)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('represents a failure', () => {
    const result = err<string, string>('something went wrong')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBe('something went wrong')
    }
  })
})
