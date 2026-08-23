import type { ReactNode } from 'react'

import { Reveal } from '@/components/shared/reveal'
import { translate, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  titleKey: TranslationKey
  subtitleKey?: TranslationKey
  className?: string
}

export function SectionHeading({
  eyebrow,
  titleKey,
  subtitleKey,
  className,
}: SectionHeadingProps): ReactNode {
  return (
    <Reveal className={cn('mx-auto max-w-2xl text-center', className)}>
      {eyebrow && (
        <span className="text-primary mb-3 inline-block text-sm font-semibold uppercase tracking-wider">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {translate(titleKey)}
      </h2>
      {subtitleKey && (
        <p className="text-muted-foreground mt-4 text-lg text-pretty">{translate(subtitleKey)}</p>
      )}
    </Reveal>
  )
}
