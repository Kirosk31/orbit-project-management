import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'

import { Logo } from '@/components/shared/logo'
import { LanguageSwitcher } from '@/features/i18n/language-switcher'
import { ThemeToggle } from '@/features/theme/theme-toggle'

/**
 * Shared layout for the public auth pages: brand header with theme and
 * language controls, centered card content.
 */
export function AuthLayout(): ReactNode {
  return (
    <div className="bg-muted/40 relative flex min-h-dvh flex-col">
      <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
        <Link to="/" aria-label="Orbit home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <Outlet />
      </main>
    </div>
  )
}
