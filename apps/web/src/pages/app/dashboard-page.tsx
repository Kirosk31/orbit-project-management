import type { NotificationDto, ProjectDto, TaskDto } from '@orbit/shared'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useState, type ReactNode } from 'react'

import { EmptyState, PageContainer, PageHeader, SectionHeader } from '@/components/shared/page'
import { TilePanel } from '@/components/shared/tile-panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnalyticsDashboard } from '@/features/analytics/analytics-dashboard'
import { organizationAnalyticsRequest } from '@/features/analytics/analytics-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { NotificationRow } from '@/features/notification-row'
import { listNotificationsRequest, markReadRequest } from '@/features/notifications-api'
import { listOrganizationsRequest } from '@/features/organizations/org-api'
import { listProjectsRequest } from '@/features/projects/project-api'
import { listProjectTasksRequest } from '@/features/tasks/task-api'
import { DueDate, PriorityMark } from '@/features/tasks/task-meta'
import { readStorageItem, writeStorageItem } from '@/lib/browser-storage'
import { dueStateOf } from '@/lib/due'
import { tilesFromTasks } from '@/lib/tiles'

const WORKSPACE_STORAGE_KEY = 'orbit.dashboard.workspace'
const MAX_PROJECTS = 8

type GroupKey = 'overdue' | 'today' | 'week' | 'later' | 'none'
const GROUP_ORDER: GroupKey[] = ['overdue', 'today', 'week', 'later', 'none']
const GROUP_LABEL = {
  overdue: 'dashboard.groupOverdue',
  today: 'dashboard.groupToday',
  week: 'dashboard.groupWeek',
  later: 'dashboard.groupLater',
  none: 'dashboard.groupNoDate',
} as const

function groupOf(task: TaskDto, now: Date): GroupKey {
  if (!task.dueDate) return 'none'
  const state = dueStateOf(task.dueDate, false, now)
  if (state === 'overdue') return 'overdue'
  if (state === 'today') return 'today'
  return new Date(task.dueDate).getTime() - now.getTime() < 7 * 86_400_000 ? 'week' : 'later'
}

function greetingKey(now: Date) {
  const hour = now.getHours()
  if (hour < 12) return 'dashboard.greetingMorning' as const
  if (hour < 19) return 'dashboard.greetingAfternoon' as const
  return 'dashboard.greetingEvening' as const
}

