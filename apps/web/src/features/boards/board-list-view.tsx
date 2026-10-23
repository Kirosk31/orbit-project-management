import type { TaskDto } from '@orbit/shared'
import { CircleCheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AssigneeStack,
  DueDate,
  LabelChips,
  PriorityMark,
  SubtaskCount,
} from '@/features/tasks/task-meta'
import { cn } from '@/lib/utils'

export interface BoardListColumn {
  id: string
  name: string
  color: string | null
  taskCount: number
}

export interface BoardListViewProps {
  columns: BoardListColumn[]
  tasks: TaskDto[]
  onOpenTask: (taskId: string) => void
}

export function BoardListView({ columns, tasks, onOpenTask }: BoardListViewProps): ReactNode {
  const { t } = useTranslation()

  const groups = columns.map((column) => ({
    id: column.id,
    name: column.name,
    color: column.color,
    tasks: tasks.filter((task) => task.columnId === column.id),
  }))

  const orphanTasks = tasks.filter((task) => !columns.some((column) => column.id === task.columnId))
  if (orphanTasks.length > 0) {
    groups.push({
      id: '__unassigned',
      name: t('boards.unassigned'),
      color: null,
      tasks: orphanTasks,
    })
  }

  return (
    <section
      className="overflow-hidden rounded-lg border bg-card"
      aria-label={t('boards.listView')}
    >
      {groups.map((group) => (
        <div key={group.id} className="border-b last:border-b-0">
          <div className="flex h-10 items-center gap-2 bg-muted/60 px-4">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: group.color ?? 'var(--muted-foreground)' }}
              aria-hidden="true"
            />
            <h2 className="min-w-0 truncate text-sm font-semibold">{group.name}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{group.tasks.length}</span>
          </div>

          {group.tasks.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">{t('boards.listEmpty')}</p>
          ) : (
            <ul className="divide-y">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className="flex min-h-11 w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 text-left transition-colors duration-150 hover:bg-accent/60"
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      {task.isCompleted ? (
                        <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
                      ) : (
                        <PriorityMark priority={task.priority} placeholder />
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 basis-60 truncate text-sm font-medium',
                        task.isCompleted && 'text-muted-foreground',
                      )}
                    >
                      {task.title}
                      {task.isCompleted && (
                        <span className="sr-only"> ({t('tasks.completedState')})</span>
                      )}
                    </span>
                    <LabelChips labels={task.labels} />
                    <SubtaskCount done={task.completedSubtaskCount} total={task.subtaskCount} />
                    <span className="w-24 shrink-0">
                      {task.dueDate && (
                        <DueDate dueDate={task.dueDate} isCompleted={task.isCompleted} />
                      )}
                    </span>
                    <span className="flex w-14 shrink-0 justify-end">
                      <AssigneeStack assignees={task.assignees} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}
