import type { PrismaClient, RefreshToken, Session, User } from '@prisma/client'

export interface SessionContext {
  ipAddress?: string
  userAgent?: string
}

export interface CreateSessionInput extends SessionContext {
  userId: string
  expiresAt: Date
}

export interface AuthRepository {
  findByEmail(
    email: string,
  ): Promise<(User & { memberships: Array<{ role: { key: string } }> }) | null>
  findById(id: string): Promise<User | null>
  createUserWithPersonalOrg(input: {
    email: string
    passwordHash: string
    fullName: string
  }): Promise<User>
  updateLastLoginAt(userId: string, at: Date): Promise<void>
  markEmailVerified(userId: string): Promise<void>
  createSession(input: CreateSessionInput): Promise<Session>
  isSessionActive(userId: string, sessionId: string, at: Date): Promise<boolean>
  touchSession(sessionId: string): Promise<void>
  revokeSession(sessionId: string): Promise<void>
  revokeAllSessions(userId: string): Promise<void>
  findRefreshTokenByHash(tokenHash: string): Promise<(RefreshToken & { session: Session }) | null>
  findSuccessorToken(rotatedFromId: string): Promise<RefreshToken | null>
  createRefreshToken(input: {
    userId: string
    sessionId: string
    tokenHash: string
    expiresAt: Date
    rotatedFromId?: string
  }): Promise<RefreshToken>
  revokeRefreshToken(id: string): Promise<void>
  revokeRefreshTokensForSession(sessionId: string): Promise<void>
  markReused(id: string): Promise<void>
  createEmailVerificationToken(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<void>
  invalidatePendingVerificationTokens(userId: string): Promise<void>
  consumeEmailVerificationToken(tokenHash: string): Promise<{ userId: string } | null>
  createPasswordResetToken(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<void>
  consumePasswordResetToken(
    tokenHash: string,
    passwordHash: string,
  ): Promise<{ userId: string } | null>
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { include: { role: { select: { key: true } } } },
      },
    })
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async isSessionActive(userId: string, sessionId: string, at: Date): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: at },
        user: { isActive: true, deletedAt: null },
      },
      select: { id: true },
    })
    return session !== null
  }

  createUserWithPersonalOrg(input: { email: string; passwordHash: string; fullName: string }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
        },
      })

      const ownerRole = await tx.role.findFirstOrThrow({
        where: { orgId: null, key: 'OWNER' },
      })

      const personalOrg = await tx.organization.create({
        data: {
          name: input.fullName,
          slug: `${input.email.split('@')[0]}-personal`,
          ownerId: user.id,
          isPersonal: true,
        },
      })

      await tx.organizationMember.create({
        data: {
          orgId: personalOrg.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      })

      await tx.activityLog.create({
        data: {
          orgId: personalOrg.id,
          actorId: user.id,
          action: 'ORG_CREATED',
          entityType: 'ORGANIZATION',
          entityId: personalOrg.id,
        },
      })

      return user
    })
  }

  async updateLastLoginAt(userId: string, at: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: at },
    })
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    })
  }

  createSession(input: CreateSessionInput) {
    return this.prisma.session.create({
      data: {
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        lastActiveAt: new Date(),
      },
    })
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    })
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    })
  }

  findSuccessorToken(rotatedFromId: string) {
    return this.prisma.refreshToken.findFirst({
      where: { rotatedFromId },
    })
  }

  createRefreshToken(input: {
    userId: string
    sessionId: string
    tokenHash: string
    expiresAt: Date
    rotatedFromId?: string
  }) {
    return this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        rotatedFromId: input.rotatedFromId,
      },
    })
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async revokeRefreshTokensForSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async markReused(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { reusedAt: new Date() },
    })
  }

  async createEmailVerificationToken(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    })
  }

  async invalidatePendingVerificationTokens(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
  }

  async consumeEmailVerificationToken(tokenHash: string): Promise<{ userId: string } | null> {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    })

    if (!token) {
      return null
    }

    return this.prisma.$transaction(async (tx) => {
      const claimedAt = new Date()
      const claim = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: claimedAt } },
        data: { usedAt: claimedAt },
      })
      if (claim.count !== 1) return null

      await tx.user.update({
        where: { id: token.userId },
        data: { isEmailVerified: true },
      })

      return { userId: token.userId }
    })
  }

  async createPasswordResetToken(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    })
  }

  async consumePasswordResetToken(
    tokenHash: string,
    passwordHash: string,
  ): Promise<{ userId: string } | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    })

    if (!token) {
      return null
    }

    return this.prisma.$transaction(async (tx) => {
      const claimedAt = new Date()
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: claimedAt } },
        data: { usedAt: claimedAt },
      })
      if (claim.count !== 1) return null

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      })
      await tx.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: claimedAt },
      })

      return { userId: token.userId }
    })
  }
}
