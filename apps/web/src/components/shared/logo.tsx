import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  wordmark?: boolean
}

/**
 * Orbit brand mark: a gradient ring with an orbiting core.
 */
export function Logo({ className, wordmark = true }: LogoProps): ReactNode {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative inline-flex size-7 items-center justify-center" aria-hidden>
        <svg viewBox="0 0 32 32" className="size-7" fill="none">
          <defs>
            <linearGradient id="orbit-brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.646 0.222 41.116)" />
              <stop offset="100%" stopColor="oklch(0.707 0.165 254.624)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="11.5" stroke="url(#orbit-brand)" strokeWidth="2.25" />
          <g className="animate-orbit-spin" style={{ transformOrigin: '16px 16px' }}>
            <circle cx="27.5" cy="16" r="2.25" fill="url(#orbit-brand)" />
          </g>
          <circle cx="16" cy="16" r="4" fill="url(#orbit-brand)" />
        </svg>
      </span>
      {wordmark && <span className="text-lg font-semibold tracking-tight">Orbit</span>}
    </span>
  )
}
