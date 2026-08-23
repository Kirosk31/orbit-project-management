import { useEffect, useState } from 'react'

import { resolveTheme, useThemeStore } from '@/features/theme/theme-store'

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((state) => state.theme)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(theme))

  useEffect(() => {
    setResolved(resolveTheme(theme))
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setResolved(resolveTheme('system'))
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [theme])

  return resolved
}
