import { zodResolver } from '@hookform/resolvers/zod'
import { createColumnSchema, createTaskSchema, updateBoardSchema } from '@orbit/shared'
import type { SavedTaskFilterValues, TaskDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  Columns3Icon,
  ListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { DragEvent, ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { ColorSwatchPicker } from '@/components/shared/color-swatch-picker'
import { EmptyState, PageContainer, PageHeader } from '@/components/shared/page'
import { TilePanel } from '@orbit/brand'
import { CompletionMark } from '@/features/tasks/completion-mark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  archiveBoardRequest,
  createColumnRequest,
  deleteBoardRequest,
  deleteColumnRequest,
  getBoardRequest,
  listColumnsRequest,
  moveColumnRequest,
  unarchiveBoardRequest,
  updateBoardRequest,
  updateColumnRequest,
} from '@/features/boards/board-api'
import {
  createTaskRequest,
  listBoardTasksRequest,
  moveTaskRequest,
} from '@/features/tasks/task-api'
import {
  AssigneeStack,
  DueDate,
  LabelChips,
  PriorityMark,
  SubtaskCount,
} from '@/features/tasks/task-meta'
import { TaskBoardFilters } from '@/features/tasks/task-board-filters'
import { useProjectRealtime } from '@/features/realtime/use-project-realtime'
import { useBreadcrumbs } from '@/features/app/breadcrumbs'
import { getProjectRequest } from '@/features/projects/project-api'
import { BoardListView } from '@/features/boards/board-list-view'
import { COLUMN_COLORS } from '@/lib/task-colors'
import { tilesFromTasks } from '@/lib/tiles'
import { cn } from '@/lib/utils'

export function BoardDetailPage(): ReactNode {
  const { t } = useTranslation()
  const { boardId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [addTaskForColumn, setAddTaskForColumn] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [taskDropColumn, setTaskDropColumn] = useState<string | null>(null)
  const [taskFilters, setTaskFilters] = useState<SavedTaskFilterValues>({ archived: false })
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoardRequest(boardId),
  })

  const board = boardQuery.data
  const onlineUserIds = useProjectRealtime(board?.projectId ?? '')

  const projectQuery = useQuery({
    queryKey: ['project', board?.projectId],
    queryFn: () => getProjectRequest(board!.projectId),
    enabled: board !== undefined,
  })
  const projectName = projectQuery.data?.name
  useBreadcrumbs(
    board
      ? [
          { label: t('projects.title'), to: '/app/projects' },
          { label: projectName ?? '…', to: `/app/projects/${board.projectId}` },
          { label: board.name },
        ]
      : [],
  )

  const columnsQuery = useQuery({
    queryKey: ['board-columns', boardId],
    queryFn: () => listColumnsRequest(boardId),
    enabled: board !== undefined,
  })

  const tasksQuery = useQuery({
    queryKey: ['board-tasks', boardId, taskFilters],
    queryFn: () => listBoardTasksRequest(boardId, taskFilters),
    enabled: board !== undefined,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    queryClient.invalidateQueries({ queryKey: ['board-columns', boardId] })
    queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] })
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['project-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['boards'] })
  }

  const updateMutation = useMutation({
    mutationFn: (input: z.output<typeof updateBoardSchema>) => updateBoardRequest(boardId, input),
    onSuccess: () => {
      invalidate()
      setEditOpen(false)
      toast.success(t('boards.updated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const editForm = useForm<
    z.input<typeof updateBoardSchema>,
    unknown,
    z.output<typeof updateBoardSchema>
  >({
    resolver: zodResolver(updateBoardSchema),
    defaultValues: { name: '', description: '' },
  })

  const archiveMutation = useMutation({
    mutationFn: (archive: boolean) =>
      archive ? archiveBoardRequest(boardId) : unarchiveBoardRequest(boardId),
    onSuccess: () => {
      invalidate()
      toast.success(board?.isArchived ? t('boards.restored') : t('boards.archivedSuccess'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoardRequest(boardId),
    onSuccess: () => {
      toast.success(t('boards.deleted'))
      navigate(`/app/projects/${board?.projectId ?? ''}`)
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const addColumnForm = useForm<z.input<typeof createColumnSchema>>({
    resolver: zodResolver(createColumnSchema),
    defaultValues: { name: '', wipLimit: null, color: COLUMN_COLORS[0] },
  })

  const addColumnMutation = useMutation({
    mutationFn: (input: z.output<typeof createColumnSchema>) => createColumnRequest(boardId, input),
    onSuccess: () => {
      invalidate()
      setAddColumnOpen(false)
      addColumnForm.reset()
      toast.success(t('boards.columnAdded'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const renameMutation = useMutation({
    mutationFn: (input: { columnId: string; name: string }) =>
      updateColumnRequest(input.columnId, { name: input.name }),
    onSuccess: () => {
      invalidate()
      setEditingNameId(null)
      toast.success(t('boards.columnUpdated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteColumnRequest(columnId),
    onSuccess: () => {
      invalidate()
      toast.success(t('boards.columnDeleted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const moveMutation = useMutation({
    mutationFn: (input: { columnId: string; toPosition: number }) =>
      moveColumnRequest(input.columnId, input.toPosition),
    onSuccess: invalidate,
    onError: () => toast.error(t('auth.genericError')),
  })

  const addTaskForm = useForm<
    z.input<typeof createTaskSchema>,
    unknown,
    z.output<typeof createTaskSchema>
  >({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: '', description: '', priority: 'NONE', assigneeIds: [], labelIds: [] },
  })

  const addTaskMutation = useMutation({
    mutationFn: (input: z.output<typeof createTaskSchema>) =>
      createTaskRequest(board!.projectId, input),
    onSuccess: () => {
      invalidate()
      setAddTaskForColumn(null)
      addTaskForm.reset()
      toast.success(t('tasks.created'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const moveTaskMutation = useMutation({
    mutationFn: (input: { taskId: string; columnId: string }) =>
      moveTaskRequest(input.taskId, { columnId: input.columnId }),
    onSuccess: () => {
      invalidate()
      toast.success(t('tasks.cardMoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const columns = columnsQuery.data ?? []
  const tasks = tasksQuery.data?.rows ?? []
  const isFiltering = Boolean(
    taskFilters.search ||
    taskFilters.priority ||
    taskFilters.assigneeId ||
    taskFilters.statusId ||
    taskFilters.archived,
  )
  const tasksByColumn = new Map<string, typeof tasks>()
  for (const task of tasks) {
    const columnId = task.columnId ?? ''
    const list = tasksByColumn.get(columnId) ?? []
    list.push(task)
    tasksByColumn.set(columnId, list)
  }

  const handleDrop = (event: DragEvent, index: number | null): void => {
    event.preventDefault()
    if (draggingId) {
      moveMutation.mutate({ columnId: draggingId, toPosition: index ?? columns.length - 1 })
    }
    setDraggingId(null)
    setDropIndex(null)
  }

  if (boardQuery.isPending) {
    return (
      <PageContainer width="full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
        <div className="mt-8 flex gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-80 w-72 shrink-0" />
          ))}
        </div>
      </PageContainer>
    )
  }

  if (boardQuery.isError || !board) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title={t('org.permissionDenied')}
          action={
            <Button variant="outline" onClick={() => navigate('/app/projects')}>
              {t('projects.backToProjects')}
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const tiles = tilesFromTasks(tasks)
  const doneCount = tiles.filter((tile) => tile.state === 'done').length
  const overdueCount = tiles.filter((tile) => tile.state === 'overdue').length

  return (
    <PageContainer width="full">
      <PageHeader
        leading={
          <Button
            variant="link"
            size="sm"
            className="h-auto gap-1 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/app/projects/${board.projectId}`)}
          >
            <ArrowLeftIcon className="size-3.5" />
            {projectName ?? t('boards.backToProject')}
          </Button>
        }
        title={board.name}
        meta={
          <>
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              title={t('boards.realtimePresence')}
            >
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {t('boards.onlineCount', { count: onlineUserIds.length })}
            </span>
            {board.isArchived && <Badge variant="warning">{t('projects.archived')}</Badge>}
          </>
        }
        description={board.description || t('boards.subtitle')}
        actions={
          <>
            <div
              role="group"
              aria-label={t('boards.viewMode')}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-muted p-[3px]"
            >
              {(
                [
                  ['kanban', Columns3Icon, t('boards.viewKanban')],
                  ['list', ListIcon, t('boards.viewList')],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'inline-flex h-full items-center gap-1.5 rounded-sm border border-transparent px-2.5 text-sm font-medium transition-colors duration-150 [&_svg]:size-4',
                    viewMode === mode
                      ? 'border-border bg-card text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                editForm.reset({ name: board.name, description: board.description ?? '' })
                setEditOpen(true)
              }}
            >
              <PencilIcon />
              <span className="sr-only sm:not-sr-only">{t('boards.edit')}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('boards.moreActions')}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={archiveMutation.isPending}
                  onSelect={() => archiveMutation.mutate(!board.isArchived)}
                >
                  <ArchiveIcon />
                  {board.isArchived ? t('boards.unarchive') : t('boards.archive')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  <Trash2Icon />
                  {t('boards.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {tiles.length > 0 && (
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <TilePanel
            tiles={tiles}
            columns={40}
            max={80}
            size={12}
            label={t('boards.progressLabel', {
              done: String(doneCount),
              total: String(tiles.length),
              overdue: String(overdueCount),
            })}
          />
          <p className="text-xs text-muted-foreground tabular-nums" aria-hidden="true">
            {t('boards.progress', { done: String(doneCount), total: String(tiles.length) })}
            {overdueCount > 0 && (
              <span className="ml-2 font-medium text-ochre-ink">
                {t('boards.progressOverdue', { count: overdueCount })}
              </span>
            )}
          </p>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('boards.edit')}</DialogTitle>
            <DialogDescription>{t('boards.createDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="board-name">{t('boards.name')}</Label>
              <Input id="board-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="board-description">{t('boards.description')}</Label>
              <Input id="board-description" {...editForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {t('boards.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('boards.delete')}</DialogTitle>
            <DialogDescription>{t('boards.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {t('boards.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-5">
        <TaskBoardFilters boardId={boardId} filters={taskFilters} onChange={setTaskFilters} />
      </div>

      {viewMode === 'kanban' ? (
        columnsQuery.isPending ? (
          <div className="flex gap-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-80 w-72 shrink-0" />
            ))}
          </div>
        ) : (
          <div
            className="-mx-4 flex items-start gap-3 overflow-x-auto pr-16 pb-6 pl-4 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] sm:-mx-6 sm:pl-6 lg:-mx-8 lg:pl-8"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, null)}
          >
            {columns.map((column, index) => {
              const overLimit = column.wipLimit !== null && column.taskCount > column.wipLimit
              const columnTasks = tasksByColumn.get(column.id) ?? []
              const isTaskTarget = taskDropColumn === column.id && draggingTaskId !== null
              const isColumnTarget =
                dropIndex === index && draggingId !== column.id && draggingTaskId === null
              return (
                <section
                  key={column.id}
                  aria-label={column.name}
                  draggable={draggingTaskId === null && editingNameId !== column.id}
                  onDragStart={(event) => {
                    setDraggingId(column.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDropIndex(null)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (draggingTaskId !== null) {
                      setTaskDropColumn(column.id)
                    } else {
                      setDropIndex(index)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (draggingTaskId) {
                      const draggedTask = tasks.find((task) => task.id === draggingTaskId)
                      if (draggedTask && draggedTask.columnId !== column.id) {
                        moveTaskMutation.mutate({ taskId: draggingTaskId, columnId: column.id })
                      }
                      setDraggingTaskId(null)
                      setTaskDropColumn(null)
                    } else {
                      handleDrop(event, index)
                    }
                  }}
                  className={cn(
                    'flex w-72 shrink-0 flex-col rounded-lg bg-muted/70 transition-[background-color,box-shadow,opacity] duration-150',
                    draggingId === column.id && 'opacity-50',
                    (isTaskTarget || isColumnTarget) && 'bg-accent ring-2 ring-ring/40 ring-inset',
                  )}
                >
                  <header className="flex h-11 items-center gap-2 pr-1.5 pl-3">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: column.color ?? 'var(--muted-foreground)' }}
                      aria-hidden="true"
                    />
                    {editingNameId === column.id ? (
                      <form
                        className="flex-1"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const input = event.currentTarget.elements.namedItem(
                            'name',
                          ) as HTMLInputElement
                          renameMutation.mutate({ columnId: column.id, name: input.value.trim() })
                        }}
                      >
                        <Input
                          name="name"
                          autoFocus
                          defaultValue={column.name}
                          aria-label={t('boards.renameColumn')}
                          className="h-7"
                          onBlur={() => setEditingNameId(null)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') setEditingNameId(null)
                          }}
                        />
                      </form>
                    ) : (
                      <h2
                        className="min-w-0 flex-1 cursor-grab truncate text-sm font-semibold"
                        onDoubleClick={() => setEditingNameId(column.id)}
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
                      {isFiltering ? `${columnTasks.length}/${column.taskCount}` : column.taskCount}
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
                        <DropdownMenuItem onSelect={() => setEditingNameId(column.id)}>
                          <PencilIcon />
                          {t('boards.renameColumn')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => deleteColumnMutation.mutate(column.id)}
                        >
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
                    {tasksQuery.isPending ? (
                      <Skeleton className="h-20 w-full bg-card" />
                    ) : columnTasks.length === 0 ? (
                      <p className="rounded-md border border-dashed border-[color-mix(in_srgb,var(--border)_80%,var(--foreground))] px-3 py-5 text-center text-xs text-muted-foreground">
                        {isTaskTarget ? t('boards.dropHere') : t('boards.emptyColumn')}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {columnTasks.map((task) => (
                          <li key={task.id} className="group relative">
                            <TaskCard
                              task={task}
                              isDragging={draggingTaskId === task.id}
                              onOpen={() => navigate(`/app/tasks/${task.id}`)}
                              onDragStart={(event) => {
                                setDraggingTaskId(task.id)
                                event.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragEnd={() => {
                                setDraggingTaskId(null)
                                setTaskDropColumn(null)
                              }}
                            />
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
                                <DropdownMenuItem
                                  onSelect={() => navigate(`/app/tasks/${task.id}`)}
                                >
                                  <ArrowUpRightIcon />
                                  {t('tasks.openTask')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {columns
                                  .filter((target) => target.id !== column.id)
                                  .map((target) => (
                                    <DropdownMenuItem
                                      key={target.id}
                                      onSelect={() =>
                                        moveTaskMutation.mutate({
                                          taskId: task.id,
                                          columnId: target.id,
                                        })
                                      }
                                    >
                                      <ArrowRightIcon />
                                      {t('tasks.moveTo', { column: target.name })}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => setAddTaskForColumn(column.id)}
                    >
                      <PlusIcon />
                      {t('tasks.addTask')}
                    </Button>
                  </div>
                </section>
              )
            })}

            <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 w-72 shrink-0 justify-start border border-dashed text-muted-foreground hover:text-foreground"
                >
                  <PlusIcon />
                  {t('boards.addColumn')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('boards.addColumn')}</DialogTitle>
                  <DialogDescription>{t('boards.createDescription')}</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={addColumnForm.handleSubmit((values) =>
                    addColumnMutation.mutate(values),
                  )}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="column-name">{t('boards.columnName')}</Label>
                    <Input
                      id="column-name"
                      autoFocus
                      placeholder={t('boards.columnNamePlaceholder')}
                      {...addColumnForm.register('name')}
                    />
                    {addColumnForm.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {addColumnForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="column-wip">{t('boards.wipLimit')}</Label>
                    <Input
                      id="column-wip"
                      type="number"
                      min={0}
                      className="w-28"
                      {...addColumnForm.register('wipLimit', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">{t('boards.wipLimitHint')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label id="column-color-label">{t('projects.color')}</Label>
                    <ColorSwatchPicker
                      labelledBy="column-color-label"
                      colors={COLUMN_COLORS}
                      value={addColumnForm.watch('color') ?? COLUMN_COLORS[0] ?? ''}
                      onChange={(color) => addColumnForm.setValue('color', color)}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addColumnMutation.isPending}>
                      {t('boards.addColumn')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )
      ) : (
        <BoardListView
          columns={columns.map((column) => ({
            id: column.id,
            name: column.name,
            color: column.color,
            taskCount: column.taskCount,
          }))}
          tasks={tasks}
          onOpenTask={(taskId) => navigate(`/app/tasks/${taskId}`)}
        />
      )}

      <Dialog
        open={addTaskForColumn !== null}
        onOpenChange={(open) => {
          if (!open) setAddTaskForColumn(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.addTask')}</DialogTitle>
            <DialogDescription>{t('tasks.createDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={addTaskForm.handleSubmit((values) => {
              const columnId = addTaskForColumn
              if (!columnId) return
              addTaskMutation.mutate({ ...values, columnId })
            })}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title">{t('tasks.taskTitle')}</Label>
              <Input
                id="task-title"
                autoFocus
                placeholder={t('tasks.taskTitlePlaceholder')}
                {...addTaskForm.register('title')}
              />
              {addTaskForm.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {addTaskForm.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-desc">{t('tasks.description')}</Label>
              <Textarea
                id="task-desc"
                placeholder={t('tasks.descriptionPlaceholder')}
                {...addTaskForm.register('description')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-priority">{t('tasks.priority')}</Label>
              <Select
                value={addTaskForm.watch('priority')}
                onValueChange={(value) => addTaskForm.setValue('priority', value as never)}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      <PriorityMark priority={priority} showLabel />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addTaskMutation.isPending}>
                {t('tasks.addTask')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

interface TaskCardProps {
  task: TaskDto
  isDragging: boolean
  onOpen: () => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
}

function TaskCard({ task, isDragging, onOpen, onDragStart, onDragEnd }: TaskCardProps): ReactNode {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
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
  )
}
