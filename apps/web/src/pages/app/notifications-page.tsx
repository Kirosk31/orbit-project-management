import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ReactNode } from 'react'

import { EmptyState, PageContainer, PageHeader } from '@/components/shared/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationRow } from '@/features/notification-row'
import {
  listNotificationsRequest,
  markAllReadRequest,
  markReadRequest,
} from '@/features/notifications-api'
import type { NotificationListResult } from '@/features/notifications-api'

const PAGE_SIZE = 20

export function NotificationsPage(): ReactNode {
  const { t } = useTranslation()
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
    <PageContainer width="narrow">
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.subtitle')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllReadMutation.mutate()}
            disabled={markAllReadMutation.status === 'pending' || unreadCount === 0}
          >
            <CheckCheckIcon />
            {t('notifications.markAllRead')}
          </Button>
        }
      />

      <Tabs
        value={unreadOnly ? 'unread' : 'all'}
        onValueChange={(value) => {
          setUnreadOnly(value === 'unread')
          setPage(1)
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">{t('notifications.showAll')}</TabsTrigger>
          <TabsTrigger value="unread">{t('notifications.unreadOnly')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {notificationsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : notifications.length === 0 ? (
        <EmptyState title={t('notifications.empty')} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationRow
                notification={notification}
                onSelect={(selected) => {
                  if (!selected.isRead) void markReadMutation.mutate(selected.id)
                  if (selected.linkUrl) navigate(selected.linkUrl)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNextPage) && (
        <nav
          className="mt-4 flex items-center justify-between gap-2"
          aria-label={t('notifications.title')}
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon />
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('notifications.pageInfo', { page: String(page) })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('common.next')}
            <ChevronRightIcon />
          </Button>
        </nav>
      )}
    </PageContainer>
  )
}
