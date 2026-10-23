import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Logo } from '@/components/shared/logo'
import { TileGlyph } from '@/components/shared/tile-panel'
import { Button } from '@/components/ui/button'

/** A tile panel with one piece missing: the page that is not here. */
export function NotFoundPage(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="p-4 sm:p-6">
        <Link to="/" aria-label={t('nav.homeLabel')} className="inline-flex">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24 text-center">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) =>
            index === 6 ? (
              <span
                key={index}
                className="size-12 rounded-[3px] border-2 border-dashed border-[color-mix(in_srgb,var(--border)_60%,var(--muted-foreground))]"
              />
            ) : (
              <TileGlyph
                key={index}
                state={index % 5 === 2 ? 'open' : 'done'}
                size={48}
                turn={((index * 3) % 4) * 90}
              />
            ),
          )}
        </div>
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.015em]">
            {t('common.notFoundTitle')}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t('common.notFoundDescription')} <span className="tabular-nums">(404)</span>
          </p>
        </div>
        <Button asChild>
          <Link to="/">{t('common.backHome')}</Link>
        </Button>
      </main>
    </div>
  )
}
