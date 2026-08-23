import { zodResolver } from '@hookform/resolvers/zod'
import { createLabelSchema } from '@orbit/shared'
import type { updateTaskSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  CircleDotIcon,
  FlagIcon,
  HistoryIcon,
  PlusIcon,
  RotateCcwIcon,
  TagIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { listMembersRequest } from '@/features/organizations/org-api'
import { TaskComments } from '@/features/comments/task-comments'
import {
  addAssigneeRequest,
  addTaskLabelRequest,
  archiveTaskRequest,
  createOrgLabelRequest,
  deleteTaskRequest,
  getTaskRequest,
  listOrgLabelsRequest,
  listTaskActivityRequest,
  removeAssigneeRequest,
  removeTaskLabelRequest,
  unarchiveTaskRequest,
  updateTaskRequest,
} from '@/features/tasks/task-api'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { TaskSubtasks } from '@/features/tasks/task-subtasks'
import { TaskChecklists } from '@/features/tasks/task-checklists'
import { TaskTimeTracking } from '@/features/tasks/task-time-tracking'
import { TaskAttachments } from '@/features/tasks/task-attachments'
import { useProjectRealtime } from '@/features/realtime/use-project-realtime'
import { formatRelativeTime, getContrastTextColor, initialsOf } from '@/lib/utils'

const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const PRIORITY_COLORS: Record<string, string> = {
  NONE: '#94a3b8',
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  URGENT: '#7c3aed',
}
const LABEL_COLORS = ['#94a3b8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7']

const ACTIVITY_LABELS = {
  'task.created': 'tasks.activityCreated',
  'task.updated': 'tasks.activityUpdated',
  'task.deleted': 'tasks.activityDeleted',
  'task.archived': 'tasks.activityArchived',
  'task.restored': 'tasks.activityRestored',
  'task.moved': 'tasks.activityMoved',
  'task.assignee_added': 'tasks.activityAssigneeAdded',
  'task.assignee_removed': 'tasks.activityAssigneeRemoved',
  'task.label_added': 'tasks.activityLabelAdded',
  'task.label_removed': 'tasks.activityLabelRemoved',
  'task.subtask_created': 'tasks.activitySubtaskCreated',
  'task.checklist_created': 'tasks.activityChecklistCreated',
  'task.checklist_updated': 'tasks.activityChecklistUpdated',
  'task.checklist_deleted': 'tasks.activityChecklistDeleted',
  'task.checklist_item_created': 'tasks.activityChecklistItemCreated',
  'task.checklist_item_updated': 'tasks.activityChecklistItemUpdated',
  'task.checklist_item_deleted': 'tasks.activityChecklistItemDeleted',
  'task.checklist_item_moved': 'tasks.activityChecklistItemMoved',
  'task.time_logged': 'tasks.activityTimeLogged',
  'task.timer_started': 'tasks.activityTimerStarted',
  'task.timer_stopped': 'tasks.activityTimerStopped',
  'task.time_entry_updated': 'tasks.activityTimeEntryUpdated',
  'task.time_entry_deleted': 'tasks.activityTimeEntryDeleted',
  'task.attachment_uploaded': 'tasks.activityAttachmentUploaded',
  'task.attachment_deleted': 'tasks.activityAttachmentDeleted',
} as const

export function TaskDetailPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createLabelOpen, setCreateLabelOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskRequest(taskId),
  })

  const task = taskQuery.data
  useProjectRealtime(task?.projectId ?? '')

  const membersQuery = useQuery({
    queryKey: ['org-members', task?.orgId],
    queryFn: () => listMembersRequest(task!.orgId),
    enabled: task !== undefined,
  })

  const labelsQuery = useQuery({
    queryKey: ['org-labels', task?.orgId],
    queryFn: () => listOrgLabelsRequest(task!.orgId),
    enabled: task !== undefined,
  })

  const activityQuery = useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: () => listTaskActivityRequest(taskId),
    enabled: task !== undefined,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
    queryClient.invalidateQueries({ queryKey: ['board-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['org-labels'] })
  }

  const updateMutation = useMutation({
    mutationFn: (input: z.output<typeof updateTaskSchema>) => updateTaskRequest(taskId, input),
    onSuccess: () => {
      invalidate()
      setEditingTitle(false)
      toast.success(t('tasks.updated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const archiveMutation = useMutation({
    mutationFn: (archive: boolean) =>
      archive ? archiveTaskRequest(taskId) : unarchiveTaskRequest(taskId),
    onSuccess: () => {
      invalidate()
      toast.success(task?.isArchived ? t('tasks.restored') : t('tasks.archived'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTaskRequest(taskId),
    onSuccess: () => {
      toast.success(t('tasks.deleted'))
      navigate(
        task?.parentId ? `/app/tasks/${task.parentId}` : `/app/boards/${task?.boardId ?? ''}`,
      )
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const assignMutation = useMutation({
    mutationFn: (userId: string) => addAssigneeRequest(taskId, userId),
    onSuccess: (updated) => {
      invalidate()
      toast.success(t('tasks.assigneeAdded'))
      void updated
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => removeAssigneeRequest(taskId, userId),
    onSuccess: () => {
      invalidate()
      toast.success(t('tasks.assigneeRemoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const attachLabelMutation = useMutation({
    mutationFn: (labelId: string) => addTaskLabelRequest(taskId, labelId),
    onSuccess: () => {
      invalidate()
      toast.success(t('tasks.labelAdded'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const detachLabelMutation = useMutation({
    mutationFn: (labelId: string) => removeTaskLabelRequest(taskId, labelId),
    onSuccess: () => {
      invalidate()
      toast.success(t('tasks.labelRemoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const createLabelForm = useForm<
    z.input<typeof createLabelSchema>,
    unknown,
    z.output<typeof createLabelSchema>
  >({
    resolver: zodResolver(createLabelSchema),
    defaultValues: { name: '', color: LABEL_COLORS[0] },
  })

  const createLabelMutation = useMutation({
    mutationFn: (input: z.output<typeof createLabelSchema>) =>
      createOrgLabelRequest(task!.orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-labels', task?.orgId] })
      setCreateLabelOpen(false)
      createLabelForm.reset()
      toast.success(t('tasks.labelCreated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  if (taskQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }

  if (taskQuery.isError || !task) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
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

  const assignedIds = new Set(task.assignees.map((a) => a.userId))
  const attachedLabelIds = new Set(task.labels.map((l) => l.labelId))
  const members = membersQuery.data ?? []
  const orgLabels = labelsQuery.data ?? []
  const activity = activityQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          className="self-start"
          onClick={() =>
            navigate(
              task.parentId ? `/app/tasks/${task.parentId}` : `/app/boards/${task.boardId ?? ''}`,
            )
          }
        >
          <ArrowLeftIcon />
          {task.parentId ? t('tasks.backToParent') : t('tasks.backToBoard')}
        </Button>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Button
                variant="outline"
                size="icon"
                className="mt-1 shrink-0"
                aria-label={task.isCompleted ? t('tasks.incomplete') : t('tasks.complete')}
                onClick={() => updateMutation.mutate({ isCompleted: !task.isCompleted })}
              >
                {task.isCompleted ? (
                  <RotateCcwIcon />
                ) : (
                  <CheckIcon className={task.isCompleted ? 'text-primary' : ''} />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const input = event.currentTarget.elements.namedItem(
                        'title',
                      ) as HTMLInputElement
                      if (input.value.trim()) {
                        updateMutation.mutate({ title: input.value.trim() })
                      }
                    }}
                  >
                    <Input name="title" autoFocus defaultValue={task.title} />
                  </form>
                ) : (
                  <h1
                    className="cursor-text text-2xl font-semibold tracking-tight"
                    onDoubleClick={() => setEditingTitle(true)}
                    title={t('boards.edit')}
                  >
                    {task.title}
                  </h1>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{task.statusName}</Badge>
                  <Badge
                    style={{
                      backgroundColor: PRIORITY_COLORS[task.priority] ?? '#64748b',
                      color: getContrastTextColor(PRIORITY_COLORS[task.priority] ?? '#64748b'),
                    }}
                  >
                    {t(`tasks.priority${task.priority}`)}
                  </Badge>
                  {task.isArchived && <Badge>{t('projects.archived')}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => archiveMutation.mutate(!task.isArchived)}
                disabled={archiveMutation.isPending}
              >
                <ArchiveIcon />
                {task.isArchived ? t('tasks.unarchive') : t('tasks.archive')}
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2Icon />
                    {t('tasks.delete')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('tasks.delete')}</DialogTitle>
                    <DialogDescription>{t('tasks.deleteConfirm')}</DialogDescription>
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
                      {t('tasks.delete')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-4 md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('tasks.description')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    defaultValue={task.description ?? ''}
                    placeholder={t('tasks.descriptionPlaceholder')}
                    className="min-h-32"
                    onBlur={(event) => {
                      const value = event.currentTarget.value
                      if (value !== (task.description ?? '')) {
                        updateMutation.mutate({ description: value })
                      }
                    }}
                  />
                </CardContent>
              </Card>

              {!task.parentId && <TaskSubtasks taskId={task.id} />}

              <TaskChecklists taskId={task.id} />

              <TaskTimeTracking taskId={task.id} trackedSeconds={task.trackedSeconds} />

              <TaskAttachments taskId={task.id} />

              <TaskComments taskId={task.id} members={members} />

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{t('tasks.activity')}</CardTitle>
                  <HistoryIcon className="text-muted-foreground size-4" />
                </CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('tasks.noActivity')}</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {activity.map((row) => (
                        <li key={row.id} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-muted-foreground">•</span>
                          <span>
                            <span className="font-medium">{row.actorName}</span>{' '}
                            <span className="text-muted-foreground">
                              {t(
                                ACTIVITY_LABELS[row.action as keyof typeof ACTIVITY_LABELS] ??
                                  'tasks.activityUpdated',
                                { defaultValue: row.action },
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {' · '}
                              {formatRelativeTime(row.createdAt, i18n.language)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('tasks.details')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-priority">
                      <FlagIcon className="mr-1 inline size-3.5" />
                      {t('tasks.priority')}
                    </Label>
                    <Select
                      value={task.priority}
                      onValueChange={(value) =>
                        updateMutation.mutate({
                          priority: value as z.output<typeof updateTaskSchema>['priority'],
                        })
                      }
                    >
                      <SelectTrigger id="task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {t(`tasks.priority${priority}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-due">
                      <CalendarIcon className="mr-1 inline size-3.5" />
                      {t('tasks.dueDate')}
                    </Label>
                    <Input
                      id="task-due"
                      type="date"
                      defaultValue={task.dueDate?.slice(0, 10) ?? ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value
                        updateMutation.mutate({
                          dueDate: value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null,
                        })
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UsersIcon className="size-4" />
                    {t('tasks.assignees')}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('tasks.addAssignee')}
                    onClick={() => {
                      const next = members.find((m) => !assignedIds.has(m.userId))
                      if (next) assignMutation.mutate(next.userId)
                    }}
                  >
                    <UserPlusIcon className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {task.assignees.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('tasks.noAssignees')}</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {task.assignees.map((assignee) => (
                        <li key={assignee.id} className="flex items-center gap-2 text-sm">
                          <Avatar className="size-6">
                            <SecureAvatarImage
                              userId={assignee.userId}
                              avatarKey={assignee.avatarKey}
                              alt={assignee.fullName}
                            />
                            <AvatarFallback>{initialsOf(assignee.fullName)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">{assignee.fullName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7"
                            aria-label={t('tasks.assigneeRemoved')}
                            onClick={() => unassignMutation.mutate(assignee.userId)}
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TagIcon className="size-4" />
                    {t('tasks.labels')}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('tasks.addLabel')}
                    onClick={() => {
                      const next = orgLabels.find((l) => !attachedLabelIds.has(l.id))
                      if (next) attachLabelMutation.mutate(next.id)
                    }}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {task.labels.length === 0 && orgLabels.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('tasks.noLabels')}</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {task.labels.map((label) => (
                        <li key={label.id}>
                          <Badge
                            className="cursor-pointer"
                            style={{
                              backgroundColor: label.color,
                              color: getContrastTextColor(label.color),
                            }}
                            onClick={() => detachLabelMutation.mutate(label.labelId)}
                            title={t('tasks.labelRemoved')}
                          >
                            {label.name} ×
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {orgLabels
                      .filter((label) => !attachedLabelIds.has(label.id))
                      .map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          className="rounded-full px-2 py-0.5 text-xs transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-1"
                          style={{
                            backgroundColor: label.color,
                            color: getContrastTextColor(label.color),
                          }}
                          onClick={() => attachLabelMutation.mutate(label.id)}
                        >
                          + {label.name}
                        </button>
                      ))}
                  </div>
                  <Dialog open={createLabelOpen} onOpenChange={setCreateLabelOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="self-start">
                        <CircleDotIcon className="size-3.5" />
                        {t('tasks.createLabel')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('tasks.createLabel')}</DialogTitle>
                        <DialogDescription>{t('boards.createDescription')}</DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={createLabelForm.handleSubmit((values) =>
                          createLabelMutation.mutate(values),
                        )}
                        className="flex flex-col gap-4"
                      >
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="label-name">{t('tasks.labelName')}</Label>
                          <Input id="label-name" autoFocus {...createLabelForm.register('name')} />
                          {createLabelForm.formState.errors.name && (
                            <p className="text-destructive text-xs">
                              {createLabelForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>{t('projects.color')}</Label>
                          <div className="flex gap-2">
                            {LABEL_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                aria-label={color}
                                onClick={() => createLabelForm.setValue('color', color)}
                                className={`size-6 rounded-full transition-transform ${
                                  createLabelForm.watch('color') === color
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
                          disabled={createLabelMutation.isPending}
                          className="self-start"
                        >
                          {t('tasks.createLabel')}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
