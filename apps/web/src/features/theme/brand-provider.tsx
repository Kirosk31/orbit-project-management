import { useEffect, type ReactNode } from 'react'

import { applyBrandHue, useBrandStore } from '@/features/theme/brand-store'

/** Keeps the tenant brand hue on <html>, where every token reads it. */
export function BrandProvider({ children }: { children: ReactNode }): ReactNode {
  const hue = useBrandStore((state) => state.hue)

  useEffect(() => {
    applyBrandHue(hue)
  }, [hue])

  return children
}
