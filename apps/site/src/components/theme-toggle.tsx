'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { button } from './styles'

const STORAGE_KEY = 'orbit.theme'

/** Same storage shape as the app's theme store, read by /theme-init.js before paint. */
function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { theme }, version: 0 }))
  } catch {
    // Private browsing: the choice lasts for this page only.
  }
}

export function ThemeToggle({ toDark, toLight }: { toDark: string; toLight: string }): ReactNode {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = (): void => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
    saveTheme(next ? 'dark' : 'light')
    setDark(next)
  }

  return (
    <button
      type="button"
      className={button.iconOnRail}
      onClick={toggle}
      aria-label={dark ? toLight : toDark}
    >
      {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </button>
  )
}
