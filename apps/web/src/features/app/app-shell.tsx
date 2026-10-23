import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationsDropdown } from '@/features/notifications-dropdown'
import {
  BellIcon,
  Building2Icon,
  CheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  FolderKanbanIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  Settings2Icon,
  SunMediumIcon,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo, TileGlyph } from '@orbit/brand'
import { useBreadcrumbStore } from '@/features/app/breadcrumbs'
import { hardLogout, useAuthStore } from '@/features/auth/auth-store'
import { logoutRequest } from '@/features/auth/auth-api'
import { useCommandPaletteStore } from '@/features/command-palette/command-palette-store'
import { LanguageSwitcher } from '@/features/i18n/language-switcher'
import { countUnreadRequest } from '@/features/notifications-api'
import { listProjectsRequest } from '@/features/projects/project-api'
import { useActiveWorkspace } from '@/features/workspace/use-active-workspace'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { initialsOf } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  count?: number
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation()
  const unread = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => countUnreadRequest(),
    staleTime: 10_000,
  })
  return [
    { to: '/app', label: t('app.overview'), icon: <SunMediumIcon /> },
    { to: '/app/projects', label: t('projects.title'), icon: <FolderKanbanIcon /> },
    { to: '/app/organizations', label: t('org.title'), icon: <Building2Icon /> },
    {
      to: '/app/notifications',
      label: t('notifications.title'),
      icon: <BellIcon />,
      count: unread.data?.count ?? 0,
    },
  ]
}

