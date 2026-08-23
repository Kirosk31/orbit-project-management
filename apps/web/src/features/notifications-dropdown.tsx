import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
        <button type="button" className="relative" aria-label={t('notifications.openMenu')}>
          <BellIcon className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-2 -top-2 rounded-full bg-destructive/90 text-white text-[10px] px-1.5 py-0.5">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px]">
        <div className="flex items-center justify-between px-3 py-2">
          <strong>{t('notifications.title')}</strong>
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
                      className={`flex items-start gap-2 px-3 py-2 ${n.isRead ? 'opacity-70' : ''}`}
                      onSelect={() => {
                        if (!n.isRead) markRead.mutate(n.id)
                        if (n.linkUrl) {
                          navigate(n.linkUrl)
                        }
                      }}
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">N</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">{copy.title}</div>
                          <div className="text-muted-foreground text-xs">
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
        <div className="px-3 py-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/app/notifications')}>
            {t('notifications.viewAll')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
