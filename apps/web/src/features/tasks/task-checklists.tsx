import { zodResolver } from '@hookform/resolvers/zod'
import { createChecklistItemSchema, createChecklistSchema, type ChecklistDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CircleIcon,
  ListTodoIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  createChecklistItemRequest,
  createChecklistRequest,
  deleteChecklistItemRequest,
  deleteChecklistRequest,
  listChecklistsRequest,
  moveChecklistItemRequest,
  updateChecklistItemRequest,
  updateChecklistRequest,
} from '@/features/tasks/task-api'

interface ChecklistCardProps {
  checklist: ChecklistDto
  isMutating: boolean
  onRename: (checklistId: string, title: string) => void
  onDelete: (checklistId: string) => void
  onCreateItem: (checklistId: string, title: string, onSuccess: () => void) => void
  onToggleItem: (checklistId: string, itemId: string, isCompleted: boolean) => void
  onDeleteItem: (checklistId: string, itemId: string) => void
  onMoveItem: (checklistId: string, itemId: string, toPosition: number) => void
}

function ChecklistCard({
  checklist,
  isMutating,
  onRename,
  onDelete,
  onCreateItem,
  onToggleItem,
  onDeleteItem,
  onMoveItem,
}: ChecklistCardProps): ReactNode {
  const { t } = useTranslation()
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(checklist.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const itemForm = useForm<
    z.input<typeof createChecklistItemSchema>,
    unknown,
    z.output<typeof createChecklistItemSchema>
  >({
    resolver: zodResolver(createChecklistItemSchema),
    defaultValues: { title: '' },
  })

  const progress =
    checklist.totalItems === 0
      ? 0
      : Math.round((checklist.completedItems / checklist.totalItems) * 100)
  const progressLabel = t('tasks.checklistProgress', {
    completed: String(checklist.completedItems),
    total: String(checklist.totalItems),
  })

  const saveTitle = (): void => {
    const title = titleDraft.trim()
    if (!title || title === checklist.title) {
      setTitleDraft(checklist.title)
      setEditingTitle(false)
      return
    }
    onRename(checklist.id, title)
    setEditingTitle(false)
  }

  return (
    <section className="rounded-lg border p-4" aria-labelledby={`checklist-${checklist.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editingTitle ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              saveTitle()
            }}
          >
            <Input
              value={titleDraft}
              maxLength={100}
              autoFocus
              aria-label={t('tasks.checklistName')}
              onChange={(event) => setTitleDraft(event.currentTarget.value)}
            />
            <Button type="submit" size="icon" disabled={isMutating || !titleDraft.trim()}>
              <CheckIcon />
              <span className="sr-only">{t('common.save')}</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                setTitleDraft(checklist.title)
                setEditingTitle(false)
              }}
            >
              <XIcon />
              <span className="sr-only">{t('common.cancel')}</span>
            </Button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 id={`checklist-${checklist.id}`} className="truncate font-medium">
                {checklist.title}
              </h3>
              <Badge variant="secondary">{progressLabel}</Badge>
            </div>
            <Progress className="mt-2" value={progress} aria-label={progressLabel} />
          </div>
        )}

        {!editingTitle && (
          <div className="flex items-center gap-1">
            {confirmingDelete ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isMutating}
                  onClick={() => onDelete(checklist.id)}
                >
                  {t('common.confirm')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                >
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingTitle(true)}
                >
                  <PencilIcon />
                  <span className="sr-only">{t('tasks.renameChecklist')}</span>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2Icon />
                  <span className="sr-only">{t('tasks.deleteChecklist')}</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {checklist.items.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{t('tasks.noChecklistItems')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {checklist.items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-1 rounded-md border p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={isMutating}
                aria-label={item.isCompleted ? t('tasks.incomplete') : t('tasks.complete')}
                onClick={() => onToggleItem(checklist.id, item.id, !item.isCompleted)}
              >
                {item.isCompleted ? <CheckIcon /> : <CircleIcon />}
              </Button>
              <span
                className={`min-w-0 flex-1 text-sm ${
                  item.isCompleted ? 'text-muted-foreground line-through' : ''
                }`}
              >
                {item.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isMutating || index === 0}
                aria-label={t('tasks.moveChecklistItemUp')}
                onClick={() => onMoveItem(checklist.id, item.id, index - 1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isMutating || index === checklist.items.length - 1}
                aria-label={t('tasks.moveChecklistItemDown')}
                onClick={() => onMoveItem(checklist.id, item.id, index + 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isMutating}
                aria-label={t('tasks.deleteChecklistItem')}
                onClick={() => onDeleteItem(checklist.id, item.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={itemForm.handleSubmit((input) =>
          onCreateItem(checklist.id, input.title, () => itemForm.reset()),
        )}
      >
        <Input
          className="flex-1"
          placeholder={t('tasks.checklistItemPlaceholder')}
          aria-label={t('tasks.addChecklistItem')}
          aria-invalid={itemForm.formState.errors.title ? true : undefined}
          {...itemForm.register('title')}
        />
        <Button type="submit" variant="secondary" disabled={isMutating}>
          <PlusIcon />
          {t('tasks.addChecklistItem')}
        </Button>
      </form>
    </section>
  )
}

export function TaskChecklists({ taskId }: { taskId: string }): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const queryKey = ['task-checklists', taskId] as const
  const query = useQuery({ queryKey, queryFn: () => listChecklistsRequest(taskId) })
  const createForm = useForm<
    z.input<typeof createChecklistSchema>,
    unknown,
    z.output<typeof createChecklistSchema>
  >({
    resolver: zodResolver(createChecklistSchema),
    defaultValues: { title: '' },
  })

  const replaceChecklist = (updated: ChecklistDto): void => {
    queryClient.setQueryData<ChecklistDto[]>(queryKey, (current = []) =>
      current.map((checklist) => (checklist.id === updated.id ? updated : checklist)),
    )
    void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
  }
  const showError = (): void => {
    toast.error(t('auth.genericError'))
  }

  const createMutation = useMutation({
    mutationFn: (title: string) => createChecklistRequest(taskId, { title }),
    onSuccess: (created) => {
      queryClient.setQueryData<ChecklistDto[]>(queryKey, (current = []) => [...current, created])
      createForm.reset()
      toast.success(t('tasks.checklistCreated'))
    },
    onError: showError,
  })
  const renameMutation = useMutation({
    mutationFn: ({ checklistId, title }: { checklistId: string; title: string }) =>
      updateChecklistRequest(taskId, checklistId, { title }),
    onSuccess: replaceChecklist,
    onError: showError,
  })
  const deleteMutation = useMutation({
    mutationFn: (checklistId: string) => deleteChecklistRequest(taskId, checklistId),
    onSuccess: (_result, checklistId) => {
      queryClient.setQueryData<ChecklistDto[]>(queryKey, (current = []) =>
        current.filter((checklist) => checklist.id !== checklistId),
      )
      void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
      toast.success(t('tasks.checklistDeleted'))
    },
    onError: showError,
  })
  const createItemMutation = useMutation({
    mutationFn: ({
      checklistId,
      title,
    }: {
      checklistId: string
      title: string
      onSuccess: () => void
    }) => createChecklistItemRequest(taskId, checklistId, { title }),
    onSuccess: (updated, variables) => {
      replaceChecklist(updated)
      variables.onSuccess?.()
    },
    onError: showError,
  })
  const updateItemMutation = useMutation({
    mutationFn: ({
      checklistId,
      itemId,
      isCompleted,
    }: {
      checklistId: string
      itemId: string
      isCompleted: boolean
    }) => updateChecklistItemRequest(taskId, checklistId, itemId, { isCompleted }),
    onSuccess: replaceChecklist,
    onError: showError,
  })
  const deleteItemMutation = useMutation({
    mutationFn: ({ checklistId, itemId }: { checklistId: string; itemId: string }) =>
      deleteChecklistItemRequest(taskId, checklistId, itemId),
    onSuccess: replaceChecklist,
    onError: showError,
  })
  const moveItemMutation = useMutation({
    mutationFn: ({
      checklistId,
      itemId,
      toPosition,
    }: {
      checklistId: string
      itemId: string
      toPosition: number
    }) => moveChecklistItemRequest(taskId, checklistId, itemId, { toPosition }),
    onSuccess: replaceChecklist,
    onError: showError,
  })

  const isMutating =
    createMutation.isPending ||
    renameMutation.isPending ||
    deleteMutation.isPending ||
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending ||
    moveItemMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodoIcon className="size-4" />
          {t('tasks.checklists')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : query.data?.length ? (
          query.data.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              isMutating={isMutating}
              onRename={(checklistId, title) => renameMutation.mutate({ checklistId, title })}
              onDelete={(checklistId) => deleteMutation.mutate(checklistId)}
              onCreateItem={(checklistId, title, onSuccess) =>
                createItemMutation.mutate({ checklistId, title, onSuccess })
              }
              onToggleItem={(checklistId, itemId, isCompleted) =>
                updateItemMutation.mutate({ checklistId, itemId, isCompleted })
              }
              onDeleteItem={(checklistId, itemId) =>
                deleteItemMutation.mutate({ checklistId, itemId })
              }
              onMoveItem={(checklistId, itemId, toPosition) =>
                moveItemMutation.mutate({ checklistId, itemId, toPosition })
              }
            />
          ))
        ) : (
          <p className="text-muted-foreground text-sm">{t('tasks.noChecklists')}</p>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={createForm.handleSubmit((input) => createMutation.mutate(input.title))}
        >
          <Input
            className="flex-1"
            placeholder={t('tasks.checklistNamePlaceholder')}
            aria-label={t('tasks.checklistName')}
            aria-invalid={createForm.formState.errors.title ? true : undefined}
            {...createForm.register('title')}
          />
          <Button type="submit" disabled={isMutating}>
            <PlusIcon />
            {t('tasks.addChecklist')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
