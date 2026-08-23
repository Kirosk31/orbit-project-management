import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import type { RegisterDto, LoginDto, UserDto } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { conflict, forbidden, unauthorized } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/logger.js'
import { generateOpaqueToken, hashToken, signAccessToken } from '../../core/security/tokens.js'
import type { MailService } from '../../shared/mail/mail.js'
import { createPasswordResetEmail, createVerificationEmail } from '../../shared/mail/templates.js'
import type { AuthRepository, SessionContext } from './auth.repository.js'

const BCRYPT_COST = 12

export interface IssuedSession {
  accessToken: string
  expiresIn: number
  sessionExpiresAt: string
  refreshToken: string
  cookieMaxAgeMs: number
}

export interface AuthResult extends IssuedSession {
  user: UserDto
}

export interface AuthServiceDependencies {
  repository: AuthRepository
  config: AppConfig
  mailService: MailService
  logger: Logger
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async register(dto: RegisterDto, context: SessionContext): Promise<AuthResult> {
    const existing = await this.deps.repository.findByEmail(dto.email.toLowerCase())
    if (existing) {
      throw conflict('An account with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST)
    const user = await this.deps.repository.createUserWithPersonalOrg({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName.trim(),
    })

    const result = await this.issueSession(user.id, false, context)

    await this.sendVerificationEmail(user)

    this.deps.logger.info({ userId: user.id }, 'user registered')

    return { user: this.toUserDto(user), ...result }
  }

  async login(dto: LoginDto, context: SessionContext): Promise<AuthResult> {
    const user = await this.deps.repository.findByEmail(dto.email.toLowerCase())

    const validCredentials = user ? await bcrypt.compare(dto.password, user.passwordHash) : false

    if (!user || !validCredentials) {
      throw unauthorized('Invalid email or password')
    }

    if (!user.isActive) {
      throw forbidden('This account has been deactivated')
    }

    const result = await this.issueSession(user.id, dto.rememberMe, context)
    await this.deps.repository.updateLastLoginAt(user.id, new Date())

    this.deps.logger.info({ userId: user.id }, 'user logged in')

    return { user: this.toUserDto(user), ...result }
  }

  async refresh(refreshToken: string | undefined, context: SessionContext): Promise<AuthResult> {
    if (!refreshToken) {
      throw unauthorized('Missing refresh token')
    }

    const stored = await this.deps.repository.findRefreshTokenByHash(hashToken(refreshToken))

    if (!stored) {
      throw unauthorized('Invalid refresh token')
    }

    const session = stored.session

    if (stored.reusedAt) {
      throw unauthorized('Invalid refresh token')
    }

    const successor = await this.deps.repository.findSuccessorToken(stored.id)

    if (stored.revokedAt || stored.expiresAt < new Date() || session.revokedAt) {
      if (successor) {
        await this.revokeSessionTokens(session.id)
        await this.deps.repository.markReused(stored.id)
        this.deps.logger.warn(
          { sessionId: session.id, userId: session.userId },
          'refresh token reuse detected, session revoked',
        )
      }
      throw unauthorized('Invalid or expired refresh token')
    }

    const user = await this.deps.repository.findById(session.userId)
    if (!user || !user.isActive) {
      throw unauthorized('Account is no longer active')
    }

    const issued = await this.issueSession(user.id, false, context, {
      rotatedFromId: stored.id,
      sessionId: session.id,
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.deps.logger.warn(
          { sessionId: session.id, userId: session.userId },
          'concurrent refresh detected, session revoked',
        )
        void this.revokeSessionTokens(session.id)
        throw unauthorized('Invalid refresh token')
      }
      throw error
    })

    await this.deps.repository.revokeRefreshToken(stored.id)

    this.deps.logger.info({ userId: user.id }, 'refresh token rotated')

    return { user: this.toUserDto(user), ...issued }
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return
    }

    const stored = await this.deps.repository.findRefreshTokenByHash(hashToken(refreshToken))

    if (!stored) {
      return
    }

    await this.deps.repository.revokeRefreshToken(stored.id)
    await this.deps.repository.revokeSession(stored.sessionId)
  }

