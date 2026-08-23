import bcrypt from 'bcrypt'
import { describe, expect, it } from 'vitest'
import type { Session, RefreshToken } from '@prisma/client'
import type { AppError } from '../src/core/errors/index.js'
import { isAppError } from '../src/core/errors/index.js'
import { createConfig } from '../src/config/index.js'
import { parseEnv } from '../src/config/env.js'
import { createLogger } from '../src/core/logger/logger.js'
import { hashToken } from '../src/core/security/tokens.js'
import type { MailService } from '../src/shared/mail/mail.js'
import { AuthService } from '../src/modules/auth/auth.service.js'
import type {
  AuthRepository,
  CreateSessionInput,
  SessionContext,
} from '../src/modules/auth/auth.repository.js'
import type { User as UserRow } from '@prisma/client'

const env = parseEnv({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: '0',
  DATABASE_URL: 'postgresql://orbit:orbit@localhost:5432/orbit_test',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'test-only-secret-that-is-longer-than-thirty-two-characters',
})

const config = createConfig(env)

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'ada@orbit.app',
    passwordHash: 'hash',
    fullName: 'Ada Lovelace',
    bio: null,
    avatarKey: null,
    isEmailVerified: false,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    ipAddress: null,
    userAgent: null,
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeRefreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'token-1',
    userId: 'user-1',
    sessionId: 'session-1',
    tokenHash: 'abc',
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    rotatedFromId: null,
    reusedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

interface FakeRepository extends AuthRepository {
  users: UserRow[]
  sessions: Session[]
  tokens: RefreshToken[]
  passwordHashes: Map<string, string>
  createdVerificationTokens: number
  createdResetTokens: number
}

function createFakeRepository(): FakeRepository {
  const state: FakeRepository = {
    users: [],
    sessions: [],
    tokens: [],
    passwordHashes: new Map(),
    createdVerificationTokens: 0,
    createdResetTokens: 0,

    async findByEmail(email) {
      const user = this.users.find((u) => u.email === email)
      return user ? { ...user, memberships: [] } : null
    },

    async findById(id) {
      return this.users.find((u) => u.id === id) ?? null
    },

    async createUserWithPersonalOrg(input) {
      const user = makeUser({
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
      })
      this.users.push(user)
      this.passwordHashes.set(user.id, input.passwordHash)
      return user
    },

    async updateLastLoginAt(userId) {
      const user = this.users.find((u) => u.id === userId)
      if (user) {
        user.lastLoginAt = new Date()
      }
    },

    async markEmailVerified(userId) {
      const user = this.users.find((u) => u.id === userId)
      if (user) {
        user.isEmailVerified = true
      }
    },

    async createSession(input: CreateSessionInput) {
      const session = makeSession({
        userId: input.userId,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      })
      this.sessions.push(session)
      return session
    },

    async touchSession(sessionId) {
      const session = this.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.lastActiveAt = new Date()
      }
    },

    async revokeSession(sessionId) {
      const session = this.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.revokedAt = new Date()
      }
    },

    async revokeAllSessionsExcept(userId, keepSessionId) {
      for (const session of this.sessions) {
        if (session.userId === userId && session.id !== keepSessionId && !session.revokedAt) {
          session.revokedAt = new Date()
        }
      }
    },

    async findRefreshTokenByHash(tokenHash) {
      const token = this.tokens.find((t) => t.tokenHash === tokenHash)
      if (!token) {
        return null
      }
      const session = this.sessions.find((s) => s.id === token.sessionId) ?? makeSession()
      return { ...token, session }
    },

    async findSuccessorToken(rotatedFromId) {
      return this.tokens.find((t) => t.rotatedFromId === rotatedFromId) ?? null
    },

    async createRefreshToken(input) {
      const token = makeRefreshToken({
        userId: input.userId,
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        rotatedFromId: input.rotatedFromId ?? null,
      })
      this.tokens.push(token)
      return token
    },

    async revokeRefreshToken(id) {
      const token = this.tokens.find((t) => t.id === id)
      if (token) {
        token.revokedAt = new Date()
      }
    },

    async revokeRefreshTokensForSession(sessionId) {
      for (const token of this.tokens) {
        if (token.sessionId === sessionId && !token.revokedAt) {
          token.revokedAt = new Date()
        }
      }
    },

    async markReused(id) {
      const token = this.tokens.find((t) => t.id === id)
      if (token) {
        token.reusedAt = new Date()
      }
    },

    async createEmailVerificationToken() {
      this.createdVerificationTokens += 1
    },

    async invalidatePendingVerificationTokens() {},

    async consumeEmailVerificationToken(tokenHash) {
      const token = this.tokens.find((t) => t.tokenHash === tokenHash)
      if (!token || token.reusedAt) {
        return null
      }
      token.reusedAt = new Date()
      const user = this.users.find((u) => u.id === token.userId)
      if (user) {
        user.isEmailVerified = true
      }
      return { userId: token.userId }
    },

    async createPasswordResetToken() {
      this.createdResetTokens += 1
    },

    async consumePasswordResetToken(tokenHash, passwordHash) {
      const token = this.tokens.find((t) => t.tokenHash === tokenHash)
      if (!token || token.reusedAt) {
        return null
      }
      token.reusedAt = new Date()
      this.passwordHashes.set(token.userId, passwordHash)
      for (const session of this.sessions) {
        if (session.userId === token.userId && !session.revokedAt) {
          session.revokedAt = new Date()
        }
      }
      return { userId: token.userId }
    },
  }

  return state
}

