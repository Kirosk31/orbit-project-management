import { parseEnv, type Env } from './env.js'
import type { PlanKey } from '@orbit/shared'

export interface CorsConfig {
  origins: string[]
}

export interface RateLimitConfig {
  max: number
  windowSeconds: number
}

export interface AppConfig {
  env: Env
  isDevelopment: boolean
  isTest: boolean
  isProduction: boolean
  exposeApiDocs: boolean
  trustProxy: false | string[]
  cors: CorsConfig
  rateLimit: {
    global: RateLimitConfig
    auth: {
      login: RateLimitConfig
      register: RateLimitConfig
      refresh: RateLimitConfig
      recovery: RateLimitConfig
      token: RateLimitConfig
    }
    application: {
      invitation: RateLimitConfig
      upload: RateLimitConfig
      search: RateLimitConfig
      analytics: RateLimitConfig
    }
  }
  billing: {
    enabled: boolean
    defaultPlanKey: PlanKey
  }
  outbox: {
    pollIntervalMs: number
    batchSize: number
    lockTimeoutSeconds: number
    maxAttempts: number
  }
}

export function createConfig(env: Env = parseEnv()): AppConfig {
  const isProduction = env.NODE_ENV === 'production'
  if (isProduction && !env.OUTBOX_ENCRYPTION_KEY) {
    throw new Error('OUTBOX_ENCRYPTION_KEY is required in production')
  }
  if (
    env.OUTBOX_ENCRYPTION_KEY &&
    Buffer.from(env.OUTBOX_ENCRYPTION_KEY, 'base64url').length !== 32
  ) {
    throw new Error('OUTBOX_ENCRYPTION_KEY must contain exactly 32 random bytes in base64url form')
  }
  const authWindowSeconds = env.RATE_LIMIT_AUTH_WINDOW_SECONDS
  const applicationWindowSeconds = env.RATE_LIMIT_APPLICATION_WINDOW_SECONDS
  const trustProxy =
    env.TRUST_PROXY.toLowerCase() === 'false' || env.TRUST_PROXY === ''
      ? false
      : env.TRUST_PROXY.split(',')
          .map((value) => value.trim())
          .filter(Boolean)

  return {
    env,
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
    isProduction,
    exposeApiDocs: env.EXPOSE_API_DOCS ? env.EXPOSE_API_DOCS === 'true' : !isProduction,
    trustProxy,
    cors: {
      origins: env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    },
    rateLimit: {
      global: {
        max: env.RATE_LIMIT_GLOBAL_MAX,
        windowSeconds: env.RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
      },
      auth: {
        login: { max: env.RATE_LIMIT_LOGIN_MAX, windowSeconds: authWindowSeconds },
        register: { max: env.RATE_LIMIT_REGISTER_MAX, windowSeconds: authWindowSeconds },
        refresh: { max: env.RATE_LIMIT_REFRESH_MAX, windowSeconds: authWindowSeconds },
        recovery: { max: env.RATE_LIMIT_RECOVERY_MAX, windowSeconds: authWindowSeconds },
        token: { max: env.RATE_LIMIT_AUTH_MAX, windowSeconds: authWindowSeconds },
      },
      application: {
        invitation: {
          max: env.RATE_LIMIT_INVITATION_MAX,
          windowSeconds: applicationWindowSeconds,
        },
        upload: { max: env.RATE_LIMIT_UPLOAD_MAX, windowSeconds: applicationWindowSeconds },
        search: { max: env.RATE_LIMIT_SEARCH_MAX, windowSeconds: applicationWindowSeconds },
        analytics: { max: env.RATE_LIMIT_ANALYTICS_MAX, windowSeconds: applicationWindowSeconds },
      },
    },
    billing: {
      enabled: env.BILLING_ENABLED === 'true',
      defaultPlanKey: env.BILLING_DEFAULT_PLAN_KEY,
    },
    outbox: {
      pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
      batchSize: env.OUTBOX_BATCH_SIZE,
      lockTimeoutSeconds: env.OUTBOX_LOCK_TIMEOUT_SECONDS,
      maxAttempts: env.OUTBOX_MAX_ATTEMPTS,
    },
  }
}
