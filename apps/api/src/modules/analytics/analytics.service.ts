import type { OrganizationAnalyticsDto, OrganizationAnalyticsQuery } from '@orbit/shared'
import type { AnalyticsRepository } from './analytics.repository.js'

const DAY_MS = 24 * 60 * 60 * 1_000

function count(value: bigint): number {
  return Number(value)
}

function percentage(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async organizationAnalytics(
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
