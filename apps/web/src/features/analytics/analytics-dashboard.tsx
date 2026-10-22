import type { OrganizationAnalyticsDto } from '@orbit/shared'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveFormattingLocale } from '@orbit/shared'

interface AnalyticsDashboardProps {
  data?: OrganizationAnalyticsDto
  isLoading: boolean
  isError: boolean
}

const chartTooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--popover-foreground)',
}

export function AnalyticsDashboard({
  data,
  isLoading,
  isError,
}: AnalyticsDashboardProps): ReactNode {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <section aria-label={t('analytics.title')} className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </section>
    )
  }

  if (isError || !data) {
    return (
      <Card role="alert">
        <CardHeader>
          <CardTitle>{t('analytics.unavailable')}</CardTitle>
          <CardDescription>{t('analytics.unavailableDescription')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(resolveFormattingLocale(i18n.language), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const trend = data.trend.map((point) => ({
    ...point,
    displayDate: dateFormatter.format(new Date(`${point.date}T00:00:00.000Z`)),
  }))
  const hours = new Intl.NumberFormat(resolveFormattingLocale(i18n.language), {
    maximumFractionDigits: 1,
  }).format(data.summary.trackedSeconds / 3_600)
  const summaryCards = [
    {
      label: t('analytics.totalTasks'),
      value: data.summary.totalTasks,
      detail: t('analytics.openTasks', { count: data.summary.openTasks }),
      attention: false,
    },
    {
      label: t('analytics.completed'),
      value: data.summary.completedInPeriod,
      detail: t('analytics.completionRate', { rate: String(data.summary.completionRate) }),
      attention: false,
    },
    {
      label: t('analytics.overdue'),
      value: data.summary.overdueTasks,
      detail: t('analytics.requiresAttention'),
      attention: data.summary.overdueTasks > 0,
    },
    {
      label: t('analytics.trackedTime'),
      value: `${hours}h`,
      detail: t('analytics.periodDays', { count: data.period.days }),
      attention: false,
    },
  ]

  return (
    <section aria-labelledby="analytics-heading" className="space-y-4">
      <div>
        <h2 id="analytics-heading" className="text-base font-semibold">
          {t('analytics.title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('analytics.subtitle', { count: data.period.days })}
        </p>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card xl:grid-cols-4">
        {summaryCards.map(({ label, value, detail, attention }) => (
          <div
            key={label}
            className="border-b px-5 py-4 even:border-l xl:border-b-0 xl:border-l xl:first:border-l-0"
          >
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd
              className={`mt-1 text-2xl font-semibold tabular-nums ${attention ? 'text-ochre-ink' : ''}`}
            >
              {value}
            </dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.velocityAndBurndown')}</CardTitle>
            <CardDescription>{t('analytics.velocityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72" role="img" aria-label={t('analytics.velocityChartLabel')}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Area
                    dataKey="remaining"
                    name={t('analytics.remaining')}
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="completed"
                    name={t('analytics.completed')}
                    stroke="var(--chart-2)"
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="created"
                    name={t('analytics.created')}
                    stroke="var(--chart-3)"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.teamWorkload')}</CardTitle>
            <CardDescription>{t('analytics.workloadDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.workload.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('analytics.noWorkload')}</p>
            ) : (
              <div className="h-72" role="img" aria-label={t('analytics.workloadChartLabel')}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.workload.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      horizontal={false}
                    />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="fullName" type="category" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Bar
                      dataKey="openTasks"
                      name={t('analytics.open')}
                      fill="var(--chart-1)"
                      radius={[0, 2, 2, 0]}
                    />
                    <Bar
                      dataKey="overdueTasks"
                      name={t('analytics.overdue')}
                      fill="var(--ochre)"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.projectProgress')}</CardTitle>
          <CardDescription>{t('analytics.projectProgressDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.projectProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('analytics.noProjects')}</p>
          ) : (
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              {data.projectProgress.map((project) => (
                <div key={project.projectId} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{project.projectName}</p>
                      <p className="text-muted-foreground text-xs">{project.projectKey}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{project.progress}%</span>
                  </div>
                  <Progress
                    value={project.progress}
                    aria-label={t('analytics.projectProgressLabel', {
                      project: project.projectName,
                      progress: String(project.progress),
                    })}
                  />
                  <div className="text-muted-foreground flex justify-between gap-3 text-xs">
                    <span>
                      {t('analytics.completedOfTotal', {
                        completed: String(project.completedTasks),
                        total: String(project.totalTasks),
                      })}
                    </span>
                    {project.overdueTasks > 0 ? (
                      <span className="font-medium text-ochre-ink">
                        {t('analytics.overdueCount', { count: project.overdueTasks })}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
