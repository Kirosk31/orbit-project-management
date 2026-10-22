import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  wordmark?: boolean
  /** "rail" sets the wordmark for the cobalt navigation rail. */
  tone?: 'default' | 'rail'
}

/**
 * Orbit brand mark: one glazed azulejo tile carrying a quarter-circle orbit
 * and an ochre planet. The tile takes the tenant's brand color.
 */
export function Logo({ className, wordmark = true, tone = 'default' }: LogoProps): ReactNode {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect
          width="32"
          height="32"
          rx="7"
          fill={tone === 'rail' ? 'var(--rail-accent)' : 'var(--brand-tile)'}
        />
        <path d="M6 26a6 6 0 0 1 6-6v6z" fill="var(--brand-glaze)" />
        <path
          d="M6 9a17 17 0 0 1 17 17"
          fill="none"
          stroke="var(--brand-glaze)"
          strokeWidth="2.5"
        />
        <circle cx="18.02" cy="13.98" r="3.2" fill="var(--ochre)" />
      </svg>
      {wordmark && (
        <span
          className={cn(
            'text-[1.0625rem] font-[650] tracking-[-0.01em]',
            tone === 'rail' ? 'text-rail-foreground' : 'text-foreground',
          )}
          style={{ fontStretch: '112%' }}
        >
          Orbit
        </span>
      )}
    </span>
  )
}
