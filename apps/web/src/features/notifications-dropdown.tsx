import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { formatRelativeTime } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  listNotificationsRequest,
  countUnreadRequest,
  markReadRequest,
  markAllReadRequest,
} from '@/features/notifications-api'
import { notificationCopy } from '@/features/notification-copy'

export function NotificationsDropdown(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const countQuery = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => countUnreadRequest(),
    staleTime: 10_000,
  })

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => listNotificationsRequest(1, 20, false),
    enabled: true,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markReadRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => markAllReadRequest(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = countQuery.data?.count ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('notifications.openMenu')}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-0.5 min-w-4 rounded-sm bg-ochre px-1 text-[0.625rem] leading-4 font-semibold text-warning-foreground tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem]">
        <div className="flex items-center justify-between py-1 pr-1 pl-3">
          <p className="text-sm font-semibold">{t('notifications.title')}</p>
          <Button size="sm" variant="ghost" onClick={() => markAll.mutate()}>
            {t('notifications.markAll')}
          </Button>
        </div>
        <div className="max-h-80 overflow-auto">
          {listQuery.isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t('notifications.loading')}
            </div>
          ) : listQuery.data && listQuery.data.rows.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {t('notifications.noNotifications')}
            </div>
          ) : (
            <ul className="flex flex-col">
              {listQuery.data?.rows.map((n) => {
                const copy = notificationCopy(n, t)
                return (
                  <li key={n.id}>
                    <DropdownMenuItem
                      className="flex items-start gap-2.5 px-3 py-2.5"
                      onSelect={() => {
                        if (!n.isRead) markRead.mutate(n.id)
                        if (n.linkUrl) {
                          navigate(n.linkUrl)
                        }
                      }}
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-[2px] ${n.isRead ? 'bg-border' : 'bg-primary'}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={`truncate text-sm ${n.isRead ? 'text-muted-foreground' : 'font-medium'}`}
                          >
                            {copy.title}
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {formatRelativeTime(n.createdAt, i18n.language)}
                          </div>
                        </div>
                        {copy.body ? (
                          <div className="text-muted-foreground text-sm truncate">{copy.body}</div>
                        ) : null}
                      </div>
                    </DropdownMenuItem>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="border-t p-1">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-center"
            onClick={() => navigate('/app/notifications')}
          >
            {t('notifications.viewAll')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
