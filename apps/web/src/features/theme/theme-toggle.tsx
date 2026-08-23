import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useResolvedTheme } from '@/features/theme/use-resolved-theme'
import { useThemeStore, type ThemePreference } from '@/features/theme/theme-store'
import { translate, type TranslationKey } from '@/lib/i18n'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: TranslationKey; icon: ReactNode }> = [
  { value: 'light', label: 'common.lightMode', icon: <SunIcon /> },
  { value: 'dark', label: 'common.darkMode', icon: <MoonIcon /> },
  { value: 'system', label: 'common.systemMode', icon: <MonitorIcon /> },
]

export function ThemeToggle(): ReactNode {
  const { t } = useTranslation()
  const { theme, setTheme } = useThemeStore()
  const resolved = useResolvedTheme()

  const CurrentIcon = resolved === 'dark' ? MoonIcon : SunIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('common.theme')}>
          <CurrentIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map(({ value, label, icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            {icon}
            <span>{translate(label)}</span>
            {theme === value && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
