import 'dotenv/config'
import { z } from 'zod'
import { PLAN_KEYS, type PlanKey } from '@orbit/shared'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string',
    ),
  REDIS_URL: z.url(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Orbit <no-reply@orbit.local>'),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(600),
  RATE_LIMIT_GLOBAL_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_AUTH_WINDOW_SECONDS: z.coerce.number().int().min(1).default(900),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_RECOVERY_MAX: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_APPLICATION_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_INVITATION_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_SEARCH_MAX: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_ANALYTICS_MAX: z.coerce.number().int().min(1).default(30),
  TRUST_PROXY: z
    .string()
    .trim()
    .default('false')
    .refine(
      (value) => !['true', '*'].includes(value.toLowerCase()),
      'TRUST_PROXY must be false or an explicit comma-separated proxy allowlist',
    ),
  EXPOSE_API_DOCS: z.enum(['true', 'false']).optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(7),
  REFRESH_TOKEN_REMEMBER_DAYS: z.coerce.number().int().min(7).default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).default(24),
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().min(1).default(1),
  WEB_APP_URL: z.url().default('http://localhost:5173'),
  OUTBOX_ENCRYPTION_KEY: z.string().trim().default(''),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(20),
  OUTBOX_LOCK_TIMEOUT_SECONDS: z.coerce.number().int().min(10).max(3_600).default(60),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(25).default(8),
  BILLING_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  BILLING_DEFAULT_PLAN_KEY: z
    .enum(PLAN_KEYS as [PlanKey, ...PlanKey[]])
    .optional()
    .default('FREE'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(env)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid environment configuration:\n${issues}`)
  }

  return result.data
}
