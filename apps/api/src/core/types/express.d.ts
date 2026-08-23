import type { AuthUser } from '../shared/http/middleware/authenticate.js'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      user?: AuthUser
    }
  }
}

export {}
