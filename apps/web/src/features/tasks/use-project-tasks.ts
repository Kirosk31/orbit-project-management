import type { TaskDto } from '@orbit/shared'
import { useQueries } from '@tanstack/react-query'

import { listProjectTasksRequest } from '@/features/tasks/task-api'

/** Top-level tasks for several projects at once, shared across pages by cache key. */
export function useProjectTasks(projectIds: readonly string[]): {
  byProject: Map<string, TaskDto[]>
  isLoading: boolean
} {
  const queries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ['project-tasks', projectId, 'top-level'],
      queryFn: () => listProjectTasksRequest(projectId, { pageSize: 100 }),
      staleTime: 30_000,
    })),
  })
  const byProject = new Map<string, TaskDto[]>()
  projectIds.forEach((projectId, index) => {
    const rows = queries[index]?.data?.rows
    if (rows)
      byProject.set(
        projectId,
        rows.filter((task) => !task.parentId),
      )
  })
  return { byProject, isLoading: queries.some((query) => query.isLoading) }
}
