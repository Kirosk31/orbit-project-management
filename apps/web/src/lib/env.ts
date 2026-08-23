import { z } from 'zod'

/**
 * Validates the public, VITE_-prefixed environment variables at module load.
 * Failing fast here surfaces misconfigured deployments before the UI renders.
 */
const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .refine(
      (value) => value.startsWith('/') || URL.canParse(value),
      'Must be an absolute URL or a root-relative path',
    )
    .default('/api/v1'),
  VITE_APP_NAME: z.string().trim().min(1).default('Orbit'),
})

type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(import.meta.env)
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`,
    )
  }
  return result.data
}

export const env: Env = loadEnv()
