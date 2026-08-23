import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { MenuIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/shared/logo'
import { LanguageSwitcher } from '@/features/i18n/language-switcher'
import { useAuthStore } from '@/features/auth/auth-store'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/#features', key: 'nav.features' },
  { to: '/#how-it-works', key: 'nav.howItWorks' },
  { to: '/#faq', key: 'nav.faq' },
] as const

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrolled
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  const { t } = useTranslation()

  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.key}
          to={link.to}
          onClick={onNavigate}
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          {t(link.key)}
        </Link>
      ))}
    </>
  )
}

export function Navbar(): ReactNode {
  const { t } = useTranslation()
  const location = useLocation()
  const scrolled = useScrolled()
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled ? 'glass border-b' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label={t('nav.homeLabel')}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label={t('nav.mainNavigation')}>
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Button asChild>
                <Link to="/app">{t('nav.openApp')}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">{t('nav.signUp')}</Link>
                </Button>
              </>
            )}
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t('common.openMenu')}
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 px-4" aria-label={t('nav.mobileNavigation')}>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
              <div className="mt-auto flex flex-col gap-2 px-4 pb-4">
                {isAuthenticated ? (
                  <Button asChild>
                    <Link to="/app" onClick={() => setMobileOpen(false)}>
                      {t('nav.openApp')}
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        {t('nav.login')}
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link to="/register" onClick={() => setMobileOpen(false)}>
                        {t('nav.signUp')}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
