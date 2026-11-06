import type { ColumnDto, TaskListItemDto } from '@orbit/shared'
import { ArrowRightIcon, ArrowUpRightIcon, MoreHorizontalIcon } from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CompletionMark } from '@/features/tasks/completion-mark'
import {
  AssigneeStack,
  DueDate,
  LabelChips,
  PriorityMark,
  SubtaskCount,
} from '@/features/tasks/task-meta'
import { cn } from '@/lib/utils'

export interface BoardTaskCardProps {
  task: TaskListItemDto
  /** The column the card sits in; the move menu offers every other one. */
  columnId: string
  columns: ReadonlyArray<Pick<ColumnDto, 'id' | 'name'>>
  isDragging: boolean
  onOpen: (taskId: string) => void
  onDragStart: (taskId: string, event: DragEvent) => void
  onDragEnd: () => void
  onMove: (taskId: string, columnId: string) => void
}

/**
 * One kanban card with its action menu. Memoized: with stable callbacks from
 * the board, a card only re-renders when its own task object changes, and
 * TanStack Query keeps unchanged tasks referentially equal across refetches.
 */
export const BoardTaskCard = memo(function BoardTaskCard({
  task,
  columnId,
  columns,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onMove,
}: BoardTaskCardProps): ReactNode {
  const { t } = useTranslation()

  return (
    <li className="group relative">
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(task.id, event)}
        onDragEnd={onDragEnd}
        onClick={() => onOpen(task.id)}
        className={cn(
          'flex w-full cursor-pointer flex-col gap-2.5 rounded-md border bg-card p-3 text-left transition-[border-color,box-shadow,opacity,translate] duration-150 hover:border-[color-mix(in_srgb,var(--border)_55%,var(--primary))] hover:shadow-lift',
          isDragging && 'rotate-1 opacity-60',
        )}
      >
        <span className="flex items-start gap-2 pr-6">
          {task.isCompleted && (
            <span className="mt-0.5 shrink-0">
              <CompletionMark completed size={16} turn={90} completedAt={task.completedAt} />
            </span>
          )}
          <span
            id={`task-title-${task.id}`}
            className={cn(
              'min-w-0 flex-1 text-sm leading-snug font-medium',
              task.isCompleted && 'text-muted-foreground',
            )}
          >
            {task.title}
            {task.isCompleted && <span className="sr-only"> ({t('tasks.completedState')})</span>}
          </span>
        </span>
        <LabelChips labels={task.labels} />
        <span className="flex items-center gap-3">
          <PriorityMark priority={task.priority} />
          {task.dueDate && <DueDate dueDate={task.dueDate} isCompleted={task.isCompleted} />}
          <SubtaskCount done={task.completedSubtaskCount} total={task.subtaskCount} />
          <span className="ml-auto">
            <AssigneeStack assignees={task.assignees} />
          </span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1.5 right-1.5 size-7 bg-card opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={t('tasks.actions')}
            aria-describedby={`task-title-${task.id}`}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => onOpen(task.id)}>
            <ArrowUpRightIcon />
            {t('tasks.openTask')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {columns
            .filter((target) => target.id !== columnId)
            .map((target) => (
              <DropdownMenuItem key={target.id} onSelect={() => onMove(task.id, target.id)}>
                <ArrowRightIcon />
                {t('tasks.moveTo', { column: target.name })}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
})
