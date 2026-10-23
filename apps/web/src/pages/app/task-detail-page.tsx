import { zodResolver } from '@hookform/resolvers/zod'
import { createLabelSchema } from '@orbit/shared'
import type { updateTaskSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { ColorSwatchPicker } from '@/components/shared/color-swatch-picker'
import { EmptyState, PageContainer } from '@/components/shared/page'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { DueDate, PriorityMark } from '@/features/tasks/task-meta'
import { COLUMN_COLORS } from '@/lib/task-colors'
import { cn, formatRelativeTime, initialsOf } from '@/lib/utils'

const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const LABEL_COLORS = COLUMN_COLORS

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
      <PageContainer width="wide">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
      </PageContainer>
    )
  }

  if (taskQuery.isError || !task) {
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

  const assignedIds = new Set(task.assignees.map((a) => a.userId))
  const attachedLabelIds = new Set(task.labels.map((l) => l.labelId))
  const members = membersQuery.data ?? []
  const orgLabels = labelsQuery.data ?? []
  const activity = activityQuery.data ?? []
  const assignable = members.filter((member) => !assignedIds.has(member.userId))
  const attachable = orgLabels.filter((label) => !attachedLabelIds.has(label.id))

  return (
    <PageContainer width="wide">
      <Button
        variant="link"
        size="sm"
        className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground"
        onClick={() =>
          navigate(
            task.parentId ? `/app/tasks/${task.parentId}` : `/app/boards/${task.boardId ?? ''}`,
          )
        }
      >
        <ArrowLeftIcon className="size-3.5" />
        {task.parentId ? t('tasks.backToParent') : t('tasks.backToBoard')}
      </Button>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="min-w-0">
          <header className="mb-8 flex items-start gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-pressed={task.isCompleted}
              aria-label={task.isCompleted ? t('tasks.incomplete') : t('tasks.complete')}
              title={task.isCompleted ? t('tasks.incomplete') : t('tasks.complete')}
              onClick={() => updateMutation.mutate({ isCompleted: !task.isCompleted })}
              className={cn(
                'mt-1 flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200',
                task.isCompleted
                  ? 'border-success bg-success text-success-foreground'
                  : 'border-input text-transparent hover:border-success hover:text-success',
              )}
            >
              <CheckIcon className="size-4" strokeWidth={3} />
            </motion.button>
            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <form
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
                  <Input
                    name="title"
                    autoFocus
                    defaultValue={task.title}
                    aria-label={t('tasks.editTitle')}
                    className="h-10 text-xl font-semibold"
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setEditingTitle(false)
                    }}
                  />
                </form>
              ) : (
                <div className="group flex items-start gap-2">
                  <h1
                    className={cn(
                      'text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]',
                      task.isCompleted && 'text-muted-foreground',
                    )}
                    onDoubleClick={() => setEditingTitle(true)}
                  >
                    {task.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-1 size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t('tasks.editTitle')}
                    onClick={() => setEditingTitle(true)}
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{task.statusName}</Badge>
                {task.isCompleted && <Badge variant="success">{t('tasks.completedState')}</Badge>}
                {task.isArchived && <Badge variant="warning">{t('projects.archived')}</Badge>}
              </div>
            </div>
          </header>

          <section aria-labelledby="task-description-heading" className="mb-10">
            <h2 id="task-description-heading" className="mb-2 text-sm font-semibold">
              {t('tasks.description')}
            </h2>
            <Textarea
              defaultValue={task.description ?? ''}
              aria-labelledby="task-description-heading"
              placeholder={t('tasks.descriptionPlaceholder')}
              className="min-h-40 max-w-[72ch] border-transparent bg-transparent px-0 text-[0.9375rem] leading-relaxed hover:border-input hover:px-3 focus-visible:border-ring focus-visible:bg-card focus-visible:px-3"
              onBlur={(event) => {
                const value = event.currentTarget.value
                if (value !== (task.description ?? '')) {
                  updateMutation.mutate({ description: value })
                }
              }}
            />
          </section>

          <div className="flex flex-col [&>[data-slot=card]]:gap-4 [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:border-x-0 [&>[data-slot=card]]:border-b-0 [&>[data-slot=card]]:bg-transparent [&>[data-slot=card]]:py-7 [&>[data-slot=card]>[data-slot=card-content]]:px-0 [&>[data-slot=card]>[data-slot=card-header]]:px-0">
            {!task.parentId && <TaskSubtasks taskId={task.id} />}
            <TaskChecklists taskId={task.id} />
            <TaskTimeTracking taskId={task.id} trackedSeconds={task.trackedSeconds} />
            <TaskAttachments taskId={task.id} />
            <TaskComments taskId={task.id} members={members} />
          </div>

          <section aria-labelledby="task-activity-heading" className="border-t pt-7">
            <h2 id="task-activity-heading" className="mb-4 text-sm font-semibold">
              {t('tasks.activity')}
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('tasks.noActivity')}</p>
            ) : (
              <ol className="relative ml-1 flex flex-col gap-3 border-l pl-5">
                {activity.map((row) => (
                  <li key={row.id} className="relative text-sm">
                    <span
                      className="absolute top-1.5 -left-[1.5625rem] size-2 rounded-[2px] bg-border"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{row.actorName}</span>{' '}
                    <span className="text-muted-foreground">
                      {t(
                        ACTIVITY_LABELS[row.action as keyof typeof ACTIVITY_LABELS] ??
                          'tasks.activityUpdated',
                        { defaultValue: row.action },
                      )}
                    </span>{' '}
                    <time
                      dateTime={row.createdAt}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {formatRelativeTime(row.createdAt, i18n.language)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </article>

        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label={t('tasks.details')}>
          <div className="rounded-lg border bg-card">
            <div className="divide-y">
              <PropertyRow label={t('tasks.status')}>
                <span className="text-sm">{task.statusName}</span>
              </PropertyRow>

              <PropertyRow label={t('tasks.priority')} htmlFor="task-priority">
                <Select
                  value={task.priority}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      priority: value as z.output<typeof updateTaskSchema>['priority'],
                    })
                  }
                >
                  <SelectTrigger id="task-priority" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        <PriorityMark priority={priority} showLabel />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow label={t('tasks.dueDate')} htmlFor="task-due">
                <Input
                  id="task-due"
                  type="date"
                  className="h-8"
                  defaultValue={task.dueDate?.slice(0, 10) ?? ''}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    updateMutation.mutate({
                      dueDate: value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null,
                    })
                  }}
                />
                {task.dueDate && !task.isCompleted && (
                  <DueDate
                    dueDate={task.dueDate}
                    isCompleted={task.isCompleted}
                    className="mt-1.5"
                  />
                )}
              </PropertyRow>

              <PropertyRow
                label={t('tasks.assignees')}
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t('tasks.addAssignee')}
                      >
                        <UserPlusIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      {assignable.length === 0 ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t('tasks.everyoneAssigned')}
                        </p>
                      ) : (
                        assignable.map((member) => (
                          <DropdownMenuItem
                            key={member.userId}
                            onSelect={() => assignMutation.mutate(member.userId)}
                          >
                            <Avatar className="size-5">
                              <SecureAvatarImage
                                userId={member.userId}
                                avatarKey={member.avatarKey}
                                alt={member.fullName}
                              />
                              <AvatarFallback className="text-[0.6875rem] tracking-tighter">
                                {initialsOf(member.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{member.fullName}</span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                {task.assignees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('tasks.noAssignees')}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {task.assignees.map((assignee) => (
                      <li key={assignee.id} className="group flex items-center gap-2 text-sm">
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
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                          aria-label={t('tasks.removeAssignee', { name: assignee.fullName })}
                          onClick={() => unassignMutation.mutate(assignee.userId)}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </PropertyRow>

              <PropertyRow
                label={t('tasks.labels')}
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t('tasks.addLabel')}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {attachable.map((label) => (
                        <DropdownMenuItem
                          key={label.id}
                          onSelect={() => attachLabelMutation.mutate(label.id)}
                        >
                          <span
                            className="size-2.5 rounded-[2px]"
                            style={{ backgroundColor: label.color }}
                            aria-hidden="true"
                          />
                          {label.name}
                        </DropdownMenuItem>
                      ))}
                      {attachable.length > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem onSelect={() => setCreateLabelOpen(true)}>
                        <TagIcon />
                        {t('tasks.createLabel')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                {task.labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('tasks.noLabels')}</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {task.labels.map((label) => (
                      <li
                        key={label.id}
                        className="inline-flex items-center gap-1 rounded-sm bg-muted py-0.5 pr-0.5 pl-2 text-xs font-medium"
                      >
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: label.color }}
                          aria-hidden="true"
                        />
                        {label.name}
                        <button
                          type="button"
                          className="rounded-[3px] p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={t('tasks.removeLabel', { name: label.name })}
                          onClick={() => detachLabelMutation.mutate(label.labelId)}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PropertyRow>
            </div>
            <div className="flex flex-wrap gap-1 border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => archiveMutation.mutate(!task.isArchived)}
                disabled={archiveMutation.isPending}
              >
                <ArchiveIcon />
                {task.isArchived ? t('tasks.unarchive') : t('tasks.archive')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon />
                {t('tasks.delete')}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

      <Dialog open={createLabelOpen} onOpenChange={setCreateLabelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.createLabel')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createLabelForm.handleSubmit((values) => createLabelMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="label-name">{t('tasks.labelName')}</Label>
              <Input id="label-name" autoFocus {...createLabelForm.register('name')} />
              {createLabelForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {createLabelForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label id="label-color-label">{t('projects.color')}</Label>
              <ColorSwatchPicker
                labelledBy="label-color-label"
                colors={LABEL_COLORS}
                value={createLabelForm.watch('color') ?? LABEL_COLORS[0] ?? ''}
                onChange={(color) => createLabelForm.setValue('color', color)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createLabelMutation.isPending}>
                {t('tasks.createLabel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function PropertyRow({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string
  htmlFor?: string
  action?: ReactNode
  children: ReactNode
}): ReactNode {
  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex min-h-7 items-center justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
            {label}
          </label>
        ) : (
          <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
        )}
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}
