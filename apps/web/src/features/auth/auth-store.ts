import type { AuthResponseDto, UserDto } from '@orbit/shared'
import { create } from 'zustand'

import { refreshSession, resetApiClientState, setAuthAdapter } from '@/lib/api'

export type AuthStatus = 'booting' | 'authenticated' | 'anonymous'

interface AuthState {
  user: UserDto | null
  accessToken: string | null
  status: AuthStatus
  /** Adopts a full session (login, register or refresh response). */
  setSession: (session: AuthResponseDto) => void
  setUser: (user: UserDto) => void
  clearSession: () => void
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleProactiveRefresh(expiresInSeconds: number): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
  }
  // Refresh 30s before the access token expires so requests never race
  // an expired token. The single-flight guard in the API client absorbs
  // concurrent 401s in the meantime.
  const delayMs = Math.max(10_000, expiresInSeconds * 1000 - 30_000)
  refreshTimer = setTimeout(() => {
    void refreshSession()
  }, delayMs)
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'booting',

  setSession: (session) => {
    scheduleProactiveRefresh(session.expiresIn)
    set({
      user: session.user,
      accessToken: session.accessToken,
      status: 'authenticated',
    })
  },

  setUser: (user) => set({ user }),

  clearSession: () => {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    set({ user: null, accessToken: null, status: 'anonymous' })
  },
}))

/**
 * Wires the Zustand store into the transport layer. Called once during app
 * bootstrap; keeps the API client free of circular imports.
 */
export function registerAuthAdapter(): void {
  setAuthAdapter({
    getAccessToken: () => useAuthStore.getState().accessToken,
    onSessionRefreshed: (session) => useAuthStore.getState().setSession(session),
    onSessionExpired: () => useAuthStore.getState().clearSession(),
  })
}

/**
 * Bootstraps the session on cold start: the access token lives in memory
 * only, so a full page load always starts from a refresh-token rotation.
 * Ends in either `authenticated` or `anonymous`; never stays `booting`.
 */
export async function bootstrapSession(): Promise<void> {
  registerAuthAdapter()
  const store = useAuthStore.getState()
  if (store.status !== 'booting') return

  const refreshed = await refreshSession()
  if (!refreshed) {
    store.clearSession()
  }
}

export function hardLogout(): void {
  resetApiClientState()
  useAuthStore.getState().clearSession()
}
