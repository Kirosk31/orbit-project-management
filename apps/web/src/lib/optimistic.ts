import type { ChecklistDto, ColumnDto, TaskDto } from '@orbit/shared'

import type { TaskListResult } from '@/features/tasks/task-api'

/** A card dropped on another column takes that column's status right away. */
export function moveTaskInList(
  list: TaskListResult | undefined,
  taskId: string,
  column: Pick<ColumnDto, 'id' | 'statusId' | 'statusName'>,
): TaskListResult | undefined {
  if (!list) return list
  return {
    ...list,
    rows: list.rows.map((task) =>
      task.id === taskId
        ? { ...task, columnId: column.id, statusId: column.statusId, statusName: column.statusName }
        : task,
    ),
  }
}

/** Column badges count cards, so the move shifts one from source to target. */
export function shiftColumnCounts(
  columns: ColumnDto[] | undefined,
  fromColumnId: string | null,
  toColumnId: string,
): ColumnDto[] | undefined {
  if (!columns || fromColumnId === toColumnId) return columns
  return columns.map((column) =>
    column.id === fromColumnId
      ? { ...column, taskCount: Math.max(0, column.taskCount - 1) }
      : column.id === toColumnId
        ? { ...column, taskCount: column.taskCount + 1 }
        : column,
  )
}

/** Completing a task shows as done at once; the server confirms the timestamp later. */
export function setTaskCompletion(
  task: TaskDto | undefined,
  isCompleted: boolean,
  now: Date = new Date(),
): TaskDto | undefined {
  if (!task) return task
  return { ...task, isCompleted, completedAt: isCompleted ? now.toISOString() : null }
}

export function toggleChecklistItem(
  checklists: ChecklistDto[] | undefined,
  checklistId: string,
  itemId: string,
  isCompleted: boolean,
): ChecklistDto[] | undefined {
  if (!checklists) return checklists
  return checklists.map((checklist) => {
    if (checklist.id !== checklistId) return checklist
    const items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, isCompleted } : item,
    )
    return { ...checklist, items, completedItems: items.filter((item) => item.isCompleted).length }
  })
}
