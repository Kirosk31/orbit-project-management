import { Logo } from '@orbit/brand'
import type { ReactNode } from 'react'

import type { Dictionary } from '@/i18n/dictionary'
import { appUrl } from '@/lib/urls'

export function SiteFooter({ dict }: { dict: Dictionary }): ReactNode {
  const columns = [
    {
      heading: dict.footer.product,
      links: [
        { label: dict.nav.features, href: '#features' },
        { label: dict.nav.howItWorks, href: '#how-it-works' },
        { label: dict.nav.faq, href: '#faq' },
      ],
    },
    {
      heading: dict.footer.getStarted,
      links: [
        { label: dict.nav.login, href: appUrl('/login') },
        { label: dict.nav.signUp, href: appUrl('/register') },
      ],
    },
  ]

  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">{dict.common.tagline}</p>
          </div>
          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="mb-4 text-sm font-semibold">{column.heading}</h2>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} Orbit. {dict.footer.rights}
          </p>
          <p className="text-xs">Plan. Track. Ship.</p>
        </div>
      </div>
    </footer>
  )
}
