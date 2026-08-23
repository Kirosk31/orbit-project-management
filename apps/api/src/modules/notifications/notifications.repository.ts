import type { Notification, PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { NotificationInput } from '@orbit/shared'

export interface NotificationRow extends Notification {
  orgName: string | null
}

export interface NotificationsRepository {
  listForUser(
    userId: string,
    options: { skip: number; take: number; unreadOnly: boolean },
  ): Promise<{ rows: NotificationRow[]; total: number }>
  countUnread(userId: string): Promise<number>
  findById(id: string): Promise<NotificationRow | null>
  markRead(id: string, userId: string): Promise<{ isRead: boolean; readAt: Date } | null>
  markAllRead(userId: string): Promise<number>
  createMany(inputs: NotificationInput[]): Promise<void>
}

function toRow(notification: Notification & { org: { name: string } | null }): NotificationRow {
  return { ...notification, orgName: notification.org?.name ?? null }
}

export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listForUser(
    userId: string,
    options: { skip: number; take: number; unreadOnly: boolean },
  ): Promise<{ rows: NotificationRow[]; total: number }> {
    const where = { userId, ...(options.unreadOnly ? { isRead: false } : {}) }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: { org: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.notification.count({ where }),
    ])
    return { rows: rows.map(toRow), total }
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } })
  }

  async findById(id: string): Promise<NotificationRow | null> {
    const row = await this.prisma.notification.findUnique({
      where: { id },
      include: { org: { select: { name: true } } },
    })
    return row ? toRow(row) : null
  }

  async markRead(id: string, userId: string): Promise<{ isRead: boolean; readAt: Date } | null> {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    })
    return updated.count > 0 ? { isRead: true, readAt: new Date() } : null
  }

  async markAllRead(userId: string): Promise<number> {
    const updated = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return updated.count
  }

  async createMany(inputs: NotificationInput[]): Promise<void> {
    if (inputs.length === 0) {
      return
    }
    await this.prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        orgId: input.orgId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    })
  }
}
