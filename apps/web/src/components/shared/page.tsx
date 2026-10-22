import type { ReactNode } from 'react'

import { TileGlyph, type TileState } from '@/components/shared/tile-panel'
import { cn } from '@/lib/utils'

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
} as const

interface PageContainerProps {
  width?: keyof typeof WIDTHS
  className?: string
  children: ReactNode
}

/** The one page frame every app screen sits in. */
export function PageContainer({
  width = 'default',
  className,
  children,
}: PageContainerProps): ReactNode {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8',
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small context row above the title, such as a back link or a status. */
  leading?: ReactNode
  /** Inline next to the title, such as a presence badge. */
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  leading,
  meta,
  actions,
  className,
}: PageHeaderProps): ReactNode {
  return (
    <header
      className={cn(
        'mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {leading}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.015em]">
            {title}
          </h1>
          {meta}
        </div>
        {description && <p className="max-w-[65ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface SectionHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps): ReactNode {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <Heading className="text-base font-semibold">{title}</Heading>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

const EMPTY_PATTERN: TileState[] = [
  'open',
  'open',
  'done',
  'open',
  'done',
  'open',
  'done',
  'open',
  'open',
]

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}

/** An unlaid tile panel: the space is ready, the first piece is the user's. */
export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed text-center',
        compact ? 'gap-3 px-4 py-8' : 'gap-4 px-6 py-14',
        className,
      )}
    >
      <div className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
        {EMPTY_PATTERN.map((state, index) => (
          <TileGlyph
            key={index}
            state={state}
            size={compact ? 12 : 16}
            turn={[0, 90, 180, 270][index % 4] ?? 0}
          />
        ))}
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
