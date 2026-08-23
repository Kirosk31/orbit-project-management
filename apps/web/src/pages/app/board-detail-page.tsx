import { zodResolver } from '@hookform/resolvers/zod'
import { createColumnSchema, createTaskSchema, updateBoardSchema } from '@orbit/shared'
import type { SavedTaskFilterValues } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CircleIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  RadioIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { DragEvent, ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { TaskBoardFilters } from '@/features/tasks/task-board-filters'
import { useProjectRealtime } from '@/features/realtime/use-project-realtime'
import { formatDate, getContrastTextColor, initialsOf } from '@/lib/utils'

const COLUMN_COLORS = ['#94a3b8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7']
const PRIORITY_COLORS: Record<string, string> = {
  NONE: '#94a3b8',
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  URGENT: '#7c3aed',
}

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

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoardRequest(boardId),
  })

  const board = boardQuery.data
  const onlineUserIds = useProjectRealtime(board?.projectId ?? '')

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
      <div className="mx-auto w-full max-w-6xl p-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-72 w-full" />
      </div>
    )
  }

  if (boardQuery.isError || !board) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>{t('org.permissionDenied')}</CardTitle>
            <CardDescription>
              <Button variant="link" onClick={() => navigate('/app/projects')}>
                {t('projects.backToProjects')}
              </Button>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => navigate(`/app/projects/${board.projectId}`)}
        >
          <ArrowLeftIcon />
          {t('boards.backToProject')}
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
              <Badge variant="outline" title={t('boards.realtimePresence')}>
                <RadioIcon className="size-3" />
                {t('boards.onlineCount', { count: onlineUserIds.length })}
              </Badge>
              {board.isArchived && <Badge>{t('projects.archived')}</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">
              {board.description || t('boards.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PencilIcon />
                  {t('boards.edit')}
                </Button>
              </DialogTrigger>
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
                      <p className="text-destructive text-xs">
                        {editForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="board-description">{t('boards.description')}</Label>
                    <Input id="board-description" {...editForm.register('description')} />
                  </div>
                  <Button type="submit" disabled={updateMutation.isPending} className="self-start">
                    {t('boards.save')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate(!board.isArchived)}
              disabled={archiveMutation.isPending}
            >
              <ArchiveIcon />
              {board.isArchived ? t('boards.unarchive') : t('boards.archive')}
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2Icon />
                  {t('boards.delete')}
                </Button>
              </DialogTrigger>
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
          </div>
        </div>

        <TaskBoardFilters boardId={boardId} filters={taskFilters} onChange={setTaskFilters} />

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <GripVerticalIcon className="size-3.5" />
          {t('boards.dragHint')}
        </div>

        {columnsQuery.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div
            className="flex items-start gap-4 overflow-x-auto pb-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, null)}
          >
            {columns.map((column, index) => {
              const overLimit = column.wipLimit !== null && column.taskCount > column.wipLimit
              const columnTasks = tasksByColumn.get(column.id) ?? []
              return (
                <div
                  key={column.id}
                  draggable={draggingTaskId === null}
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
                      if (draggingTaskId !== null && column.id !== taskDropColumn) {
                        moveTaskMutation.mutate({ taskId: draggingTaskId, columnId: column.id })
                      }
                      setDraggingTaskId(null)
                      setTaskDropColumn(null)
                    } else {
                      handleDrop(event, index)
                    }
                  }}
                  className={`flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow ${
                    draggingId === column.id ? 'opacity-50' : ''
                  } ${
                    dropIndex === index && draggingId !== column.id && draggingTaskId === null
                      ? 'ring-2 ring-primary'
                      : ''
                  } ${
                    taskDropColumn === column.id && draggingTaskId !== null
                      ? 'bg-primary/5 ring-2 ring-primary'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVerticalIcon className="text-muted-foreground size-4 cursor-grab" />
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
                        <Input name="name" autoFocus defaultValue={column.name} className="h-8" />
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
                        onDoubleClick={() => setEditingNameId(column.id)}
                        title={column.name}
                      >
                        {column.name}
                      </button>
                    )}
                    <Badge
                      variant="secondary"
                      className={overLimit ? 'bg-destructive text-destructive-foreground' : ''}
                    >
                      {isFiltering ? `${columnTasks.length}/${column.taskCount}` : column.taskCount}
                      {column.wipLimit !== null && `/${column.wipLimit}`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={t('boards.deleteColumn')}
                      onClick={() => deleteColumnMutation.mutate(column.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  {column.wipLimit !== null && (
                    <p
                      className={`text-xs ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {overLimit
                        ? t('boards.overLimit')
                        : t('boards.maxTasks', { count: column.wipLimit })}
                    </p>
                  )}

                  {tasksQuery.isPending ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {columnTasks.map((task) => (
                        <li key={task.id}>
                          <TaskCard
                            task={task}
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
                        </li>
                      ))}
                      {columnTasks.length === 0 && !tasksQuery.isPending && (
                        <li className="text-muted-foreground py-2 text-center text-xs">
                          {t('tasks.empty')}
                        </li>
                      )}
                    </ul>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 self-start"
                    onClick={() => setAddTaskForColumn(column.id)}
                  >
                    <PlusIcon className="size-3.5" />
                    {t('tasks.addTask')}
                  </Button>
                </div>
              )
            })}

            <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-16 w-72 shrink-0 border-dashed">
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
                      <p className="text-destructive text-xs">
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
                      placeholder="—"
                      {...addColumnForm.register('wipLimit', { valueAsNumber: true })}
                    />
                    <p className="text-muted-foreground text-xs">{t('boards.wipLimitHint')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('projects.color')}</Label>
                    <div className="flex gap-2">
                      {COLUMN_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          onClick={() => addColumnForm.setValue('color', color)}
                          className={`size-6 rounded-full transition-transform ${
                            addColumnForm.watch('color') === color
                              ? 'ring-ring ring-2 ring-offset-2'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={addColumnMutation.isPending}
                    className="self-start"
                  >
                    {t('boards.addColumn')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

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
                      <p className="text-destructive text-xs">
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
                      <SelectTrigger id="task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {t(`tasks.priority${priority}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={addTaskMutation.isPending} className="self-start">
                    {t('tasks.addTask')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: {
    id: string
    title: string
    priority: string
    isCompleted: boolean
    dueDate: string | null
    labels: Array<{ id: string; labelId: string; name: string; color: string }>
    assignees: Array<{ id: string; userId: string; fullName: string; avatarKey: string | null }>
  }
  onOpen: () => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
}

function TaskCard({ task, onOpen, onDragStart, onDragEnd }: TaskCardProps): ReactNode {
  const { i18n } = useTranslation()

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-md border bg-background p-2.5 text-left shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-2">
        <CircleIcon
          className="mt-0.5 size-3 shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority] ?? '#94a3b8' }}
          fill={task.isCompleted ? 'currentColor' : 'none'}
        />
        <span
          className={`min-w-0 flex-1 text-sm font-medium ${task.isCompleted ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </span>
      </div>
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                backgroundColor: label.color,
                color: getContrastTextColor(label.color),
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {task.dueDate ? (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <CalendarIcon className="size-3" />
            {formatDate(task.dueDate, i18n.resolvedLanguage ?? i18n.language)}
          </span>
        ) : (
          <span />
        )}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
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
          </div>
        )}
      </div>
    </button>
  )
}
