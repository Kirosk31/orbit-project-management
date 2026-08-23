import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CircleUserRoundIcon,
  FolderKanbanIcon,
  GlobeIcon,
  HomeIcon,
  MessageSquareTextIcon,
  LogInIcon,
  MonitorIcon,
  MoonIcon,
  TagIcon,
  ListTodoIcon,
  SunIcon,
  UserPlusIcon,
} from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useCommandPaletteStore } from '@/features/command-palette/command-palette-store'
import { useAuthStore } from '@/features/auth/auth-store'
import { useThemeStore } from '@/features/theme/theme-store'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { LOCALE_OPTIONS } from '@/features/i18n/locale-options'
import { useLocale } from '@/features/i18n/use-locale'
import { globalSearchRequest } from '@/features/search/search-api'
import type { SearchResultType } from '@orbit/shared'

const SEARCH_ICON = {
  TASK: ListTodoIcon,
  PROJECT: FolderKanbanIcon,
  USER: CircleUserRoundIcon,
  COMMENT: MessageSquareTextIcon,
  LABEL: TagIcon,
} satisfies Record<SearchResultType, typeof ListTodoIcon>

const SEARCH_TYPE_KEY = {
  TASK: 'command.resultType.task',
  PROJECT: 'command.resultType.project',
  USER: 'command.resultType.user',
  COMMENT: 'command.resultType.comment',
  LABEL: 'command.resultType.label',
} as const satisfies Record<SearchResultType, string>

function scrollToSection(
  id: string,
  pathname: string,
  navigate: ReturnType<typeof useNavigate>,
): void {
  if (pathname === '/') {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  navigate(`/#${id}`)
}

export function CommandPalette(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open, closePalette, togglePalette } = useCommandPaletteStore()
  const { theme, setTheme } = useThemeStore()
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const { currentLocale, changeLocale } = useLocale()
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [searchValue])

  useEffect(() => {
    if (!open) {
      setSearchValue('')
      setDebouncedSearch('')
    }
  }, [open])

  const searchQuery = useQuery({
    queryKey: ['global-search', debouncedSearch],
    queryFn: () => globalSearchRequest(debouncedSearch),
    enabled: isAuthenticated && debouncedSearch.length >= 2,
    staleTime: 15_000,
  })

  useHotkeys(['mod+k', 'ctrl+k'], () => togglePalette(), !open)

  const cycleLanguage = (): void => {
    const currentIndex = LOCALE_OPTIONS.findIndex((option) => option.code === currentLocale)
    const next = LOCALE_OPTIONS[(currentIndex + 1) % LOCALE_OPTIONS.length] ?? LOCALE_OPTIONS[0]
    if (next) void changeLocale(next.code)
  }

  const runAction = (action: () => void): void => {
    action()
    closePalette()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={closePalette}
      title={t('command.title')}
      description={t('command.description')}
    >
      <CommandInput
        value={searchValue}
        onValueChange={setSearchValue}
        placeholder={t('command.placeholder')}
      />
      <CommandList>
        <CommandEmpty>{t('command.noResults')}</CommandEmpty>
        {isAuthenticated && searchValue.trim().length >= 2 ? (
          <CommandGroup heading={t('command.searchResults')}>
            {searchQuery.isLoading ? (
              <CommandItem disabled value={searchValue}>
                {t('command.searching')}
              </CommandItem>
            ) : searchQuery.isError ? (
              <CommandItem disabled value={searchValue}>
                {t('command.searchError')}
              </CommandItem>
            ) : (
              searchQuery.data?.rows.map((result) => {
                const Icon = SEARCH_ICON[result.type]
                return (
                  <CommandItem
                    key={`${result.type}:${result.orgId}:${result.id}`}
                    value={`${result.title} ${result.excerpt ?? ''} ${result.orgName} ${result.type}`}
                    onSelect={() => runAction(() => navigate(result.linkUrl))}
                  >
                    <Icon />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {t(SEARCH_TYPE_KEY[result.type])} · {result.orgName}
                        {result.excerpt ? ` · ${result.excerpt}` : ''}
                      </span>
                    </span>
                  </CommandItem>
                )
              })
            )}
          </CommandGroup>
        ) : null}
        {isAuthenticated && searchValue.trim().length === 1 ? (
          <CommandGroup heading={t('command.searchResults')}>
            <CommandItem disabled value={searchValue}>
              {t('command.minimumCharacters')}
            </CommandItem>
          </CommandGroup>
        ) : null}
        <CommandGroup heading={t('command.goto')}>
          <CommandItem
            onSelect={() =>
              runAction(() => {
                navigate('/')
                scrollToSection('top', '/', navigate)
              })
            }
          >
            <HomeIcon />
            <span>{t('common.backHome')}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAction(() => scrollToSection('features', window.location.pathname, navigate))
            }
          >
            <HomeIcon />
            <span>{t('nav.features')}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAction(() => scrollToSection('how-it-works', window.location.pathname, navigate))
            }
          >
            <HomeIcon />
            <span>{t('nav.howItWorks')}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAction(() => scrollToSection('faq', window.location.pathname, navigate))
            }
          >
            <HomeIcon />
            <span>{t('nav.faq')}</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('command.actions')}>
          <CommandItem
            onSelect={() =>
              runAction(() => {
                const order = ['system', 'dark', 'light'] as const
                const next = order[(order.indexOf(theme) + 1) % order.length] ?? 'system'
                setTheme(next)
              })
            }
          >
            {theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <MonitorIcon />}
            <span>{t('command.toggleTheme')}</span>
            <kbd className="text-muted-foreground ml-auto text-xs">{t('common.theme')}</kbd>
          </CommandItem>
          <CommandItem onSelect={() => runAction(cycleLanguage)}>
            <GlobeIcon />
            <span>{t('command.changeLanguage')}</span>
            <span className="text-muted-foreground ml-auto text-xs uppercase">{currentLocale}</span>
          </CommandItem>
          {!isAuthenticated && (
            <>
              <CommandItem onSelect={() => runAction(() => navigate('/login'))}>
                <LogInIcon />
                <span>{t('command.login')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runAction(() => navigate('/register'))}>
                <UserPlusIcon />
                <span>{t('command.signUp')}</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
