import { useEffect } from 'react'
import { create } from 'zustand'

export interface Crumb {
  label: string
  to?: string
}

interface BreadcrumbState {
  crumbs: Crumb[]
  setCrumbs: (crumbs: Crumb[]) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  crumbs: [],
  setCrumbs: (crumbs) => set({ crumbs }),
}))

/**
 * Declares where the current page sits (Project › Board › Task). The top bar
 * renders the trail; it clears when the page unmounts.
 */
export function useBreadcrumbs(crumbs: Crumb[]): void {
  const setCrumbs = useBreadcrumbStore((state) => state.setCrumbs)
  const signature = crumbs.map((crumb) => `${crumb.label}|${crumb.to ?? ''}`).join('>')
  useEffect(() => {
    setCrumbs(crumbs)
    return () => setCrumbs([])
    // `signature` captures every field of `crumbs` that matters for rendering.
  }, [signature, setCrumbs])
}
