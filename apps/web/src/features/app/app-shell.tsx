import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { NotificationsDropdown } from '@/features/notifications-dropdown'
import {
  BellIcon,
  Building2Icon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  UserIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/shared/logo'
import { hardLogout, useAuthStore } from '@/features/auth/auth-store'
import { logoutRequest } from '@/features/auth/auth-api'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { initialsOf } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation()
  return [
    { to: '/app', label: t('app.overview'), icon: <LayoutDashboardIcon /> },
    { to: '/app/profile', label: t('app.profile'), icon: <UserIcon /> },
    { to: '/app/organizations', label: t('org.title'), icon: <Building2Icon /> },
    {
      to: '/app/projects',
      label: t('projects.title'),
      icon: <FolderKanbanIcon />,
    },
    {
      to: '/app/notifications',
      label: t('notifications.title'),
      icon: <BellIcon />,
    },
  ]
}

function NavList(): ReactNode {
  const items = useNavItems()
  const { t } = useTranslation()

  return (
    <nav className="flex flex-col gap-1" aria-label={t('app.mainNavigation')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/app'}
          className={({ isActive }) =>
            [
              'text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive && 'bg-accent text-foreground',
            ].join(' ')
          }
        >
          <span className="size-4" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserMenu(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  if (!user) return null

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutRequest()
    } finally {
      hardLogout()
      navigate('/login')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors"
        >
          <Avatar className="size-8">
            <SecureAvatarImage userId={user.id} avatarKey={user.avatarKey} alt={user.fullName} />
            <AvatarFallback>{initialsOf(user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/app/profile')}>
          <UserIcon />
          {t('app.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void handleLogout()
          }}
        >
          <LogOutIcon />
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarContent(): ReactNode {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2">
        <Logo />
      </div>
      <Separator />
      <div className="flex-1">
        <NavList />
      </div>
      <Separator />
      <div className="px-2">
        {/* Notifications dropdown placed above user menu for quick access */}
        <div className="mb-2">
          <NotificationsDropdown />
        </div>
        <UserMenu />
      </div>
    </div>
  )
}
export function AppShell(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-card hidden border-r lg:sticky lg:top-0 lg:block lg:h-dvh">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b lg:hidden">
          <div className="flex items-center justify-between p-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('common.openMenu')}>
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('app.navigation')}</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <Logo />
            <div className="w-9" />
          </div>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
