import type { TaskDto } from '@orbit/shared'
import { CalendarIcon, CircleIcon, ListChecksIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { formatDate, getContrastTextColor, initialsOf } from '@/lib/utils'
import { PRIORITY_COLORS } from '@/lib/task-colors'

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
  const { t, i18n } = useTranslation()

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
    <section className="flex flex-col gap-4" aria-label={t('boards.listView')}>
      {groups.map((group) => (
        <div key={group.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: group.color ?? '#94a3b8' }}
              aria-hidden="true"
            />
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{group.name}</h3>
            <Badge variant="secondary">{group.tasks.length}</Badge>
          </div>

          {group.tasks.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">
              {t('boards.listEmpty')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className="hover:bg-accent/50 flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition-colors"
                  >
                    <CircleIcon
                      className="size-3 shrink-0"
                      style={{ color: PRIORITY_COLORS[task.priority] ?? '#94a3b8' }}
                      fill={task.isCompleted ? 'currentColor' : 'none'}
                    />
                    <span
                      className={`min-w-0 flex-1 text-sm font-medium ${
                        task.isCompleted ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.labels.length > 0 && (
                      <span className="flex shrink-0 flex-wrap gap-1">
                        {task.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.id}
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: label.color,
                              color: getContrastTextColor(label.color),
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </span>
                    )}

                    {task.subtaskCount > 0 && (
                      <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]">
                        <ListChecksIcon className="size-3" />
                        {task.completedSubtaskCount}/{task.subtaskCount}
                      </span>
                    )}

                    {task.dueDate && (
                      <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]">
                        <CalendarIcon className="size-3" />
                        {formatDate(task.dueDate, i18n.resolvedLanguage ?? i18n.language)}
                      </span>
                    )}

                    {task.assignees.length > 0 && (
                      <span className="flex shrink-0 -space-x-1.5">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <Avatar key={assignee.id} className="size-5 ring-2 ring-background">
                            <SecureAvatarImage
                              userId={assignee.userId}
                              avatarKey={assignee.avatarKey}
                              alt={assignee.fullName}
                            />
                            <AvatarFallback className="text-[8px]">
                              {initialsOf(assignee.fullName)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <Avatar className="size-5 bg-muted text-[8px] ring-2 ring-background">
                            <AvatarFallback>+{task.assignees.length - 3}</AvatarFallback>
                          </Avatar>
                        )}
                      </span>
                    )}
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
