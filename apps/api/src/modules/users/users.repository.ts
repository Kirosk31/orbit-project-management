import type { PrismaClient, User, UserPreference } from '@prisma/client'
import type { UserPreferencesDto } from '@orbit/shared'

export interface UsersRepository {
  findById(id: string): Promise<User | null>
  updateProfile(id: string, data: { fullName: string; bio: string }): Promise<User>
  getAvatarKey(userId: string): Promise<string | null>
  setAvatarKey(userId: string, key: string): Promise<User>
  clearAvatarKey(userId: string): Promise<User>
  findAccessibleAvatarKey(requesterId: string, targetUserId: string): Promise<string | null>
  findPreferences(userId: string): Promise<UserPreference | null>
  upsertPreferences(userId: string, data: Partial<UserPreferencesDto>): Promise<void>
  searchUsers(input: {
    q: string
    orgId: string
    excludeUserId: string
    skip: number
    take: number
  }): Promise<{ items: User[]; total: number }>
}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  updateProfile(id: string, data: { fullName: string; bio: string }) {
    return this.prisma.user.update({
      where: { id },
      data: { fullName: data.fullName, bio: data.bio === '' ? null : data.bio },
    })
  }

  async getAvatarKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    })
    return user?.avatarKey ?? null
  }

  setAvatarKey(userId: string, key: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { avatarKey: key } })
  }

  clearAvatarKey(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { avatarKey: null } })
  }

  async findAccessibleAvatarKey(requesterId: string, targetUserId: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        isActive: true,
        deletedAt: null,
        avatarKey: { not: null },
        OR: [
          { id: requesterId },
          {
            memberships: {
              some: {
                isActive: true,
                org: {
                  deletedAt: null,
                  members: { some: { userId: requesterId, isActive: true } },
                },
              },
            },
          },
        ],
      },
      select: { avatarKey: true },
    })

    return user?.avatarKey ?? null
  }

  findPreferences(userId: string) {
    return this.prisma.userPreference.findUnique({ where: { userId } })
  }

  async upsertPreferences(userId: string, data: Partial<UserPreferencesDto>): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })
  }

  async searchUsers(input: {
    q: string
    orgId: string
    excludeUserId: string
    skip: number
    take: number
  }): Promise<{ items: User[]; total: number }> {
    const where = {
      id: { not: input.excludeUserId },
      isActive: true,
      deletedAt: null,
      memberships: {
        some: {
          orgId: input.orgId,
          isActive: true,
          org: {
            deletedAt: null,
            members: {
              some: { userId: input.excludeUserId, isActive: true },
            },
          },
        },
      },
      OR: [
        { fullName: { contains: input.q, mode: 'insensitive' as const } },
        { email: { contains: input.q, mode: 'insensitive' as const } },
      ],
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return { items, total }
  }
}
