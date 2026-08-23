import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, CheckCircle2Icon, InboxIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  listNotificationsRequest,
  markAllReadRequest,
  markReadRequest,
} from '@/features/notifications-api'
import type { NotificationListResult } from '@/features/notifications-api'
import { formatRelativeTime } from '@/lib/utils'
import { notificationCopy } from '@/features/notification-copy'

const PAGE_SIZE = 20

export function NotificationsPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const notificationsQuery = useQuery<NotificationListResult>({
    queryKey: ['notifications', 'page', page, 'unreadOnly', unreadOnly],
    queryFn: () => listNotificationsRequest(page, PAGE_SIZE, unreadOnly),
  })

  const markReadMutation = useMutation({
    mutationFn: markReadRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllReadRequest(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = notificationsQuery.data?.rows ?? []
  const hasNextPage = notifications.length === PAGE_SIZE

  const unreadCount = useMemo(() => {
    if (!notificationsQuery.data) {
      return 0
    }
    return notificationsQuery.data.rows.filter((notification) => !notification.isRead).length
  }, [notificationsQuery.data])

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t('notifications.title')}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{t('notifications.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setUnreadOnly((prev) => !prev)}>
              {unreadOnly ? t('notifications.showAll') : t('notifications.unreadOnly')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void markAllReadMutation.mutate()}
              disabled={markAllReadMutation.status === 'pending' || notifications.length === 0}
            >
              <CheckCircle2Icon className="mr-2 h-4 w-4" />
              {t('notifications.markAllRead')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellIcon className="size-5 text-emerald-500" />
                <CardTitle>{t('notifications.listTitle')}</CardTitle>
              </div>
              <CardDescription>
                {t('notifications.listDescription', { count: unreadCount })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationsQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-20 rounded-xl bg-muted" />
                  <div className="h-20 rounded-xl bg-muted" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="space-y-3 text-center text-sm text-muted-foreground">
                  <InboxIcon className="mx-auto h-10 w-10" />
                  <p>{t('notifications.empty')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const copy = notificationCopy(notification, t)
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        className={`group w-full rounded-xl border p-4 text-left transition ${
                          notification.isRead
                            ? 'border-border bg-background'
                            : 'border-primary/20 bg-primary/5'
                        }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            void markReadMutation.mutate(notification.id)
                          }
                          if (notification.linkUrl) {
                            navigate(notification.linkUrl)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">
                              {copy.title}
                            </p>
                            {copy.body ? (
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {copy.body}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={notification.isRead ? 'secondary' : 'destructive'}>
                            {notification.isRead
                              ? t('notifications.read')
                              : t('notifications.unread')}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{formatRelativeTime(notification.createdAt, i18n.language)}</span>
                          {notification.linkUrl ? (
                            <span className="font-medium text-primary">
                              {t('notifications.open')}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between gap-2 px-4 pb-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t('common.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('notifications.pageInfo').replace('{{page}}', String(page))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.quickActions')}</CardTitle>
              <CardDescription>{t('notifications.quickActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">{t('notifications.filterBy')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.filterByDescription')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">{t('notifications.management')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.managementDescription')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.status === 'pending' || notifications.length === 0}
                >
                  {t('notifications.markAllRead')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
