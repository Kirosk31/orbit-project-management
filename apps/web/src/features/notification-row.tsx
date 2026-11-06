import type { NotificationDto } from '@orbit/shared'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { notificationCopy } from '@/features/notification-copy'
import { cn, formatRelativeTime } from '@/lib/utils'

interface NotificationRowProps {
  notification: NotificationDto
  onSelect: (notification: NotificationDto) => void
}

/** One notification as a list row: a brand tile marks it unread. */
export function NotificationRow({ notification, onSelect }: NotificationRowProps): ReactNode {
  const { t, i18n } = useTranslation()
  const copy = notificationCopy(notification, t)

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent/60"
    >
      <span
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-[2px]',
          notification.isRead ? 'bg-border' : 'bg-primary',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm',
            notification.isRead ? 'text-muted-foreground' : 'font-medium',
          )}
        >
          {copy.title}
          {!notification.isRead && <span className="sr-only"> ({t('notifications.unread')})</span>}
        </span>
        {copy.body && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{copy.body}</span>
        )}
      </span>
      <time
        dateTime={notification.createdAt}
        className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums"
      >
        {formatRelativeTime(notification.createdAt, i18n.language)}
      </time>
    </button>
  )
}
