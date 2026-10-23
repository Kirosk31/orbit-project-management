import type { TaskPriority } from '@orbit/shared'
import { CalendarIcon, ListChecksIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { dueStateOf } from '@/lib/due'
import { cn, formatDate, initialsOf } from '@/lib/utils'

const PRIORITY_LEVEL: Record<TaskPriority, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  NONE: 'var(--priority-low)',
  LOW: 'var(--priority-low)',
  MEDIUM: 'var(--priority-medium)',
  HIGH: 'var(--priority-high)',
  URGENT: 'var(--priority-urgent)',
}

/**
 * Priority as a short course of tiles: one to four filled, so the level reads
 * by count as well as by hue.
 */
export function PriorityMark({
  priority,
  showLabel = false,
  className,
}: {
  priority: TaskPriority
  showLabel?: boolean
  className?: string
}): ReactNode {
  const { t } = useTranslation()
  const level = PRIORITY_LEVEL[priority]
  const label = t(`tasks.priority${priority}`)
  if (level === 0 && !showLabel) return null

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      title={t('tasks.priorityWithLevel', { priority: label })}
    >
      <span className="inline-flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className="w-[3px] rounded-[1px]"
            style={{
              height: 4 + step * 2,
              backgroundColor: step <= level ? PRIORITY_COLOR[priority] : 'var(--border)',
            }}
          />
        ))}
      </span>
      {showLabel ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">{t('tasks.priorityWithLevel', { priority: label })}</span>
      )}
    </span>
  )
}

export function DueDate({
  dueDate,
  isCompleted,
  className,
}: {
  dueDate: string
  isCompleted: boolean
  className?: string
}): ReactNode {
  const { t, i18n } = useTranslation()
  const state = dueStateOf(dueDate, isCompleted)
  const attention = state === 'overdue' || state === 'today'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs tabular-nums',
        attention ? 'font-medium text-ochre-ink' : 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon className="size-3.5" aria-hidden="true" />
      {state === 'today'
        ? t('tasks.dueToday')
        : formatDate(dueDate, i18n.resolvedLanguage ?? i18n.language)}
      {state === 'overdue' && <span className="sr-only">({t('tasks.overdue')})</span>}
    </span>
  )
}

export function LabelChips({
  labels,
  max = 3,
}: {
  labels: Array<{ id: string; name: string; color: string }>
  max?: number
}): ReactNode {
  if (labels.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {labels.slice(0, max).map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-px text-[0.6875rem] font-medium text-muted-foreground"
        >
          <span
            className="size-1.5 rounded-[1px]"
            style={{ backgroundColor: label.color }}
            aria-hidden="true"
          />
          {label.name}
        </span>
      ))}
      {labels.length > max && (
        <span className="px-1 text-[0.6875rem] text-muted-foreground">+{labels.length - max}</span>
      )}
    </span>
  )
}

export function AssigneeStack({
  assignees,
  max = 3,
}: {
  assignees: Array<{ id: string; userId: string; fullName: string; avatarKey: string | null }>
  max?: number
}): ReactNode {
  if (assignees.length === 0) return null
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {assignees.slice(0, max).map((assignee) => (
        <Avatar key={assignee.id} className="size-5 ring-2 ring-card" title={assignee.fullName}>
          <SecureAvatarImage
            userId={assignee.userId}
            avatarKey={assignee.avatarKey}
            alt={assignee.fullName}
          />
          <AvatarFallback className="text-[0.6875rem] tracking-tighter">
            {initialsOf(assignee.fullName)}
          </AvatarFallback>
        </Avatar>
      ))}
      {assignees.length > max && (
        <Avatar className="size-5 ring-2 ring-card">
          <AvatarFallback className="text-[0.6875rem] tracking-tighter">
            +{assignees.length - max}
          </AvatarFallback>
        </Avatar>
      )}
    </span>
  )
}

export function SubtaskCount({ done, total }: { done: number; total: number }): ReactNode {
  if (total === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
      <ListChecksIcon className="size-3.5" aria-hidden="true" />
      {done}/{total}
    </span>
  )
}
