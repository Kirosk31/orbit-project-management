import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { TileGlyph, type TileState } from '@/components/shared/tile-panel'

const FEATURES = [
  { key: 'kanban', state: 'done' },
  { key: 'tasks', state: 'done' },
  { key: 'realtime', state: 'overdue' },
  { key: 'rbac', state: 'done' },
  { key: 'analytics', state: 'done' },
  { key: 'integrations', state: 'open' },
] as const satisfies ReadonlyArray<{ key: string; state: TileState }>

export function FeaturesSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-20 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2
            className="text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
            style={{ fontStretch: '112%' }}
          >
            {t('features.heading')}
          </h2>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{t('features.subtitle')}</p>
        </div>

        <ol className="grid gap-x-12 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <li key={feature.key} className="flex gap-4 border-t py-7">
              <TileGlyph state={feature.state} size={28} turn={[0, 90, 180, 270][index % 4] ?? 0} />
              <div className="min-w-0">
                <h3 className="font-semibold">{t(`features.${feature.key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`features.${feature.key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
