import type { ReactNode } from 'react'

import { translate, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  titleKey: TranslationKey
  subtitleKey?: TranslationKey
  className?: string
}

export function SectionHeading({
  titleKey,
  subtitleKey,
  className,
}: SectionHeadingProps): ReactNode {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <h2
        className="text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
        style={{ fontStretch: '110%' }}
      >
        {translate(titleKey)}
      </h2>
      {subtitleKey && (
        <p className="text-muted-foreground mt-4 text-lg text-pretty">{translate(subtitleKey)}</p>
      )}
    </div>
  )
}
