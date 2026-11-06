import type { TaskListItemDto } from '@orbit/shared'

/** Groups board tasks by column, keeping each column's server order. */
export function groupTasksByColumn<T extends Pick<TaskListItemDto, 'columnId'>>(
  tasks: readonly T[],
): Map<string, T[]> {
  const byColumn = new Map<string, T[]>()
  for (const task of tasks) {
    const columnId = task.columnId ?? ''
    const list = byColumn.get(columnId)
    if (list) list.push(task)
    else byColumn.set(columnId, [task])
  }
  return byColumn
}
