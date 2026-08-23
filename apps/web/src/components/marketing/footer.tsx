import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Logo } from '@/components/shared/logo'
import { LanguageSwitcher } from '@/features/i18n/language-switcher'
import { ThemeToggle } from '@/features/theme/theme-toggle'

const FOOTER_COLUMNS = [
  {
    heading: 'footer.product',
    links: [
      { label: 'nav.features', to: '/#features' },
      { label: 'nav.howItWorks', to: '/#how-it-works' },
      { label: 'nav.faq', to: '/#faq' },
    ],
  },
  {
    heading: 'footer.getStarted',
    links: [
      { label: 'nav.login', to: '/login' },
      { label: 'nav.signUp', to: '/register' },
    ],
  },
] as const

export function Footer(): ReactNode {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="text-muted-foreground max-w-xs text-sm">{t('common.tagline')}</p>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-4 text-sm font-semibold">{t(column.heading)}</h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm sm:flex-row">
          <p>
            © {year} Orbit. {t('footer.rights')}
          </p>
          <p className="text-muted-foreground font-mono text-xs">Plan. Track. Ship.</p>
        </div>
      </div>
    </footer>
  )
}
