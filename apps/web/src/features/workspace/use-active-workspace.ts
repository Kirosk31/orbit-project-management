import type { OrganizationDto } from '@orbit/shared'
import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { listOrganizationsRequest } from '@/features/organizations/org-api'

export const WORKSPACE_STORAGE_KEY = 'orbit.workspace'

interface WorkspaceState {
  activeSlug: string | null
  setActiveSlug: (slug: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeSlug: null,
      setActiveSlug: (activeSlug) => set({ activeSlug }),
    }),
    { name: WORKSPACE_STORAGE_KEY },
  ),
)

/** Picks the stored workspace, else the first shared one, else the personal one. */
export function pickWorkspace(
  organizations: readonly OrganizationDto[],
  activeSlug: string | null,
): OrganizationDto | undefined {
  return (
    organizations.find((organization) => organization.slug === activeSlug) ??
    organizations.find((organization) => !organization.isPersonal) ??
    organizations[0]
  )
}

/** The workspace the whole app is looking at, chosen from the rail. */
export function useActiveWorkspace(): {
  organizations: OrganizationDto[]
  active: OrganizationDto | undefined
  setActiveSlug: (slug: string) => void
  isLoading: boolean
} {
  const { activeSlug, setActiveSlug } = useWorkspaceStore()
  const query = useQuery({ queryKey: ['organizations'], queryFn: listOrganizationsRequest })
  const organizations = query.data ?? []
  return {
    organizations,
    active: pickWorkspace(organizations, activeSlug),
    setActiveSlug,
    isLoading: query.isLoading,
  }
}
