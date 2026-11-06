import { CalendarIcon, XIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveFormattingLocale } from '@orbit/shared'

interface DateFieldProps {
  id: string
  /** ISO date (yyyy-mm-dd) or empty. */
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * A date control that reads in the interface language: the visible label is
 * formatted with Intl, and the platform picker stays one click away.
 */
export function DateField({ id, value, onChange, className }: DateFieldProps): ReactNode {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const label = value
    ? new Intl.DateTimeFormat(resolveFormattingLocale(i18n.language), {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(new Date(`${value}T00:00:00.000Z`))
    : t('tasks.noDueDate')

  const openPicker = (): void => {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  return (
    <div className={cn('relative flex items-center gap-1', className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        className="h-8 flex-1 justify-start font-normal tabular-nums"
        onClick={openPicker}
      >
        <CalendarIcon className="text-muted-foreground" />
        <span className={value ? '' : 'text-muted-foreground'}>{label}</span>
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t('tasks.clearDate')}
          onClick={() => onChange('')}
        >
          <XIcon />
        </Button>
      )}
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  )
}
