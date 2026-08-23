import { Prisma, type PrismaClient } from '@prisma/client'

export interface AnalyticsSummaryRow {
  totalTasks: bigint
  openTasks: bigint
  completedTasks: bigint
  createdInPeriod: bigint
  completedInPeriod: bigint
  overdueTasks: bigint
  trackedSeconds: bigint
}

export interface ProjectProgressRow {
  projectId: string
  projectKey: string
  projectName: string
  totalTasks: bigint
  completedTasks: bigint
  overdueTasks: bigint
  trackedSeconds: bigint
}

export interface WorkloadRow {
  userId: string
  fullName: string
  openTasks: bigint
  overdueTasks: bigint
  completedInPeriod: bigint
}

export interface TrendRow {
  date: string
  created: bigint
  completed: bigint
  remaining: bigint
  activity: bigint
}

export interface AnalyticsSnapshot {
  summary: AnalyticsSummaryRow
  projects: ProjectProgressRow[]
  workload: WorkloadRow[]
  trend: TrendRow[]
}

export interface AnalyticsRepository {
  getOrganizationSnapshot(orgId: string, from: Date, to: Date): Promise<AnalyticsSnapshot>
}

const ACTIVE_TASK = Prisma.sql`task."deletedAt" IS NULL AND task."parentId" IS NULL`

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrganizationSnapshot(orgId: string, from: Date, to: Date): Promise<AnalyticsSnapshot> {
    const [summaryRows, projects, workload, trend] = await Promise.all([
      this.prisma.$queryRaw<AnalyticsSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*) AS "totalTasks",
          COUNT(*) FILTER (WHERE task."isCompleted" = false) AS "openTasks",
          COUNT(*) FILTER (WHERE task."isCompleted" = true) AS "completedTasks",
          COUNT(*) FILTER (WHERE task."createdAt" >= ${from}) AS "createdInPeriod",
          COUNT(*) FILTER (
            WHERE task."isCompleted" = true AND task."completedAt" >= ${from}
          ) AS "completedInPeriod",
          COUNT(*) FILTER (
            WHERE task."isCompleted" = false
              AND task."dueDate" IS NOT NULL
              AND task."dueDate" < ${to}
          ) AS "overdueTasks",
          COALESCE(SUM(task."trackedSeconds"), 0) AS "trackedSeconds"
        FROM "tasks" task
        WHERE task."orgId" = ${orgId} AND ${ACTIVE_TASK}
      `),
      this.prisma.$queryRaw<ProjectProgressRow[]>(Prisma.sql`
        SELECT
          project."id" AS "projectId",
          project."key" AS "projectKey",
          project."name" AS "projectName",
          COUNT(task."id") AS "totalTasks",
          COUNT(task."id") FILTER (WHERE task."isCompleted" = true) AS "completedTasks",
          COUNT(task."id") FILTER (
            WHERE task."isCompleted" = false
              AND task."dueDate" IS NOT NULL
              AND task."dueDate" < ${to}
          ) AS "overdueTasks",
          COALESCE(SUM(task."trackedSeconds"), 0) AS "trackedSeconds"
        FROM "projects" project
        LEFT JOIN "tasks" task
          ON task."projectId" = project."id"
          AND task."orgId" = ${orgId}
          AND task."deletedAt" IS NULL
          AND task."parentId" IS NULL
        WHERE project."orgId" = ${orgId}
          AND project."deletedAt" IS NULL
          AND project."isArchived" = false
        GROUP BY project."id", project."key", project."name"
        ORDER BY "totalTasks" DESC, project."name" ASC
        LIMIT 12
      `),
      this.prisma.$queryRaw<WorkloadRow[]>(Prisma.sql`
        SELECT
          app_user."id" AS "userId",
          app_user."fullName",
          COUNT(DISTINCT task."id") FILTER (WHERE task."isCompleted" = false) AS "openTasks",
          COUNT(DISTINCT task."id") FILTER (
            WHERE task."isCompleted" = false
              AND task."dueDate" IS NOT NULL
              AND task."dueDate" < ${to}
          ) AS "overdueTasks",
          COUNT(DISTINCT task."id") FILTER (
            WHERE task."isCompleted" = true AND task."completedAt" >= ${from}
          ) AS "completedInPeriod"
        FROM "organization_members" membership
        JOIN "users" app_user
          ON app_user."id" = membership."userId"
          AND app_user."isActive" = true
          AND app_user."deletedAt" IS NULL
        LEFT JOIN "task_assignees" assignee ON assignee."userId" = app_user."id"
        LEFT JOIN "tasks" task
          ON task."id" = assignee."taskId"
          AND task."orgId" = ${orgId}
          AND task."deletedAt" IS NULL
          AND task."parentId" IS NULL
        WHERE membership."orgId" = ${orgId} AND membership."isActive" = true
        GROUP BY app_user."id", app_user."fullName"
        ORDER BY "openTasks" DESC, app_user."fullName" ASC
        LIMIT 20
      `),
      this.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
        WITH date_series AS (
          SELECT generate_series(
            DATE_TRUNC('day', ${from}::timestamptz),
            DATE_TRUNC('day', ${to}::timestamptz),
            INTERVAL '1 day'
          ) AS day
        ), task_daily AS (
          SELECT
            DATE(task."createdAt" AT TIME ZONE 'UTC') AS day,
            COUNT(*) AS created
          FROM "tasks" task
          WHERE task."orgId" = ${orgId}
            AND ${ACTIVE_TASK}
            AND task."createdAt" >= ${from}
          GROUP BY DATE(task."createdAt" AT TIME ZONE 'UTC')
        ), completed_daily AS (
          SELECT
            DATE(task."completedAt" AT TIME ZONE 'UTC') AS day,
            COUNT(*) AS completed
          FROM "tasks" task
          WHERE task."orgId" = ${orgId}
            AND ${ACTIVE_TASK}
            AND task."isCompleted" = true
            AND task."completedAt" >= ${from}
          GROUP BY DATE(task."completedAt" AT TIME ZONE 'UTC')
        ), activity_daily AS (
          SELECT
            DATE(activity."createdAt" AT TIME ZONE 'UTC') AS day,
            COUNT(*) AS activity
          FROM "task_activities" activity
          JOIN "tasks" task ON task."id" = activity."taskId" AND task."orgId" = ${orgId}
          WHERE activity."createdAt" >= ${from} AND activity."createdAt" <= ${to}
          GROUP BY DATE(activity."createdAt" AT TIME ZONE 'UTC')
        ), initial_open AS (
          SELECT COUNT(*) AS count
          FROM "tasks" task
          WHERE task."orgId" = ${orgId}
            AND ${ACTIVE_TASK}
            AND task."createdAt" < ${from}
            AND (task."completedAt" IS NULL OR task."completedAt" >= ${from})
        ), daily AS (
          SELECT
            series.day,
            COALESCE(task_daily.created, 0)::bigint AS created,
            COALESCE(completed_daily.completed, 0)::bigint AS completed,
            COALESCE(activity_daily.activity, 0)::bigint AS activity
          FROM date_series series
          LEFT JOIN task_daily ON task_daily.day = DATE(series.day AT TIME ZONE 'UTC')
          LEFT JOIN completed_daily ON completed_daily.day = DATE(series.day AT TIME ZONE 'UTC')
          LEFT JOIN activity_daily ON activity_daily.day = DATE(series.day AT TIME ZONE 'UTC')
        )
        SELECT
          TO_CHAR(daily.day AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          daily.created,
          daily.completed,
          GREATEST(
            0,
            (SELECT count FROM initial_open)
              + SUM(daily.created - daily.completed) OVER (ORDER BY daily.day)
          )::bigint AS remaining,
          daily.activity
        FROM daily
        ORDER BY daily.day ASC
      `),
    ])

    return {
      summary: summaryRows[0] ?? {
        totalTasks: 0n,
        openTasks: 0n,
        completedTasks: 0n,
        createdInPeriod: 0n,
        completedInPeriod: 0n,
        overdueTasks: 0n,
        trackedSeconds: 0n,
      },
      projects,
      workload,
      trend,
    }
  }
}
