import { zodResolver } from '@hookform/resolvers/zod'
import { logTimeEntrySchema, type TimeEntryDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckIcon,
  Clock3Icon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { useAuthStore } from '@/features/auth/auth-store'
import {
  deleteTimeEntryRequest,
  listTimeEntriesRequest,
  logTimeEntryRequest,
  startTaskTimerRequest,
  stopTaskTimerRequest,
  updateTimeEntryRequest,
} from '@/features/tasks/task-api'
import { initialsOf } from '@/lib/utils'

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const remainingSeconds = Math.max(0, seconds % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

function RunningDuration({ startedAt }: { startedAt: string }): ReactNode {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000))
  return <span className="font-mono tabular-nums">{formatDuration(seconds)}</span>
}

interface TimeEntryRowProps {
  entry: TimeEntryDto
  locale: string
  isMutating: boolean
  onUpdate: (entryId: string, durationMinutes: number, note: string | null) => void
  onDelete: (entryId: string) => void
}

function TimeEntryRow({
  entry,
  locale,
  isMutating,
  onUpdate,
  onDelete,
}: TimeEntryRowProps): ReactNode {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(1, Math.round(entry.durationSeconds / 60)),
  )
  const [note, setNote] = useState(entry.note ?? '')

  if (editing) {
    return (
      <li className="grid gap-2 rounded-md border p-3 sm:grid-cols-[7rem_1fr_auto]">
        <Input
          type="number"
          min={1}
          max={1_440}
          value={durationMinutes}
          aria-label={t('tasks.durationMinutes')}
          onChange={(event) => setDurationMinutes(Number(event.currentTarget.value))}
        />
        <Input
          value={note}
          maxLength={500}
          placeholder={t('tasks.timeNotePlaceholder')}
          aria-label={t('tasks.timeNote')}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            disabled={isMutating || durationMinutes < 1 || durationMinutes > 1_440}
            onClick={() => {
              onUpdate(entry.id, durationMinutes, note.trim() || null)
              setEditing(false)
            }}
          >
            <CheckIcon />
            <span className="sr-only">{t('common.save')}</span>
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(false)}>
            <XIcon />
            <span className="sr-only">{t('common.cancel')}</span>
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <Avatar className="size-8">
        <SecureAvatarImage
          userId={entry.userId}
          avatarKey={entry.userAvatarKey}
          alt={entry.userName}
        />
        <AvatarFallback>{initialsOf(entry.userName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium">{entry.userName}</p>
        <p className="text-muted-foreground text-xs">
          <time dateTime={entry.startedAt}>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(entry.startedAt))}
          </time>
          {entry.note ? ` · ${entry.note}` : ''}
        </p>
      </div>
      <Badge variant={entry.isRunning ? 'default' : 'secondary'}>
        {entry.isRunning ? (
          <RunningDuration startedAt={entry.startedAt} />
        ) : (
          formatDuration(entry.durationSeconds)
        )}
      </Badge>
      {!entry.isRunning && (
        <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(true)}>
          <PencilIcon />
          <span className="sr-only">{t('tasks.editTimeEntry')}</span>
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={isMutating}
        onClick={() => onDelete(entry.id)}
      >
        <Trash2Icon />
        <span className="sr-only">{t('tasks.deleteTimeEntry')}</span>
      </Button>
    </li>
  )
}

export function TaskTimeTracking({
  taskId,
  trackedSeconds,
}: {
  taskId: string
  trackedSeconds: number
}): ReactNode {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [timerNote, setTimerNote] = useState('')
  const queryKey = ['task-time-entries', taskId] as const
  const query = useQuery({ queryKey, queryFn: () => listTimeEntriesRequest(taskId) })
  const form = useForm<
    z.input<typeof logTimeEntrySchema>,
    unknown,
    z.output<typeof logTimeEntrySchema>
  >({
    resolver: zodResolver(logTimeEntrySchema),
    defaultValues: { durationMinutes: 30, note: '' },
  })

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['board-tasks'] })
  }
  const showError = (): void => {
    toast.error(t('auth.genericError'))
  }

  const logMutation = useMutation({
    mutationFn: (input: z.output<typeof logTimeEntrySchema>) => logTimeEntryRequest(taskId, input),
    onSuccess: () => {
      form.reset()
      refresh()
      toast.success(t('tasks.timeLogged'))
    },
    onError: showError,
  })
  const startMutation = useMutation({
    mutationFn: () => startTaskTimerRequest(taskId, timerNote),
    onSuccess: () => {
      setTimerNote('')
      refresh()
      toast.success(t('tasks.timerStarted'))
    },
    onError: showError,
  })
  const stopMutation = useMutation({
    mutationFn: () => stopTaskTimerRequest(taskId),
    onSuccess: () => {
      refresh()
      toast.success(t('tasks.timerStopped'))
    },
    onError: showError,
  })
  const updateMutation = useMutation({
    mutationFn: ({
      entryId,
      durationMinutes,
      note,
    }: {
      entryId: string
      durationMinutes: number
      note: string | null
    }) => updateTimeEntryRequest(taskId, entryId, { durationMinutes, note }),
    onSuccess: refresh,
    onError: showError,
  })
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteTimeEntryRequest(taskId, entryId),
    onSuccess: refresh,
    onError: showError,
  })

  const isMutating =
    logMutation.isPending ||
    startMutation.isPending ||
    stopMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending
  const entries = query.data?.rows ?? []
  const ownRunningEntry = entries.find((entry) => entry.userId === currentUserId && entry.isRunning)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3Icon className="size-4" />
          {t('tasks.timeTracking')}
        </CardTitle>
        <Badge variant="secondary">
          {t('tasks.totalTracked', { duration: formatDuration(trackedSeconds) })}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="flex-1"
              value={timerNote}
              maxLength={500}
              placeholder={t('tasks.timerNotePlaceholder')}
              aria-label={t('tasks.timeNote')}
              disabled={Boolean(ownRunningEntry)}
              onChange={(event) => setTimerNote(event.currentTarget.value)}
            />
            {ownRunningEntry ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isMutating}
                onClick={() => stopMutation.mutate()}
              >
                <SquareIcon />
                {t('tasks.stopTimer')} · <RunningDuration startedAt={ownRunningEntry.startedAt} />
              </Button>
            ) : (
              <Button type="button" disabled={isMutating} onClick={() => startMutation.mutate()}>
                <PlayIcon />
                {t('tasks.startTimer')}
              </Button>
            )}
          </div>
        </div>

        <form
          className="grid gap-2 rounded-lg border p-4 sm:grid-cols-[8rem_1fr_auto]"
          onSubmit={form.handleSubmit((input) => logMutation.mutate(input))}
        >
          <Input
            type="number"
            min={1}
            max={1_440}
            aria-label={t('tasks.durationMinutes')}
            {...form.register('durationMinutes', { valueAsNumber: true })}
          />
          <Input
            maxLength={500}
            placeholder={t('tasks.timeNotePlaceholder')}
            aria-label={t('tasks.timeNote')}
            {...form.register('note')}
          />
          <Button type="submit" variant="secondary" disabled={isMutating}>
            <PlusIcon />
            {t('tasks.logTime')}
          </Button>
        </form>

        {query.isPending ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('tasks.noTimeEntries')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                locale={i18n.language}
                isMutating={isMutating}
                onUpdate={(entryId, durationMinutes, note) =>
                  updateMutation.mutate({ entryId, durationMinutes, note })
                }
                onDelete={(entryId) => deleteMutation.mutate(entryId)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