export function DashboardPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(() =>
    readStorageItem(WORKSPACE_STORAGE_KEY),
  )
  const now = new Date()

  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizationsRequest,
  })
  const organizations = organizationsQuery.data ?? []
  const activeOrg =
    organizations.find((organization) => organization.slug === selectedOrganization) ??
    organizations.find((organization) => !organization.isPersonal) ??
    organizations[0]

  const projectsQuery = useQuery({
    queryKey: ['dashboard', 'projects', activeOrg?.slug],
    queryFn: () => listProjectsRequest(activeOrg!.slug),
    enabled: Boolean(activeOrg),
  })
  const projects = (projectsQuery.data ?? [])
    .filter((project) => !project.isArchived)
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
    .slice(0, MAX_PROJECTS)

  const taskQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ['dashboard', 'project-tasks', project.id],
      queryFn: () => listProjectTasksRequest(project.id, { pageSize: 100 }),
      staleTime: 30_000,
    })),
  })
  const tasksLoading = projectsQuery.isLoading || taskQueries.some((query) => query.isLoading)
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const allTasks = taskQueries.flatMap((query) => query.data?.rows ?? [])
  const myOpenTasks = allTasks.filter(
    (task) =>
      !task.isCompleted &&
      !task.parentId &&
      task.assignees.some((assignee) => assignee.userId === user?.id),
  )
  const groups = GROUP_ORDER.map((key) => ({
    key,
    tasks: myOpenTasks
      .filter((task) => groupOf(task, now) === key)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
  })).filter((group) => group.tasks.length > 0)

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'dashboard'],
    queryFn: () => listNotificationsRequest(1, 5, false),
  })
  const markRead = useMutation({
    mutationFn: (id: string) => markReadRequest(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const openNotification = (notification: NotificationDto): void => {
    if (!notification.isRead) markRead.mutate(notification.id)
    if (notification.linkUrl) navigate(notification.linkUrl)
  }

  const analyticsQuery = useQuery({
    queryKey: ['analytics', activeOrg?.slug, 30],
    queryFn: () => organizationAnalyticsRequest(activeOrg!.slug, 30),
    enabled: Boolean(activeOrg),
    staleTime: 30_000,
  })

  const firstName = user?.fullName.split(' ')[0] ?? ''
  const todayLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

  return (
    <PageContainer width="wide">
      <PageHeader
        title={firstName ? t(greetingKey(now), { name: firstName }) : t('dashboard.title')}
        description={<span className="first-letter:uppercase">{todayLabel}</span>}
        actions={
          organizations.length > 1 ? (
            <Select
              value={activeOrg?.slug}
              onValueChange={(value) => {
                setSelectedOrganization(value)
                writeStorageItem(WORKSPACE_STORAGE_KEY, value)
              }}
            >
              <SelectTrigger className="w-full sm:w-60" aria-label={t('dashboard.activeWorkspace')}>
                <SelectValue placeholder={t('dashboard.selectWorkspace')} />
              </SelectTrigger>
              <SelectContent align="end">
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.slug}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {!organizationsQuery.isLoading && organizations.length === 0 ? (
        <EmptyState
          title={t('dashboard.noOrganizations')}
          action={
            <Button onClick={() => navigate('/app/organizations')}>
              {t('dashboard.createWorkspace')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section aria-labelledby="your-work-heading" className="min-w-0">
            <SectionHeader
              title={<span id="your-work-heading">{t('dashboard.yourWork')}</span>}
              description={
                activeOrg ? t('dashboard.yourWorkHint', { name: activeOrg.name }) : undefined
              }
            />
            {tasksLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-12 w-full" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                compact
                title={t('dashboard.allClear')}
                description={t('dashboard.allClearHint')}
                action={
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/projects')}>
                    {t('dashboard.allProjects')}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-lg border bg-card">
                {groups.map((group) => (
                  <div key={group.key} className="border-b last:border-b-0">
                    <h3
                      className={
                        group.key === 'overdue' || group.key === 'today'
                          ? 'flex h-9 items-center gap-2 bg-[color-mix(in_srgb,var(--ochre)_16%,var(--card))] px-4 text-xs font-semibold text-ochre-ink'
                          : 'flex h-9 items-center gap-2 bg-muted/60 px-4 text-xs font-semibold text-muted-foreground'
                      }
                    >
                      {t(GROUP_LABEL[group.key])}
                      <span className="font-normal tabular-nums">{group.tasks.length}</span>
                    </h3>
                    <ul className="divide-y">
                      {group.tasks.map((task) => (
                        <WorkRow
                          key={task.id}
                          task={task}
                          project={projectById.get(task.projectId)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-10">
            <section aria-labelledby="projects-heading">
              <SectionHeader
                title={<span id="projects-heading">{t('dashboard.projects')}</span>}
                actions={
                  <Button variant="link" size="sm" className="h-auto px-0" asChild>
                    <Link to="/app/projects">
                      {t('dashboard.allProjects')}
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </Button>
                }
              />
              {projectsQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : projects.length === 0 ? (
                <EmptyState
                  compact
                  title={t('dashboard.noProjects')}
                  action={
                    <Button size="sm" onClick={() => navigate('/app/projects')}>
                      {t('dashboard.createProject')}
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-1">
                  {projects.map((project, index) => {
                    const tasks = taskQueries[index]?.data?.rows ?? []
                    const tiles = tilesFromTasks(tasks.filter((task) => !task.parentId))
                    const done = tiles.filter((tile) => tile.state === 'done').length
                    const overdue = tiles.filter((tile) => tile.state === 'overdue').length
                    return (
                      <li key={project.id}>
                        <Link
                          to={`/app/projects/${project.id}`}
                          className="flex flex-col gap-2 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-accent/60"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: project.color }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {project.name}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {tiles.length > 0 ? `${done}/${tiles.length}` : ''}
                            </span>
                          </span>
                          {tiles.length > 0 ? (
                            <TilePanel
                              tiles={tiles}
                              size={10}
                              columns={24}
                              max={48}
                              label={t('dashboard.projectProgressLabel', {
                                name: project.name,
                                done: String(done),
                                total: String(tiles.length),
                                overdue: String(overdue),
                              })}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t('dashboard.noTasksYet')}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent-heading">
              <SectionHeader
                title={<span id="recent-heading">{t('dashboard.recentNotifications')}</span>}
                actions={
                  <Button variant="link" size="sm" className="h-auto px-0" asChild>
                    <Link to="/app/notifications">
                      {t('dashboard.allNotifications')}
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </Button>
                }
              />
              {notificationsQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !notificationsQuery.data || notificationsQuery.data.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.noNotifications')}</p>
              ) : (
                <ul className="-mx-4 divide-y">
                  {notificationsQuery.data.rows.map((notification) => (
                    <li key={notification.id}>
                      <NotificationRow notification={notification} onSelect={openNotification} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {activeOrg ? (
        <div className="mt-14 border-t pt-10">
          <AnalyticsDashboard
            data={analyticsQuery.data}
            isLoading={analyticsQuery.isLoading}
            isError={analyticsQuery.isError}
          />
        </div>
      ) : null}
    </PageContainer>
  )
}

function WorkRow({ task, project }: { task: TaskDto; project: ProjectDto | undefined }): ReactNode {
  const { t } = useTranslation()
  return (
    <li>
      <Link
        to={`/app/tasks/${task.id}`}
        className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors duration-150 hover:bg-accent/60"
      >
        <span className="flex w-4 justify-center">
          <PriorityMark priority={task.priority} />
        </span>
        <span className="min-w-0 flex-1 basis-56 truncate text-sm font-medium">{task.title}</span>
        {project && (
          <span className="inline-flex max-w-44 items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: project.color }}
              aria-hidden="true"
            />
            <span className="truncate">{project.name}</span>
          </span>
        )}
        {task.dueDate ? (
          <DueDate dueDate={task.dueDate} isCompleted={task.isCompleted} className="w-24" />
        ) : (
          <span className="w-24" />
        )}
        {task.isCompleted && (
          <CircleCheckIcon className="size-4 text-success" aria-label={t('tasks.completedState')} />
        )}
      </Link>
    </li>
  )
}
