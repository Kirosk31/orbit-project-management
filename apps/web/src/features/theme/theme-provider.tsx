import { useEffect, type ReactNode } from 'react'

import { useThemeStore } from '@/features/theme/theme-store'

/**
 * Applies the resolved theme to <html> (class + color-scheme) and keeps the
 * system preference in sync when the user chose "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement

    if (theme !== 'system') {
      root.classList.toggle('dark', theme === 'dark')
      root.style.colorScheme = theme
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystem = (isDark: boolean): void => {
      root.classList.toggle('dark', isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }

    applySystem(mediaQuery.matches)
    const onChange = (event: MediaQueryListEvent): void => applySystem(event.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [theme])

  return children
}
