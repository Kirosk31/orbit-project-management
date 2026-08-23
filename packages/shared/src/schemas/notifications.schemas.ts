import { z } from 'zod'
import { paginationQuerySchema } from './pagination.schemas.js'

export const notificationTypes = [
  'TASK_ASSIGNED',
  'TASK_MENTIONED',
  'TASK_COMMENTED',
  'TASK_STATUS_CHANGED',
  'TASK_DUE_SOON',
  'INVITATION',
] as const

export const notificationListQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().optional().default(false),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>

export interface NotificationDto {
  id: string
  type: (typeof notificationTypes)[number]
  title: string
  body: string | null
  linkUrl: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationInput {
  userId: string
  orgId: string | null
  type: (typeof notificationTypes)[number]
  title: string
  body?: string
  linkUrl?: string
  metadata?: Record<string, unknown>
}