function createService(repository: FakeRepository): {
  service: AuthService
  mail: MailService & { sent: Array<{ subject: string; to: { address: string } }> }
} {
  const sent: Array<{ subject: string; to: { address: string } }> = []
  const mail: MailService & { sent: typeof sent } = {
    sent,
    async sendMail(options) {
      sent.push({ subject: options.subject, to: options.to })
    },
  }
  const service = new AuthService({
    repository,
    config,
    mailService: mail,
    logger: createLogger({ level: 'silent', isProduction: false }),
  })
  return { service, mail }
}

const context: SessionContext = { ipAddress: '127.0.0.1', userAgent: 'vitest' }

describe('AuthService', () => {
  describe('register', () => {
    it('creates a user, issues a session and sends a verification email', async () => {
      const repository = createFakeRepository()
      const { service, mail } = createService(repository)

      const result = await service.register(
        { email: 'Ada@Orbit.app', password: 'Password123', fullName: '  Ada Lovelace  ' },
        context,
      )

      expect(result.user.email).toBe('ada@orbit.app')
      expect(result.user.fullName).toBe('Ada Lovelace')
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.cookieMaxAgeMs).toBe(7 * 86_400_000)
      expect(mail.sent).toHaveLength(1)
      expect(mail.sent[0]!.subject).toContain('Verify')
      expect(repository.users).toHaveLength(1)
      expect(repository.sessions).toHaveLength(1)
      expect(repository.tokens).toHaveLength(1)
      expect(repository.createdVerificationTokens).toBe(1)
    })

    it('rejects a duplicate email', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser())
      const { service } = createService(repository)

      const error = await service
        .register({ email: 'ada@orbit.app', password: 'Password123', fullName: 'Ada' }, context)
        .catch((e) => e)

      expect(isAppError(error)).toBe(true)
      expect((error as AppError).statusCode).toBe(409)
    })
  })

  describe('login', () => {
    it('signs in with valid credentials', async () => {
      const repository = createFakeRepository()
      const passwordHash = await bcrypt.hash('Password123', 4)
      repository.users.push(makeUser({ passwordHash }))
      const { service } = createService(repository)

      const result = await service.login(
        { email: 'ada@orbit.app', password: 'Password123', rememberMe: false },
        context,
      )

      expect(result.accessToken).toBeTruthy()
      expect(repository.sessions).toHaveLength(1)
      expect(repository.users[0]!.lastLoginAt).toBeTruthy()
    })

    it('extends the session lifetime with rememberMe', async () => {
      const repository = createFakeRepository()
      const passwordHash = await bcrypt.hash('Password123', 4)
      repository.users.push(makeUser({ passwordHash }))
      const { service } = createService(repository)

      const result = await service.login(
        { email: 'ada@orbit.app', password: 'Password123', rememberMe: true },
        context,
      )

      expect(result.cookieMaxAgeMs).toBe(30 * 86_400_000)
    })

    it('rejects wrong passwords without leaking user existence', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser({ passwordHash: await bcrypt.hash('Other123', 4) }))
      const { service } = createService(repository)

      const error = await service
        .login({ email: 'ada@orbit.app', password: 'WrongPass1', rememberMe: false }, context)
        .catch((e) => e)

      expect((error as AppError).statusCode).toBe(401)
    })
  })

  describe('refresh', () => {
    it('rotates the refresh token and returns a fresh session', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser())
      repository.sessions.push(makeSession())
      const original = makeRefreshToken({ tokenHash: hashToken('the-opaque-token') })
      repository.tokens.push(original)
      const { service } = createService(repository)

      const result = await service.refresh('the-opaque-token', context)

      expect(result.accessToken).toBeTruthy()
      expect(repository.tokens).toHaveLength(2)
      expect(repository.tokens[1]!.rotatedFromId).toBe(original.id)
      expect(repository.tokens[0]!.revokedAt).toBeTruthy()
    })

    it('revokes the entire session when a rotated token is replayed', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser())
      const session = makeSession()
      repository.sessions.push(session)
      const stale = makeRefreshToken({
        tokenHash: hashToken('stale'),
        revokedAt: new Date(),
      })
      repository.tokens.push(stale)
      repository.tokens.push(makeRefreshToken({ id: 'token-2', rotatedFromId: stale.id }))
      const { service } = createService(repository)

      const error = await service.refresh('stale', context).catch((e) => e)

      expect((error as AppError).statusCode).toBe(401)
      expect(session.revokedAt).toBeTruthy()
      expect(stale.reusedAt).toBeTruthy()
    })

    it('rejects an unknown refresh token', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser())
      const { service } = createService(repository)

      const error = await service.refresh('unknown-token', context).catch((e) => e)

      expect((error as AppError).statusCode).toBe(401)
    })
  })

  describe('logout', () => {
    it('revokes the token and its session', async () => {
      const repository = createFakeRepository()
      const token = makeRefreshToken({ tokenHash: hashToken('the-opaque-token') })
      repository.tokens.push(token)
      const session = makeSession()
      repository.sessions.push(session)
      const { service } = createService(repository)

      await service.logout('the-opaque-token')

      expect(token.revokedAt).toBeTruthy()
      expect(session.revokedAt).toBeTruthy()
    })

    it('is a no-op when the token is unknown', async () => {
      const repository = createFakeRepository()
      const { service } = createService(repository)

      await expect(service.logout('unknown')).resolves.toBeUndefined()
    })
  })

  describe('verifyEmail', () => {
    it('verifies the email with a valid single-use token', async () => {
      const repository = createFakeRepository()
      const user = makeUser()
      repository.users.push(user)
      const tokenHash = hashToken('verify-token')
      repository.tokens.push(makeRefreshToken({ tokenHash }))
      const { service } = createService(repository)

      await service.verifyEmail('verify-token')

      expect(user.isEmailVerified).toBe(true)
    })

    it('rejects an unknown token', async () => {
      const repository = createFakeRepository()
      const { service } = createService(repository)

      await expect(service.verifyEmail('nope')).rejects.toSatisfy(
        (e: AppError) => e.statusCode === 401,
      )
    })
  })

  describe('forgotPassword / resetPassword', () => {
    it('creates a reset token and sends a reset email', async () => {
      const repository = createFakeRepository()
      repository.users.push(makeUser())
      const { service, mail } = createService(repository)

      await service.forgotPassword('ada@orbit.app')

      expect(repository.createdResetTokens).toBe(1)
      expect(mail.sent[0]!.subject).toContain('Reset')
    })

    it('does not reveal whether an email exists', async () => {
      const repository = createFakeRepository()
      const { service, mail } = createService(repository)

      await service.forgotPassword('ghost@orbit.app')

      expect(repository.createdResetTokens).toBe(0)
      expect(mail.sent).toHaveLength(0)
    })

    it('resets the password and revokes all sessions', async () => {
      const repository = createFakeRepository()
      const user = makeUser()
      repository.users.push(user)
      const session = makeSession()
      repository.sessions.push(session)
      const tokenHash = hashToken('reset-token')
      repository.tokens.push(makeRefreshToken({ tokenHash }))
      const { service } = createService(repository)

      await service.resetPassword('reset-token', 'NewPassword123')

      expect(session.revokedAt).toBeTruthy()
      const newHash = repository.passwordHashes.get(user.id)!
      expect(newHash).not.toBe(user.passwordHash)
      expect(await bcrypt.compare('NewPassword123', newHash)).toBe(true)
    })
  })
})
