import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

import { Logo, TileGlyph, type TileState } from '@orbit/brand'
import { LanguageSwitcher } from '@/features/i18n/language-switcher'
import { ThemeToggle } from '@/features/theme/theme-toggle'

/** A fixed azulejo wall: mostly glazed, a few open, one ochre. */
const WALL: TileState[] = Array.from({ length: 48 }, (_, index) =>
  index === 29 ? 'overdue' : [3, 10, 17, 22, 38, 41, 45].includes(index) ? 'open' : 'done',
)
const TURNS = [0, 90, 180, 270]

/**
 * Shared layout for the public auth pages: the cobalt brand wall on wide
 * screens, the form on a quiet porcelain ground.
 */
export function AuthLayout(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-rail p-10 text-rail-foreground lg:flex">
        <Link to="/" aria-label={t('nav.homeLabel')} className="w-fit">
          <Logo tone="rail" />
        </Link>
        <div
          className="grid w-fit grid-cols-8 gap-1.5 [--tile-done:var(--rail-accent)] [--tile-glaze:var(--rail-foreground)] [--tile-open:color-mix(in_srgb,var(--rail)_70%,var(--rail-accent))]"
          aria-hidden="true"
        >
          {WALL.map((state, index) => (
            <TileGlyph
              key={index}
              state={state}
              size={44}
              turn={TURNS[(index * 3 + Math.floor(index / 8)) % 4] ?? 0}
            />
          ))}
        </div>
        <div className="max-w-md space-y-5">
          <p className="text-2xl leading-snug font-semibold" style={{ fontStretch: '108%' }}>
            {t('auth.brandStatement')}
          </p>
          <ul className="space-y-2 text-sm text-rail-muted-foreground">
            {(['auth.pointOne', 'auth.pointTwo', 'auth.pointThree'] as const).map((key) => (
              <li key={key} className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-[1px] bg-ochre" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="relative flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Link to="/" aria-label={t('nav.homeLabel')} className="lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