function NavList({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  const items = useNavItems()
  const { t } = useTranslation()

  return (
    <nav className="flex flex-col gap-0.5" aria-label={t('app.mainNavigation')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/app'}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-rail-foreground',
              isActive
                ? 'bg-rail-accent text-rail-foreground'
                : 'text-rail-muted-foreground hover:bg-rail-accent/55 hover:text-rail-foreground',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'size-4 [&_svg]:size-4',
                  isActive
                    ? 'text-ochre'
                    : 'text-rail-muted-foreground group-hover:text-rail-foreground',
                ].join(' ')}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.count ? (
                <span className="rounded-sm bg-ochre px-1.5 text-[0.6875rem] leading-[1.125rem] font-semibold text-warning-foreground tabular-nums">
                  {item.count > 99 ? '99+' : item.count}
                </span>
              ) : null}
            </>
          )}
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
          aria-label={t('app.accountMenu')}
          className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-rail-accent/55 focus-visible:outline-rail-foreground"
        >
          <Avatar className="size-8 ring-1 ring-rail-border">
            <SecureAvatarImage userId={user.id} avatarKey={user.avatarKey} alt={user.fullName} />
            <AvatarFallback className="bg-rail-accent text-rail-foreground">
              {initialsOf(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-rail-foreground">
              {user.fullName}
            </span>
            <span className="block truncate text-xs text-rail-muted-foreground">{user.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
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

function WorkspaceSwitcher(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organizations, active, setActiveSlug } = useActiveWorkspace()

  if (!active) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('app.switchWorkspace')}: ${active.name}`}
          className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-rail-accent/55 focus-visible:outline-rail-foreground"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-rail-accent text-[0.6875rem] font-semibold">
            {initialsOf(active.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] text-rail-muted-foreground">
              {t('app.workspace')}
            </span>
            <span className="block truncate text-sm font-medium">{active.name}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 text-rail-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onSelect={() => {
              setActiveSlug(organization.slug)
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            }}
          >
            <span className="flex size-5 items-center justify-center rounded-[3px] bg-accent text-[0.6875rem] font-semibold text-accent-foreground">
              {initialsOf(organization.name)}
            </span>
            <span className="flex-1 truncate">
              {organization.isPersonal ? t('app.personalWorkspace') : organization.name}
            </span>
            {organization.slug === active.slug && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/app/organizations')}>
          <Settings2Icon />
          {t('app.manageWorkspaces')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RecentProjects({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  const { t } = useTranslation()
  const { active } = useActiveWorkspace()
  const projectsQuery = useQuery({
    queryKey: ['projects', active?.slug],
    queryFn: () => listProjectsRequest(active!.slug),
    enabled: Boolean(active),
  })
  const projects = (projectsQuery.data ?? [])
    .filter((project) => !project.isArchived)
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
    .slice(0, 6)

  if (projects.length === 0) return null

  return (
    <div className="mt-6">
      <p className="px-2.5 pb-1.5 text-[0.6875rem] font-medium text-rail-muted-foreground">
        {t('app.recentProjects')}
      </p>
      <ul className="flex flex-col gap-0.5">
        {projects.map((project) => (
          <li key={project.id}>
            <NavLink
              to={`/app/projects/${project.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150 focus-visible:outline-rail-foreground',
                  isActive
                    ? 'bg-rail-accent text-rail-foreground'
                    : 'text-rail-muted-foreground hover:bg-rail-accent/55 hover:text-rail-foreground',
                ].join(' ')
              }
            >
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span className="truncate">{project.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A low course of azulejo tiles: the rail reads as a tiled wall. */
function RailTiles(): ReactNode {
  return (
    <div
      className="flex gap-1 px-4 pb-3 opacity-60 [--tile-done:var(--rail-accent)] [--tile-glaze:var(--rail)] [--tile-open:color-mix(in_srgb,var(--rail)_60%,var(--rail-accent))] [--tile-overdue:var(--ochre)]"
      aria-hidden="true"
    >
      {(['done', 'open', 'done', 'done', 'overdue', 'done', 'open', 'done', 'done'] as const).map(
        (state, index) => (
          <TileGlyph key={index} state={state} size={16} turn={[0, 90, 180, 270][index % 4] ?? 0} />
        ),
      )}
    </div>
  )
}

function RailContent({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  return (
    <div className="flex h-full flex-col bg-rail text-rail-foreground">
      <div className="flex h-14 items-center px-4">
        <Logo tone="rail" />
      </div>
      <div className="px-3 pb-2">
        <WorkspaceSwitcher />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <NavList onNavigate={onNavigate} />
        <RecentProjects onNavigate={onNavigate} />
      </div>
      <RailTiles />
      <div className="border-t border-rail-border p-3">
        <UserMenu />
      </div>
    </div>
  )
}

function Breadcrumbs(): ReactNode {
  const { t } = useTranslation()
  const crumbs = useBreadcrumbStore((state) => state.crumbs)
  if (crumbs.length === 0) return null

  return (
    <nav aria-label={t('app.breadcrumb')} className="hidden min-w-0 md:block">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {crumb.to && !last ? (
                <Link
                  to={crumb.to}
                  className="max-w-48 truncate rounded-sm px-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="max-w-64 truncate px-1 font-medium"
                  aria-current={last ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!last && (
                <ChevronRightIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function SearchButton(): ReactNode {
  const { t } = useTranslation()
  const openPalette = useCommandPaletteStore((state) => state.openPalette)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="hidden h-9 w-full max-w-72 items-center gap-2.5 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--input)_70%,var(--foreground))] hover:text-foreground sm:flex"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">{t('app.searchOrJump')}</span>
        <kbd className="rounded-sm border bg-muted px-1.5 font-sans text-[0.6875rem] font-medium">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={openPalette}
        aria-label={t('app.searchOrJump')}
      >
        <SearchIcon />
      </Button>
    </>
  )
}

function TopBar(): ReactNode {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t('common.openMenu')}
            >
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 border-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('app.navigation')}</SheetTitle>
            </SheetHeader>
            <RailContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <Logo className="lg:hidden" wordmark={false} />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-4 sm:justify-start">
          <Breadcrumbs />
          <div className="flex min-w-0 flex-1 justify-end">
            <SearchButton />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <NotificationsDropdown />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}

export function AppShell(): ReactNode {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <RailContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <TopBar />
        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
