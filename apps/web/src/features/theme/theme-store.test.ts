import { beforeEach, describe, expect, it } from 'vitest'

import { resolveTheme, THEME_STORAGE_KEY, useThemeStore } from '@/features/theme/theme-store'

beforeEach(() => {
  useThemeStore.setState({ theme: 'system' })
})

describe('useThemeStore', () => {
  it('persists the theme choice', () => {
    useThemeStore.getState().setTheme('dark')
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}').state.theme).toBe('dark')
  })

  it('cycles system -> dark -> light -> system', () => {
    const cycle = () => useThemeStore.getState().cycleTheme()

    expect(useThemeStore.getState().theme).toBe('system')
    cycle()
    expect(useThemeStore.getState().theme).toBe('dark')
    cycle()
    expect(useThemeStore.getState().theme).toBe('light')
    cycle()
    expect(useThemeStore.getState().theme).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('returns the preference directly for explicit choices', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('resolves system through matchMedia', () => {
    expect(resolveTheme('system')).toBe('light')
  })
})
