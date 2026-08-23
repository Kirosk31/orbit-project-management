import cors from 'cors'
import type { CorsConfig } from '../../../config/index.js'
import { forbidden } from '../../../core/errors/index.js'

export function createCorsMiddleware(config: CorsConfig) {
  return cors({
    origin: (origin, callback) => {
      if (!origin || config.origins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(forbidden(`Origin ${origin} is not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
}
