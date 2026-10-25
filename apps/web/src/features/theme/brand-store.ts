import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const BRAND_STORAGE_KEY = 'orbit.brand'

/** Orbit's own cobalt; the default skin. */
export const DEFAULT_BRAND_HUE = 264

/**
 * Hues an agency might bring. Every token derives from the hue at fixed
 * lightness, so contrast holds whichever one is chosen.
 */
export const BRAND_PRESETS = [
  { key: 'brandCobalt', hue: DEFAULT_BRAND_HUE },
  { key: 'brandTeal', hue: 205 },
  { key: 'brandGreen', hue: 150 },
  { key: 'brandBrick', hue: 35 },
  { key: 'brandPlum', hue: 340 },
  { key: 'brandViolet', hue: 300 },
] as const

interface BrandState {
  hue: number
  setHue: (hue: number) => void
  reset: () => void
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      hue: DEFAULT_BRAND_HUE,
      setHue: (hue) => set({ hue }),
      reset: () => set({ hue: DEFAULT_BRAND_HUE }),
    }),
    { name: BRAND_STORAGE_KEY },
  ),
)

/** Writes the hue to :root, or removes the override for the default skin. */
export function applyBrandHue(hue: number, root: HTMLElement = document.documentElement): void {
  if (hue === DEFAULT_BRAND_HUE) root.style.removeProperty('--brand-hue')
  else root.style.setProperty('--brand-hue', String(hue))
}
