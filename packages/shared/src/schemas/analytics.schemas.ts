import { z } from 'zod'

export const organizationAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

export type OrganizationAnalyticsQuery = z.infer<typeof organizationAnalyticsQuerySchema>

export interface AnalyticsSummaryDto {
  totalTasks: number
  openTasks: number
  completedTasks: number
  createdInPeriod: number
  completedInPeriod: number
  overdueTasks: number
  completionRate: number
  trackedSeconds: number
}

export interface ProjectProgressDto {
  projectId: string
  projectKey: string
  projectName: string
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  trackedSeconds: number
  progress: number
}

export interface WorkloadMemberDto {
  userId: string
  fullName: string
  openTasks: number
  overdueTasks: number
  completedInPeriod: number
}

export interface AnalyticsTrendPointDto {
  date: string
  created: number
  completed: number
  remaining: number
  activity: number
}

export interface OrganizationAnalyticsDto {
  period: {
    days: number
    from: string
    to: string
  }
  summary: AnalyticsSummaryDto
  projectProgress: ProjectProgressDto[]
  workload: WorkloadMemberDto[]
  trend: AnalyticsTrendPointDto[]
}
