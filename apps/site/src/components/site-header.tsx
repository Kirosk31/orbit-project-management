import { Logo } from '@orbit/brand'
import { MenuIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { SiteLocale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { appUrl } from '@/lib/urls'

import { LanguageMenu } from './language-menu'
import { button } from './styles'
import { ThemeToggle } from './theme-toggle'

/** Rail tokens remapped so shared pieces read correctly on cobalt. */
const ON_RAIL =
  '[--accent-foreground:var(--rail-foreground)] [--accent:var(--rail-accent)] [--ring:var(--rail-foreground)]'

export function SiteHeader({ locale, dict }: { locale: SiteLocale; dict: Dictionary }): ReactNode {
  const links = [
    { href: '#features', label: dict.nav.features },
    { href: '#how-it-works', label: dict.nav.howItWorks },
    { href: '#faq', label: dict.nav.faq },
  ]

  return (
    <header
      className={`sticky top-0 z-40 border-b border-rail-border bg-rail text-rail-foreground ${ON_RAIL}`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href={`/${locale}`} aria-label={dict.nav.homeLabel} className="rounded-md">
          <Logo tone="rail" />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label={dict.nav.mainNavigation}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-rail-muted-foreground transition-colors hover:text-rail-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageMenu locale={locale} label={dict.site.languageMenu} />
          <ThemeToggle toDark={dict.site.themeToDark} toLight={dict.site.themeToLight} />
          <div className="ml-1 hidden items-center gap-1 md:flex">
            <a href={appUrl('/login')} className={button.ghostOnRailSmall}>
              {dict.nav.login}
            </a>
            <a href={appUrl('/register')} className={button.onRailSmall}>
              {dict.nav.signUp}
            </a>
          </div>
          <details className="relative md:hidden">
            <summary
              className={`${button.iconOnRail} cursor-pointer`}
              aria-label={dict.common.openMenu}
            >
              <MenuIcon aria-hidden="true" />
            </summary>
            <nav
              aria-label={dict.nav.mobileNavigation}
              className="absolute right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg border bg-popover p-2 text-popover-foreground shadow-overlay"
            >
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
              <hr className="my-1 border-border" />
              <a
                href={appUrl('/login')}
                className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {dict.nav.login}
              </a>
              <a href={appUrl('/register')} className={button.primary}>
                {dict.nav.signUp}
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
