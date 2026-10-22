import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'

import { TileGlyph, type TileState } from '@/components/shared/tile-panel'
import { Button } from '@/components/ui/button'

const WALL: TileState[] = Array.from({ length: 18 }, (_, index) =>
  index === 7 ? 'overdue' : index % 5 === 3 ? 'open' : 'done',
)

export function CtaSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 overflow-hidden rounded-xl bg-rail px-6 py-14 text-rail-foreground sm:px-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2
              className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
              style={{ fontStretch: '110%' }}
            >
              {t('cta.title')}
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-rail-muted-foreground">
              {t('cta.subtitle')}
            </p>
            <Button
              size="lg"
              className="mt-8 bg-ochre text-warning-foreground hover:bg-[color-mix(in_srgb,var(--ochre)_88%,white)]"
              asChild
            >
              <Link to="/register">
                {t('cta.button')}
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          <div
            className="hidden w-fit grid-cols-6 gap-1.5 justify-self-end md:grid [--tile-done:var(--rail-accent)] [--tile-glaze:var(--rail-foreground)] [--tile-open:color-mix(in_srgb,var(--rail)_70%,var(--rail-accent))]"
            aria-hidden="true"
          >
            {WALL.map((state, index) => (
              <TileGlyph key={index} state={state} size={40} turn={((index * 5) % 4) * 90} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
