import { zodResolver } from '@hookform/resolvers/zod'
import { createSubtaskSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, CircleIcon, ListChecksIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  createSubtaskRequest,
  listSubtasksRequest,
  updateTaskRequest,
} from '@/features/tasks/task-api'

export function TaskSubtasks({ taskId }: { taskId: string }): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['task-subtasks', taskId],
    queryFn: () => listSubtasksRequest(taskId),
  })
  const form = useForm<
    z.input<typeof createSubtaskSchema>,
    unknown,
    z.output<typeof createSubtaskSchema>
  >({
    resolver: zodResolver(createSubtaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'NONE',
      assigneeIds: [],
      labelIds: [],
    },
  })

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['board-tasks'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: z.output<typeof createSubtaskSchema>) =>
      createSubtaskRequest(taskId, input),
    onSuccess: () => {
      form.reset()
      invalidate()
      toast.success(t('tasks.subtaskCreated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const completionMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateTaskRequest(id, { isCompleted }),
    onSuccess: invalidate,
    onError: () => toast.error(t('auth.genericError')),
  })

  const subtasks = query.data ?? []
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length
  const progress = subtasks.length === 0 ? 0 : Math.round((completed / subtasks.length) * 100)
  const progressLabel = t('tasks.subtaskProgress', {
    completed: String(completed),
    total: String(subtasks.length),
  })

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecksIcon className="size-4" />
            {t('tasks.subtasks')}
          </CardTitle>
          <Badge variant="secondary">{progressLabel}</Badge>
        </div>
        <Progress value={progress} aria-label={progressLabel} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : subtasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('tasks.noSubtasks')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {subtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-2 rounded-md border p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={subtask.isCompleted ? t('tasks.incomplete') : t('tasks.complete')}
                  disabled={completionMutation.isPending}
                  onClick={() =>
                    completionMutation.mutate({
                      id: subtask.id,
                      isCompleted: !subtask.isCompleted,
                    })
                  }
                >
                  {subtask.isCompleted ? <CheckIcon /> : <CircleIcon />}
                </Button>
                <Link
                  to={`/app/tasks/${subtask.id}`}
                  className={`min-w-0 flex-1 truncate text-sm hover:underline ${
                    subtask.isCompleted ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  {subtask.title}
                </Link>
                <Badge variant="outline">{t(`tasks.priority${subtask.priority}`)}</Badge>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={form.handleSubmit((input) => createMutation.mutate(input))}
        >
          <div className="flex-1">
            <Input
              aria-label={t('tasks.addSubtask')}
              placeholder={t('tasks.subtaskTitlePlaceholder')}
              aria-invalid={form.formState.errors.title ? true : undefined}
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-destructive mt-1 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            <PlusIcon />
            {t('tasks.addSubtask')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
