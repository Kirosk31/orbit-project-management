import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { TileGlyph } from '@orbit/brand'

const STEPS = [
  { titleKey: 'how.step1Title', descriptionKey: 'how.step1Description', state: 'done' },
  { titleKey: 'how.step2Title', descriptionKey: 'how.step2Description', state: 'done' },
  { titleKey: 'how.step3Title', descriptionKey: 'how.step3Description', state: 'open' },
] as const

export function HowItWorksSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/50 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
          style={{ fontStretch: '110%' }}
        >
          {t('how.heading')}
        </h2>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.titleKey} className="relative">
              <div className="flex items-center gap-3">
                <TileGlyph state={step.state} size={28} turn={index * 90} />
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-border md:block" aria-hidden="true" />
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(step.titleKey)}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t(step.descriptionKey)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
