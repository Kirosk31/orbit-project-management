import type { OrganizationAnalyticsDto } from '@orbit/shared'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { TilePanel, type Tile } from '@/components/shared/tile-panel'
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
  fontFamily: 'inherit',
  fontSize: 12,
  boxShadow: 'var(--shadow-overlay)',
}

const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'inherit' }

/** Counts become a tile panel: finished pieces first, then late, then the rest. */
function tilesFromCounts(id: string, done: number, overdue: number, total: number): Tile[] {
  return Array.from({ length: total }, (_, index) => ({
    id: `${id}-${index}`,
    state: index < done ? 'done' : index < done + overdue ? 'overdue' : 'open',
  }))
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }): ReactNode {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}): ReactNode {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-[0.9375rem] font-semibold">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
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
        <Skeleton className="h-80 rounded-lg" />
      </section>
    )
  }

  if (isError || !data) {
    return (
      <div role="alert" className="rounded-lg border border-dashed p-5">
        <p className="font-semibold">{t('analytics.unavailable')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('analytics.unavailableDescription')}
        </p>
      </div>
    )
  }

  const locale = resolveFormattingLocale(i18n.language)
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const trend = data.trend.map((point) => ({
    ...point,
    displayDate: dateFormatter.format(new Date(`${point.date}T00:00:00.000Z`)),
  }))
  const hours = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    data.summary.trackedSeconds / 3_600,
  )
  const trendSeries = [
    { key: 'remaining', label: t('analytics.remaining'), color: 'var(--chart-1)' },
    { key: 'completed', label: t('analytics.completed'), color: 'var(--chart-3)' },
    { key: 'created', label: t('analytics.created'), color: 'var(--chart-4)' },
  ] as const

  return (
    <section aria-labelledby="analytics-heading" className="space-y-5">
      <div>
        <h2 id="analytics-heading" className="text-base font-semibold">
          {t('analytics.title')}
        </h2>
        <p className="mt-1 max-w-[80ch] text-sm text-muted-foreground tabular-nums">
          {t('analytics.summarySentence', {
            total: String(data.summary.totalTasks),
            open: String(data.summary.openTasks),
            completed: String(data.summary.completedInPeriod),
            days: String(data.period.days),
            rate: String(data.summary.completionRate),
            overdue: String(data.summary.overdueTasks),
            hours,
          })}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-[0.9375rem] font-semibold">{t('analytics.projectProgress')}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t('analytics.projectProgressDescription')}
        </p>
        {data.projectProgress.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('analytics.noProjects')}</p>
        ) : (
          <ul className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {data.projectProgress.map((project) => (
              <li key={project.projectId} className="min-w-0 space-y-2.5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="truncate text-sm font-semibold">{project.projectName}</p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {project.progress}%
                  </span>
                </div>
                <TilePanel
                  tiles={tilesFromCounts(
                    project.projectId,
                    project.completedTasks,
                    project.overdueTasks,
                    project.totalTasks,
                  )}
                  size={20}
                  columns={16}
                  max={48}
                  label={t('analytics.projectProgressLabel', {
                    project: project.projectName,
                    progress: String(project.progress),
                  })}
                />
                <p className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
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
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={t('analytics.velocityAndBurndown')}
          description={t('analytics.velocityDescription')}
        >
          <ChartLegend items={trendSeries.map(({ label, color }) => ({ label, color }))} />
          <div className="mt-3 h-64" role="img" aria-label={t('analytics.velocityChartLabel')}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  minTickGap={28}
                />
                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'var(--border)' }} />
                {trendSeries.map((series) => (
                  <Area
                    key={series.key}
                    dataKey={series.key}
                    name={series.label}
                    type="monotone"
                    stroke={series.color}
                    fill={series.key === 'remaining' ? series.color : 'transparent'}
                    fillOpacity={series.key === 'remaining' ? 0.1 : 0}
                    strokeWidth={series.key === 'remaining' ? 2 : 1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={t('analytics.teamWorkload')} description={t('analytics.workloadDescription')}>
          {data.workload.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('analytics.noWorkload')}</p>
          ) : (
            <>
              <ChartLegend
                items={[
                  { label: t('analytics.open'), color: 'var(--chart-1)' },
                  { label: t('analytics.overdue'), color: 'var(--ochre)' },
                ]}
              />
              <div className="mt-3 h-64" role="img" aria-label={t('analytics.workloadChartLabel')}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.workload.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 8, right: 8 }}
                    barGap={2}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="fullName"
                      type="category"
                      width={96}
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                    />
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
            </>
          )}
        </Panel>
      </div>
    </section>
  )
}
