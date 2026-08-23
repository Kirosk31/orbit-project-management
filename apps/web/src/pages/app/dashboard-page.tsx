import { useQuery } from '@tanstack/react-query'
import { BellIcon, Building2Icon, FolderKanbanIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useState, type ReactNode } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { listNotificationsRequest, countUnreadRequest } from '@/features/notifications-api'
import { listOrganizationsRequest } from '@/features/organizations/org-api'
import { listProjectsRequest } from '@/features/projects/project-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { formatRelativeTime, initialsOf } from '@/lib/utils'
import { notificationCopy } from '@/features/notification-copy'
import { AnalyticsDashboard } from '@/features/analytics/analytics-dashboard'
import { organizationAnalyticsRequest } from '@/features/analytics/analytics-api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function DashboardPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null)

  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizationsRequest,
  })

  const activeOrg =
    organizationsQuery.data?.find((organization) => organization.slug === selectedOrganization) ??
    organizationsQuery.data?.[0]

  const projectsQuery = useQuery({
    queryKey: ['dashboard', 'projects', activeOrg?.slug],
    queryFn: () => listProjectsRequest(activeOrg!.slug),
    enabled: Boolean(activeOrg),
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'dashboard'],
    queryFn: () => listNotificationsRequest(1, 5, false),
  })

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: countUnreadRequest,
    staleTime: 10_000,
  })

  const analyticsQuery = useQuery({
    queryKey: ['analytics', activeOrg?.slug, 30],
    queryFn: () => organizationAnalyticsRequest(activeOrg!.slug, 30),
    enabled: Boolean(activeOrg),
    staleTime: 30_000,
  })

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
              <Badge variant="secondary">{user?.fullName ?? t('dashboard.welcome')}</Badge>
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              {t('dashboard.subtitle')}
            </p>
          </div>
          {organizationsQuery.data && organizationsQuery.data.length > 0 ? (
            <div className="space-y-1">
              <label htmlFor="dashboard-workspace" className="text-muted-foreground text-xs">
                {t('dashboard.activeWorkspace')}
              </label>
              <Select
                value={activeOrg?.slug}
                onValueChange={(value) => setSelectedOrganization(value)}
              >
                <SelectTrigger id="dashboard-workspace" className="w-full sm:w-56">
                  <SelectValue placeholder={t('dashboard.selectWorkspace')} />
                </SelectTrigger>
                <SelectContent>
                  {organizationsQuery.data.map((organization) => (
                    <SelectItem key={organization.id} value={organization.slug}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2Icon className="size-5 text-primary" />
                <CardTitle>{t('dashboard.organizations')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold">{organizationsQuery.data?.length ?? 0}</p>
              <CardDescription>
                {organizationsQuery.isLoading
                  ? t('common.loading')
                  : organizationsQuery.data?.length
                    ? t('dashboard.organizationsHint')
                    : t('dashboard.noOrganizations')}
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/app/organizations')}>
                  {t('dashboard.openOrganizations')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderKanbanIcon className="size-5 text-secondary" />
                <CardTitle>{t('dashboard.projects')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold">{projectsQuery.data?.length ?? 0}</p>
              <CardDescription>
                {projectsQuery.isLoading
                  ? t('common.loading')
                  : activeOrg
                    ? t('dashboard.projectsInWorkspace').replace('{{name}}', activeOrg.name)
                    : t('dashboard.noProjects')}
              </CardDescription>
              {activeOrg ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/organizations/${activeOrg.slug}`)}
                  >
                    {t('dashboard.viewWorkspace')}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellIcon className="size-5 text-amber-500" />
                <CardTitle>{t('dashboard.notifications')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold">{unreadCountQuery.data?.count ?? 0}</p>
              <CardDescription>
                {unreadCountQuery.isLoading
                  ? t('common.loading')
                  : t('dashboard.unreadNotifications')}
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/app/notifications')}>
                  {t('dashboard.viewNotifications')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeOrg ? (
          <AnalyticsDashboard
            data={analyticsQuery.data}
            isLoading={analyticsQuery.isLoading}
            isError={analyticsQuery.isError}
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentNotifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              {notificationsQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              ) : !notificationsQuery.data || notificationsQuery.data.rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('dashboard.noNotifications')}</p>
              ) : (
                <div className="space-y-3">
                  {notificationsQuery.data.rows.map((notification) => {
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
                          if (notification.linkUrl) {
                            navigate(notification.linkUrl)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{copy.title}</p>
                            {copy.body ? (
                              <p className="truncate text-sm text-muted-foreground">{copy.body}</p>
                            ) : null}
                          </div>
                          <Badge variant={notification.isRead ? 'secondary' : 'destructive'}>
                            {notification.isRead
                              ? t('notifications.read')
                              : t('notifications.unread')}
                          </Badge>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt, i18n.language)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.organizations')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {organizationsQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ) : organizationsQuery.data && organizationsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {organizationsQuery.data.slice(0, 3).map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/50"
                      onClick={() => navigate(`/app/organizations/${org.slug}`)}
                    >
                      <Avatar className="size-10">
                        <AvatarFallback>{initialsOf(org.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{org.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{org.description}</p>
                      </div>
                    </button>
                  ))}
                  {organizationsQuery.data.length > 3 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/app/organizations')}
                    >
                      {t('dashboard.viewAllOrganizations')}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t('dashboard.noOrganizations')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
