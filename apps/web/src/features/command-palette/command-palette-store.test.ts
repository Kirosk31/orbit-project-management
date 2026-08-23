import { describe, expect, it } from 'vitest'

import { useCommandPaletteStore } from '@/features/command-palette/command-palette-store'

describe('useCommandPaletteStore', () => {
  it('starts closed', () => {
    expect(useCommandPaletteStore.getState().open).toBe(false)
  })

  it('opens and closes', () => {
    useCommandPaletteStore.getState().openPalette()
    expect(useCommandPaletteStore.getState().open).toBe(true)
    useCommandPaletteStore.getState().closePalette()
    expect(useCommandPaletteStore.getState().open).toBe(false)
  })

  it('toggles', () => {
    useCommandPaletteStore.getState().togglePalette()
    expect(useCommandPaletteStore.getState().open).toBe(true)
    useCommandPaletteStore.getState().togglePalette()
    expect(useCommandPaletteStore.getState().open).toBe(false)
  })
})
