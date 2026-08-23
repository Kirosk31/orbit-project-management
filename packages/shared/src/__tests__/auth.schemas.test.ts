import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../schemas/auth.schemas.js'

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'ada@lovelace.dev',
      password: 'StrongPass1',
      fullName: 'Ada Lovelace',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a weak password', () => {
    const result = registerSchema.safeParse({
      email: 'ada@lovelace.dev',
      password: 'short',
      fullName: 'Ada Lovelace',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true)
    }
  })

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPass1',
      fullName: 'Ada Lovelace',
    })

    expect(result.success).toBe(false)
  })

  it('trims the full name', () => {
    const result = registerSchema.safeParse({
      email: 'ada@lovelace.dev',
      password: 'StrongPass1',
      fullName: '  Ada Lovelace  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Ada Lovelace')
    }
  })
})

describe('loginSchema', () => {
  it('defaults rememberMe to false', () => {
    const result = loginSchema.safeParse({ email: 'ada@lovelace.dev', password: 'whatever' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rememberMe).toBe(false)
    }
  })

  it('keeps rememberMe when provided', () => {
    const result = loginSchema.safeParse({
      email: 'ada@lovelace.dev',
      password: 'whatever',
      rememberMe: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rememberMe).toBe(true)
    }
  })
})
