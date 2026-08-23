import type { Prisma } from '@prisma/client'
import type { NotificationDto, NotificationInput, NotificationListQuery } from '@orbit/shared'
import { toPaginationParams } from '@orbit/shared'
import { notFound } from '../../core/errors/index.js'
import type { NotificationsRepository } from './notifications.repository.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export interface NotificationsServiceDependencies {
  repository: NotificationsRepository
  realtime?: RealtimePublisher
}

export class NotificationsService {
  private realtime?: RealtimePublisher

  constructor(private readonly deps: NotificationsServiceDependencies) {
    this.realtime = deps.realtime
  }

  setRealtimeService(realtime: RealtimePublisher): void {
    this.realtime = realtime
  }

  private resolveActorName(actorName?: string): string {
    return actorName?.trim() || 'Someone'
  }

  async list(userId: string, query: NotificationListQuery): Promise<NotificationListResult> {
    const { skip, take } = toPaginationParams(query)
    const result = await this.deps.repository.listForUser(userId, {
      skip,
      take,
      unreadOnly: query.unreadOnly,
    })
    return { rows: result.rows.map(toNotificationDto), total: result.total }
  }

  async unreadCount(userId: string): Promise<number> {
    return this.deps.repository.countUnread(userId)
  }

  private async emitNotificationUpdated(userId: string): Promise<void> {
    if (!this.realtime) {
      return
    }

    const unreadCount = await this.deps.repository.countUnread(userId)
    this.realtime.emitToUser(userId, 'notifications.updated', { unreadCount })
  }

  async markRead(notificationId: string, userId: string): Promise<NotificationDto> {
    const row = await this.deps.repository.findById(notificationId)
    if (!row || row.userId !== userId) {
      throw notFound('Notification not found')
    }
    const updated = await this.deps.repository.markRead(notificationId, userId)
    await this.emitNotificationUpdated(userId)
    return toNotificationDto({
      ...row,
      isRead: updated?.isRead ?? row.isRead,
      readAt: updated?.readAt ?? row.readAt,
    })
  }

  async markAllRead(userId: string): Promise<{ marked: number }> {
    const marked = await this.deps.repository.markAllRead(userId)
    await this.emitNotificationUpdated(userId)
    return { marked }
  }

  async taskAssigned(input: {
    orgId: string
    taskId: string
    taskTitle: string
    actorName?: string
    userId: string
  }): Promise<void> {
    const actorName = this.resolveActorName(input.actorName)
    await this.deps.repository.createMany([
      {
        userId: input.userId,
        orgId: input.orgId,
        type: 'TASK_ASSIGNED',
        title: 'You were assigned a task',
        body: `${actorName} assigned you to "${input.taskTitle}"`,
        linkUrl: `/app/tasks/${input.taskId}`,
        metadata: { taskId: input.taskId, taskTitle: input.taskTitle, actorName },
      },
    ])
    await this.emitNotificationUpdated(input.userId)
  }

  async taskStatusChanged(input: {
    orgId: string
    taskId: string
    taskTitle: string
    actorName?: string
    userId: string
    statusName: string
  }): Promise<void> {
    const actorName = this.resolveActorName(input.actorName)
    await this.deps.repository.createMany([
      {
        userId: input.userId,
        orgId: input.orgId,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task status changed',
        body: `${actorName} moved "${input.taskTitle}" to ${input.statusName}`,
        linkUrl: `/app/tasks/${input.taskId}`,
        metadata: {
          taskId: input.taskId,
          taskTitle: input.taskTitle,
          statusName: input.statusName,
          actorName,
        },
      },
    ])
    await this.emitNotificationUpdated(input.userId)
  }

  async taskMentioned(input: {
    orgId: string
    taskId: string
    taskTitle: string
    actorName?: string
    userId: string
  }): Promise<void> {
    const actorName = this.resolveActorName(input.actorName)
    await this.deps.repository.createMany([
      {
        userId: input.userId,
        orgId: input.orgId,
        type: 'TASK_MENTIONED',
        title: 'You were mentioned',
        body: `${actorName} mentioned you in "${input.taskTitle}"`,
        linkUrl: `/app/tasks/${input.taskId}`,
        metadata: { taskId: input.taskId, taskTitle: input.taskTitle, actorName },
      },
    ])
    await this.emitNotificationUpdated(input.userId)
  }

  async taskCommented(input: {
    orgId: string
    taskId: string
    taskTitle: string
    actorName?: string
    userId: string
  }): Promise<void> {
    const actorName = this.resolveActorName(input.actorName)
    await this.deps.repository.createMany([
      {
        userId: input.userId,
        orgId: input.orgId,
        type: 'TASK_COMMENTED',
        title: 'New comment on your task',
        body: `${actorName} commented on "${input.taskTitle}"`,
        linkUrl: `/app/tasks/${input.taskId}`,
        metadata: { taskId: input.taskId, taskTitle: input.taskTitle, actorName },
      },
    ])
    await this.emitNotificationUpdated(input.userId)
  }

  async invitation(input: {
    orgId: string
    orgName: string
    inviterName: string
    userId: string
  }): Promise<void> {
    await this.deps.repository.createMany([
      {
        userId: input.userId,
        orgId: input.orgId,
        type: 'INVITATION',
        title: `Invitation to ${input.orgName}`,
        body: `${input.inviterName} invited you to join ${input.orgName}`,
        linkUrl: '/app/organizations',
        metadata: {
          orgId: input.orgId,
          orgName: input.orgName,
          inviterName: input.inviterName,
        },
      },
    ])
    await this.emitNotificationUpdated(input.userId)
  }
}

export interface NotificationListResult {
  rows: NotificationDto[]
  total: number
}

function toNotificationDto(row: {
  id: string
  type: NotificationInput['type']
  title: string
  body: string | null
  linkUrl: string | null
  metadata: Prisma.JsonValue | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}): NotificationDto {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkUrl: row.linkUrl,
    metadata,
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}
