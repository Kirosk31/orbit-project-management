import { describe, expect, it } from 'vitest'
import { parseEnv } from './env.js'
import { createConfig } from './index.js'

function validEnv(overrides: Record<string, string> = {}) {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://orbit:orbit@localhost:5432/orbit_test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'test-only-secret-that-is-longer-than-thirty-two-characters',
    ...overrides,
  }
}

describe('application configuration', () => {
  it('does not trust forwarded addresses by default', () => {
    const config = createConfig(parseEnv(validEnv()))

    expect(config.trustProxy).toBe(false)
  })

  it('accepts an explicit proxy allowlist', () => {
    const config = createConfig(
      parseEnv(validEnv({ TRUST_PROXY: 'loopback, linklocal, uniquelocal' })),
    )

    expect(config.trustProxy).toEqual(['loopback', 'linklocal', 'uniquelocal'])
  })

  it.each(['true', '*'])('rejects an unsafe broad proxy trust value: %s', (trustProxy) => {
    expect(() => parseEnv(validEnv({ TRUST_PROXY: trustProxy }))).toThrow(
      'TRUST_PROXY must be false or an explicit comma-separated proxy allowlist',
    )
  })

  it('hides API documentation by default in production', () => {
    const config = createConfig(
      parseEnv(
        validEnv({
          NODE_ENV: 'production',
          OUTBOX_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
        }),
      ),
    )

    expect(config.exposeApiDocs).toBe(false)
  })

  it('requires a dedicated outbox encryption key in production', () => {
    expect(() => createConfig(parseEnv(validEnv({ NODE_ENV: 'production' })))).toThrow(
      'OUTBOX_ENCRYPTION_KEY is required in production',
    )
  })

  it('rejects an outbox encryption key with the wrong length', () => {
    expect(() => createConfig(parseEnv(validEnv({ OUTBOX_ENCRYPTION_KEY: 'too-short' })))).toThrow(
      'OUTBOX_ENCRYPTION_KEY must contain exactly 32 random bytes in base64url form',
    )
  })

  it('uses independent authentication rate-limit policies', () => {
    const config = createConfig(
      parseEnv(
        validEnv({
          RATE_LIMIT_LOGIN_MAX: '7',
          RATE_LIMIT_REGISTER_MAX: '3',
          RATE_LIMIT_REFRESH_MAX: '40',
          RATE_LIMIT_RECOVERY_MAX: '4',
        }),
      ),
    )

    expect(config.rateLimit.auth).toMatchObject({
      login: { max: 7 },
      register: { max: 3 },
      refresh: { max: 40 },
      recovery: { max: 4 },
    })
  })

  it('uses independent application abuse-control policies', () => {
    const config = createConfig(
      parseEnv(
        validEnv({
          RATE_LIMIT_APPLICATION_WINDOW_SECONDS: '120',
          RATE_LIMIT_INVITATION_MAX: '9',
          RATE_LIMIT_UPLOAD_MAX: '4',
          RATE_LIMIT_SEARCH_MAX: '30',
          RATE_LIMIT_ANALYTICS_MAX: '12',
        }),
      ),
    )

    expect(config.rateLimit.application).toEqual({
      invitation: { max: 9, windowSeconds: 120 },
      upload: { max: 4, windowSeconds: 120 },
      search: { max: 30, windowSeconds: 120 },
      analytics: { max: 12, windowSeconds: 120 },
    })
  })
})
