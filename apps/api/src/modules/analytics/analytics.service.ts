import type { OrganizationAnalyticsDto, OrganizationAnalyticsQuery } from '@orbit/shared'
import type { CacheService } from '../../shared/cache/CacheService.js'
import type { AnalyticsRepository } from './analytics.repository.js'

const DAY_MS = 24 * 60 * 60 * 1_000

function count(value: bigint): number {
  return Number(value)
}

function percentage(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

/** Dashboards may lag the board by this much; the aggregates scan every task. */
export const ANALYTICS_CACHE_SECONDS = 60

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly cache?: CacheService,
  ) {}

  /**
   * The snapshot depends only on the organization and the period, and the
   * route has already checked org.dashboard.view, so one cached copy serves every
   * member. A cache outage falls through to the database.
   */
  async organizationAnalytics(
    orgId: string,
    query: OrganizationAnalyticsQuery,
  ): Promise<OrganizationAnalyticsDto> {
    const key = `analytics:org:${orgId}:days:${query.days}`
    const cached = await this.cache?.get<OrganizationAnalyticsDto>(key).catch(() => null)
    if (cached) return cached
    const fresh = await this.computeOrganizationAnalytics(orgId, query)
    await this.cache?.set(key, fresh, ANALYTICS_CACHE_SECONDS).catch(() => undefined)
    return fresh
  }

  private async computeOrganizationAnalytics(
    orgId: string,
    query: OrganizationAnalyticsQuery,
  ): Promise<OrganizationAnalyticsDto> {
    const to = new Date()
    const from = new Date(to)
    from.setUTCHours(0, 0, 0, 0)
    from.setTime(from.getTime() - (query.days - 1) * DAY_MS)

    const snapshot = await this.repository.getOrganizationSnapshot(orgId, from, to)
    const totalTasks = count(snapshot.summary.totalTasks)
    const completedTasks = count(snapshot.summary.completedTasks)

    return {
      period: {
        days: query.days,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalTasks,
        openTasks: count(snapshot.summary.openTasks),
        completedTasks,
        createdInPeriod: count(snapshot.summary.createdInPeriod),
        completedInPeriod: count(snapshot.summary.completedInPeriod),
        overdueTasks: count(snapshot.summary.overdueTasks),
        completionRate: percentage(completedTasks, totalTasks),
        trackedSeconds: count(snapshot.summary.trackedSeconds),
      },
      projectProgress: snapshot.projects.map((project) => {
        const total = count(project.totalTasks)
        const completed = count(project.completedTasks)
        return {
          projectId: project.projectId,
          projectKey: project.projectKey,
          projectName: project.projectName,
          totalTasks: total,
          completedTasks: completed,
          overdueTasks: count(project.overdueTasks),
          trackedSeconds: count(project.trackedSeconds),
          progress: percentage(completed, total),
        }
      }),
      workload: snapshot.workload.map((member) => ({
        userId: member.userId,
        fullName: member.fullName,
        openTasks: count(member.openTasks),
        overdueTasks: count(member.overdueTasks),
        completedInPeriod: count(member.completedInPeriod),
      })),
      trend: snapshot.trend.map((point) => ({
        date: point.date,
        created: count(point.created),
        completed: count(point.completed),
        remaining: count(point.remaining),
        activity: count(point.activity),
      })),
    }
  }
}
