import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'orbit.theme'

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  /** Cycles system -> dark -> light -> system. */
  cycleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const order: readonly ThemePreference[] = ['system', 'dark', 'light']
        const current = get().theme
        const next = order[(order.indexOf(current) + 1) % order.length] ?? 'system'
        set({ theme: next })
      },
    }),
    {
      name: THEME_STORAGE_KEY,
    },
  ),
)

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}
