import type { NotificationDto } from '@orbit/shared'
import type { TFunction } from 'i18next'

function metadataValue(notification: NotificationDto, key: string, fallback: string): string {
  const value = notification.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function notificationCopy(
  notification: NotificationDto,
  t: TFunction,
): { title: string; body: string | null } {
  const actorName = metadataValue(notification, 'actorName', t('notifications.someone'))
  const taskTitle = metadataValue(notification, 'taskTitle', t('notifications.aTask'))

  switch (notification.type) {
    case 'TASK_ASSIGNED':
      return {
        title: t('notifications.copyTaskAssignedTitle'),
        body: t('notifications.copyTaskAssignedBody', { actorName, taskTitle }),
      }
    case 'TASK_MENTIONED':
      return {
        title: t('notifications.copyTaskMentionedTitle'),
        body: t('notifications.copyTaskMentionedBody', { actorName, taskTitle }),
      }
    case 'TASK_COMMENTED':
      return {
        title: t('notifications.copyTaskCommentedTitle'),
        body: t('notifications.copyTaskCommentedBody', { actorName, taskTitle }),
      }
    case 'TASK_STATUS_CHANGED':
      return {
        title: t('notifications.copyTaskStatusTitle'),
        body: t('notifications.copyTaskStatusBody', {
          actorName,
          taskTitle,
          statusName: metadataValue(notification, 'statusName', t('notifications.updatedStatus')),
        }),
      }
    case 'TASK_DUE_SOON':
      return {
        title: t('notifications.copyTaskDueSoonTitle'),
        body: t('notifications.copyTaskDueSoonBody', { taskTitle }),
      }
    case 'INVITATION': {
      const orgName = metadataValue(notification, 'orgName', t('notifications.anOrganization'))
      return {
        title: t('notifications.copyInvitationTitle', { orgName }),
        body: t('notifications.copyInvitationBody', {
          inviterName: metadataValue(notification, 'inviterName', actorName),
          orgName,
        }),
      }
    }
    default:
      return { title: notification.title, body: notification.body }
  }
}
