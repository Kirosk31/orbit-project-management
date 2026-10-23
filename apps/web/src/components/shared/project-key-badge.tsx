import type { ReactNode } from 'react'

import { cn, getContrastTextColor } from '@/lib/utils'

/** A project's key on its own color, sized to the key rather than clipped. */
export function ProjectKeyBadge({
  projectKey,
  color,
  className,
}: {
  projectKey: string
  color: string
  className?: string
}): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md px-1.5 text-[0.6875rem] font-bold tracking-wide',
        className,
      )}
      style={{ backgroundColor: color, color: getContrastTextColor(color) }}
      aria-hidden="true"
    >
      {projectKey.slice(0, 4)}
    </span>
  )
}
