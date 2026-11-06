import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'

import { useCommandPaletteStore } from '@/features/command-palette/command-palette-store'
import { useHotkeys } from '@/hooks/use-hotkeys'

const CommandPalette = lazy(() =>
  import('@/features/command-palette/command-palette').then((module) => ({
    default: module.CommandPalette,
  })),
)

/**
 * Keeps the palette's shortcuts always live but loads the palette itself
 * (cmdk, search) only the first time someone opens it.
 */
export function CommandPaletteHost(): ReactNode {
  const open = useCommandPaletteStore((state) => state.open)
  const togglePalette = useCommandPaletteStore((state) => state.togglePalette)
  const openPalette = useCommandPaletteStore((state) => state.openPalette)
  const [loaded, setLoaded] = useState(open)

  useEffect(() => {
    if (open) setLoaded(true)
  }, [open])

  useHotkeys(['mod+k', 'ctrl+k'], () => togglePalette(), !open)
  // "/" jumps to search, on layouts where it needs Shift as well.
  useHotkeys(['/', 'shift+/'], () => openPalette(), !open)

  if (!loaded) return null
  return (
    <Suspense fallback={null}>
      <CommandPalette />
    </Suspense>
  )
}
