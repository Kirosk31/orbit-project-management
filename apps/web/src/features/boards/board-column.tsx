import type { ColumnDto, TaskListItemDto } from '@orbit/shared'
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { BoardTaskCard } from '@/features/boards/board-task-card'
import { cn } from '@/lib/utils'

const NO_TASKS: readonly TaskListItemDto[] = []

export interface BoardColumnProps {
  column: ColumnDto
  index: number
  columns: readonly ColumnDto[]
  tasks: readonly TaskListItemDto[] | undefined
  isLoadingTasks: boolean
  isFiltering: boolean
  isEditingName: boolean
  canDrag: boolean
  isBeingDragged: boolean
  isColumnTarget: boolean
  isTaskTarget: boolean
  /** Only set while a card from this board is in flight. */
  draggingTaskId: string | null
  onColumnDragStart: (columnId: string, event: DragEvent) => void
  onColumnDragEnd: () => void
  onColumnDragOver: (columnId: string, index: number) => void
  onColumnDrop: (columnId: string, index: number, event: DragEvent) => void
  onStartRename: (columnId: string) => void
  onCancelRename: () => void
  onRename: (columnId: string, name: string) => void
  onDelete: (columnId: string) => void
  onAddTask: (columnId: string) => void
  onOpenTask: (taskId: string) => void
  onTaskDragStart: (taskId: string, event: DragEvent) => void
  onTaskDragEnd: () => void
  onMoveTask: (taskId: string, columnId: string) => void
}

/**
 * A kanban column. Memoized so typing in a dialog, a realtime refetch that
 * changes another column, or a drag elsewhere does not re-render it.
 */
export const BoardColumn = memo(function BoardColumn({
  column,
  index,
  columns,
  tasks = NO_TASKS,
  isLoadingTasks,
  isFiltering,
  isEditingName,
  canDrag,
  isBeingDragged,
  isColumnTarget,
  isTaskTarget,
  draggingTaskId,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
  onStartRename,
  onCancelRename,
  onRename,
  onDelete,
  onAddTask,
  onOpenTask,
  onTaskDragStart,
  onTaskDragEnd,
  onMoveTask,
}: BoardColumnProps): ReactNode {
  const { t } = useTranslation()
  const overLimit = column.wipLimit !== null && column.taskCount > column.wipLimit

  return (
    <section
      aria-label={column.name}
      draggable={canDrag}
      onDragStart={(event) => {
        // Card drags bubble up here too; only a drag on the column itself moves it.
        if (event.target !== event.currentTarget) return
        onColumnDragStart(column.id, event)
      }}
      onDragEnd={onColumnDragEnd}
      onDragOver={(event) => {
        event.preventDefault()
        onColumnDragOver(column.id, index)
      }}
      onDrop={(event) => {
        event.preventDefault()
        // The board strip behind the columns also handles drops; without this
        // a column dropped here would be moved a second time, to the end.
        event.stopPropagation()
        onColumnDrop(column.id, index, event)
      }}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg bg-muted/70 transition-[background-color,box-shadow,opacity] duration-150',
        isBeingDragged && 'opacity-50',
        (isTaskTarget || isColumnTarget) && 'bg-accent ring-2 ring-ring/40 ring-inset',
      )}
    >
      <header className="flex h-11 items-center gap-2 pr-1.5 pl-3">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: column.color ?? 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
        {isEditingName ? (
          <form
            className="flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              const input = event.currentTarget.elements.namedItem('name') as HTMLInputElement
              onRename(column.id, input.value.trim())
            }}
          >
            <Input
              name="name"
              autoFocus
              defaultValue={column.name}
              aria-label={t('boards.renameColumn')}
              className="h-7"
              onBlur={onCancelRename}
              onKeyDown={(event) => {
                if (event.key === 'Escape') onCancelRename()
              }}
            />
          </form>
        ) : (
          <h2
            className="min-w-0 flex-1 cursor-grab truncate text-sm font-semibold"
            onDoubleClick={() => onStartRename(column.id)}
            title={column.name}
          >
            {column.name}
          </h2>
        )}
        <span
          className={cn(
            'text-xs tabular-nums',
            overLimit ? 'font-semibold text-destructive' : 'text-muted-foreground',
          )}
        >
          {isFiltering ? `${tasks.length}/${column.taskCount}` : column.taskCount}
          {column.wipLimit !== null && ` / ${column.wipLimit}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`${t('boards.columnActions')}: ${column.name}`}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onStartRename(column.id)}>
              <PencilIcon />
              {t('boards.renameColumn')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(column.id)}>
              <Trash2Icon />
              {t('boards.deleteColumn')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {overLimit && (
        <p className="mx-3 -mt-1 mb-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
          <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
          {t('boards.overLimit')}
        </p>
      )}

      <div className="flex flex-col gap-2 px-2 pb-2">
        {isLoadingTasks ? (
          <Skeleton className="h-20 w-full bg-card" />
        ) : tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-[color-mix(in_srgb,var(--border)_80%,var(--foreground))] px-3 py-5 text-center text-xs text-muted-foreground">
            {isTaskTarget ? t('boards.dropHere') : t('boards.emptyColumn')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <BoardTaskCard
                key={task.id}
                task={task}
                columnId={column.id}
                columns={columns}
                isDragging={draggingTaskId === task.id}
                onOpen={onOpenTask}
                onDragStart={onTaskDragStart}
                onDragEnd={onTaskDragEnd}
                onMove={onMoveTask}
              />
            ))}
          </ul>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddTask(column.id)}
          aria-keyshortcuts={index === 0 ? 'N' : undefined}
        >
          <PlusIcon />
          {t('tasks.addTask')}
          {index === 0 && (
            <kbd
              className="ml-auto hidden rounded border bg-muted px-1.5 font-sans text-[0.6875rem] leading-5 text-muted-foreground sm:inline"
              aria-hidden="true"
            >
              N
            </kbd>
          )}
        </Button>
      </div>
    </section>
  )
})
