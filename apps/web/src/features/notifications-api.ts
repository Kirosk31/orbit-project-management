import type { NotificationDto } from '@orbit/shared'
import { api } from '@/lib/api'

export interface NotificationListResult {
  rows: NotificationDto[]
  total: number
}

export function listNotificationsRequest(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
): Promise<NotificationListResult> {
  return api.get<NotificationListResult>('/notifications', {
    params: { page, pageSize, unreadOnly },
  })
}

export function countUnreadRequest(): Promise<{ count: number }> {
  return api.get<{ count: number }>('/notifications/count')
}

export function markReadRequest(notificationId: string): Promise<NotificationDto> {
  return api.patch<NotificationDto>(`/notifications/${notificationId}/read`)
}

export function markAllReadRequest(): Promise<{ marked: number }> {
  return api.post<{ marked: number }>('/notifications/read-all')
}