  async logoutAll(userId: string, keepSessionId: string): Promise<void> {
    await this.deps.repository.revokeAllSessionsExcept(userId, keepSessionId)
  }

  async verifyEmail(token: string): Promise<string> {
    const result = await this.deps.repository.consumeEmailVerificationToken(hashToken(token))
    if (!result) {
      throw unauthorized('Invalid or expired verification link')
    }
    return result.userId
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.deps.repository.findByEmail(email.toLowerCase())

    if (user && !user.isEmailVerified && user.isActive) {
      await this.deps.repository.invalidatePendingVerificationTokens(user.id)
      await this.sendVerificationEmail(user)
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.deps.repository.findByEmail(email.toLowerCase())

    if (user && user.isActive) {
      const token = generateOpaqueToken()
      const expiresAt = new Date(
        Date.now() + this.deps.config.env.PASSWORD_RESET_TTL_HOURS * 3_600_000,
      )

      await this.deps.repository.createPasswordResetToken({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      })

      await this.deps.mailService.sendMail({
        to: { address: user.email, name: user.fullName },
        ...createPasswordResetEmail(
          {
            appUrl: this.deps.config.env.WEB_APP_URL,
            fullName: user.fullName,
          },
          token,
        ),
      })
    }
  }

  async resetPassword(token: string, password: string): Promise<string> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
    const result = await this.deps.repository.consumePasswordResetToken(
      hashToken(token),
      passwordHash,
    )
    if (!result) {
      throw unauthorized('Invalid or expired reset link')
    }
    return result.userId
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.deps.repository.findById(userId)
    if (!user || !user.isActive) {
      throw unauthorized('Account not found or deactivated')
    }
    return this.toUserDto(user)
  }

  private async issueSession(
    userId: string,
    rememberMe: boolean,
    context: SessionContext,
    options?: { rotatedFromId?: string; sessionId?: string },
  ): Promise<IssuedSession> {
    const env = this.deps.config.env
    const ttlDays = rememberMe ? env.REFRESH_TOKEN_REMEMBER_DAYS : env.REFRESH_TOKEN_TTL_DAYS
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000)

    const session = options?.sessionId
      ? { id: options.sessionId }
      : await this.deps.repository.createSession({
          userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          expiresAt,
        })

    if (options?.sessionId) {
      await this.deps.repository.touchSession(options.sessionId)
    }

    const refreshToken = generateOpaqueToken()

    await this.deps.repository.createRefreshToken({
      userId,
      sessionId: session.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      rotatedFromId: options?.rotatedFromId,
    })

    const accessToken = signAccessToken(
      { sub: userId, sessionId: session.id, type: 'access' },
      env.JWT_ACCESS_SECRET,
      env.JWT_ACCESS_TTL_SECONDS,
    )

    return {
      accessToken,
      expiresIn: env.JWT_ACCESS_TTL_SECONDS,
      sessionExpiresAt: expiresAt.toISOString(),
      refreshToken,
      cookieMaxAgeMs: ttlDays * 86_400_000,
    }
  }

  private async revokeSessionTokens(sessionId: string): Promise<void> {
    await this.deps.repository.revokeRefreshTokensForSession(sessionId)
    await this.deps.repository.revokeSession(sessionId)
  }

  private async sendVerificationEmail(user: {
    email: string
    fullName: string
    id: string
  }): Promise<void> {
    const token = generateOpaqueToken()
    const expiresAt = new Date(
      Date.now() + this.deps.config.env.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000,
    )

    await this.deps.repository.createEmailVerificationToken({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    })

    await this.deps.mailService.sendMail({
      to: { address: user.email, name: user.fullName },
      ...createVerificationEmail(
        {
          appUrl: this.deps.config.env.WEB_APP_URL,
          fullName: user.fullName,
        },
        token,
      ),
    })
  }

  private toUserDto(user: {
    id: string
    email: string
    fullName: string
    bio: string | null
    avatarKey: string | null
    isEmailVerified: boolean
    createdAt: Date
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      bio: user.bio,
      avatarKey: user.avatarKey,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
