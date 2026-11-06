import { zodResolver } from '@hookform/resolvers/zod'
import { createColumnSchema, createTaskSchema, updateBoardSchema } from '@orbit/shared'
import type { ColumnDto, SavedTaskFilterValues, TaskListItemDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  Columns3Icon,
  ListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { DragEvent, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { ColorSwatchPicker } from '@/components/shared/color-swatch-picker'
import { EmptyState, PageContainer, PageHeader } from '@/components/shared/page'
import { TilePanel } from '@orbit/brand'
import type { TaskListResult } from '@/features/tasks/task-api'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { moveTaskInList, shiftColumnCounts } from '@/lib/optimistic'
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
  listAllBoardTasksRequest,
  moveTaskRequest,
} from '@/features/tasks/task-api'
import { PriorityMark } from '@/features/tasks/task-meta'
import { TaskBoardFilters } from '@/features/tasks/task-board-filters'
import { useProjectRealtime } from '@/features/realtime/use-project-realtime'
import { useBreadcrumbs } from '@/features/app/breadcrumbs'
import { getProjectRequest } from '@/features/projects/project-api'
import { BoardColumn } from '@/features/boards/board-column'
import { groupTasksByColumn } from '@/features/boards/group-tasks'
import { BoardListView } from '@/features/boards/board-list-view'
import { COLUMN_COLORS } from '@/lib/task-colors'
import { tilesFromTasks } from '@/lib/tiles'
import { cn } from '@/lib/utils'

const NO_COLUMNS: ColumnDto[] = []
const NO_TASKS: TaskListItemDto[] = []

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
    enabled: boardId !== '',
  })

  const tasksQuery = useQuery({
    queryKey: ['board-tasks', boardId, taskFilters],
    queryFn: () => listAllBoardTasksRequest(boardId, taskFilters),
    enabled: boardId !== '',
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

  const { mutate: renameColumn } = useMutation({
    mutationFn: (input: { columnId: string; name: string }) =>
      updateColumnRequest(input.columnId, { name: input.name }),
    onSuccess: () => {
      invalidate()
      setEditingNameId(null)
      toast.success(t('boards.columnUpdated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const { mutate: deleteColumn } = useMutation({
    mutationFn: (columnId: string) => deleteColumnRequest(columnId),
    onSuccess: () => {
      invalidate()
      toast.success(t('boards.columnDeleted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const { mutate: moveColumn } = useMutation({
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

  const { mutate: moveTask } = useMutation({
    mutationFn: (input: { taskId: string; columnId: string }) =>
      moveTaskRequest(input.taskId, { columnId: input.columnId }),
    // The card lands immediately; the server confirms in the background.
    onMutate: async ({ taskId, columnId }) => {
      const target = columnsQuery.data?.find((column) => column.id === columnId)
      await queryClient.cancelQueries({ queryKey: ['board-tasks', boardId] })
      await queryClient.cancelQueries({ queryKey: ['board-columns', boardId] })
      const previousTasks = queryClient.getQueriesData<TaskListResult>({
        queryKey: ['board-tasks', boardId],
      })
      const previousColumns = queryClient.getQueryData<ColumnDto[]>(['board-columns', boardId])
      const fromColumnId =
        previousTasks.flatMap(([, data]) => data?.rows ?? []).find((task) => task.id === taskId)
          ?.columnId ?? null
      if (target) {
        queryClient.setQueriesData<TaskListResult>({ queryKey: ['board-tasks', boardId] }, (list) =>
          moveTaskInList(list, taskId, target),
        )
        queryClient.setQueryData<ColumnDto[]>(['board-columns', boardId], (columns) =>
          shiftColumnCounts(columns, fromColumnId, columnId),
        )
      }
      return { previousTasks, previousColumns }
    },
    onError: (_error, _input, context) => {
      context?.previousTasks.forEach(([key, data]) => queryClient.setQueryData(key, data))
      queryClient.setQueryData(['board-columns', boardId], context?.previousColumns)
      toast.error(t('auth.genericError'))
    },
    onSuccess: () => toast.success(t('tasks.cardMoved')),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] })
      void queryClient.invalidateQueries({ queryKey: ['board-columns', boardId] })
      void queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    },
  })

  const columns = columnsQuery.data ?? NO_COLUMNS

  // "n" drops a new task into the first column, unless something is already open on top.
  useHotkeys(['n'], () => {
    const first = columns[0]
    if (!first || document.querySelector('[role="dialog"]')) return
    setAddTaskForColumn(first.id)
  })
  const tasks = tasksQuery.data?.rows ?? NO_TASKS
  const isFiltering = Boolean(
    taskFilters.search ||
    taskFilters.priority ||
    taskFilters.assigneeId ||
    taskFilters.statusId ||
    taskFilters.archived,
  )
  // Regrouped only when the task list itself changes, not on every render.
  const tasksByColumn = useMemo(() => groupTasksByColumn(tasks), [tasks])
  const tiles = useMemo(() => tilesFromTasks(tasks), [tasks])

  // Stable handlers, so memoized columns and cards skip renders they don't need.
  const handleDrop = useCallback(
    (event: DragEvent, index: number | null): void => {
      event.preventDefault()
      if (draggingId) {
        moveColumn({ columnId: draggingId, toPosition: index ?? columns.length - 1 })
      }
      setDraggingId(null)
      setDropIndex(null)
    },
    [draggingId, columns.length, moveColumn],
  )
  const handleColumnDragStart = useCallback((columnId: string, event: DragEvent) => {
    setDraggingId(columnId)
    event.dataTransfer.effectAllowed = 'move'
  }, [])
  const handleColumnDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropIndex(null)
  }, [])
  const handleColumnDragOver = useCallback(
    (columnId: string, index: number) => {
      if (draggingTaskId !== null) {
        setTaskDropColumn(columnId)
      } else {
        setDropIndex(index)
      }
    },
    [draggingTaskId],
  )
  const handleColumnDrop = useCallback(
    (columnId: string, index: number, event: DragEvent) => {
      if (draggingTaskId) {
        const draggedTask = tasks.find((task) => task.id === draggingTaskId)
        if (draggedTask && draggedTask.columnId !== columnId) {
          moveTask({ taskId: draggingTaskId, columnId })
        }
        setDraggingTaskId(null)
        setTaskDropColumn(null)
      } else {
        handleDrop(event, index)
      }
    },
    [draggingTaskId, tasks, moveTask, handleDrop],
  )
  const handleRenameColumn = useCallback(
    (columnId: string, name: string) => renameColumn({ columnId, name }),
    [renameColumn],
  )
  const handleCancelRename = useCallback(() => setEditingNameId(null), [])
  const handleOpenTask = useCallback(
    (taskId: string) => navigate(`/app/tasks/${taskId}`),
    [navigate],
  )
  const handleTaskDragStart = useCallback((taskId: string, event: DragEvent) => {
    setDraggingTaskId(taskId)
    event.dataTransfer.effectAllowed = 'move'
  }, [])
  const handleTaskDragEnd = useCallback(() => {
    setDraggingTaskId(null)
    setTaskDropColumn(null)
  }, [])
  const handleMoveTask = useCallback(
    (taskId: string, columnId: string) => moveTask({ taskId, columnId }),
    [moveTask],
  )

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
            {columns.map((column, index) => (
              <BoardColumn
                key={column.id}
                column={column}
                index={index}
                columns={columns}
                tasks={tasksByColumn.get(column.id)}
                isLoadingTasks={tasksQuery.isPending}
                isFiltering={isFiltering}
                isEditingName={editingNameId === column.id}
                canDrag={draggingTaskId === null && editingNameId !== column.id}
                isBeingDragged={draggingId === column.id}
                isColumnTarget={
                  dropIndex === index && draggingId !== column.id && draggingTaskId === null
                }
                isTaskTarget={taskDropColumn === column.id && draggingTaskId !== null}
                draggingTaskId={draggingTaskId}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragEnd={handleColumnDragEnd}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onStartRename={setEditingNameId}
                onCancelRename={handleCancelRename}
                onRename={handleRenameColumn}
                onDelete={deleteColumn}
                onAddTask={setAddTaskForColumn}
                onOpenTask={handleOpenTask}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragEnd={handleTaskDragEnd}
                onMoveTask={handleMoveTask}
              />
            ))}

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
