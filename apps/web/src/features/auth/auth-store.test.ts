import type { AuthResponseDto } from '@orbit/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/features/auth/auth-store'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    refreshSession: vi.fn(),
    setAuthAdapter: vi.fn(),
    resetApiClientState: vi.fn(),
  }
})

import type * as ApiModule from '@/lib/api'
import { refreshSession, resetApiClientState, setAuthAdapter } from '@/lib/api'
import { bootstrapSession, hardLogout, registerAuthAdapter } from '@/features/auth/auth-store'

const session: AuthResponseDto = {
  accessToken: 'access-1',
  expiresIn: 120,
  sessionExpiresAt: '2099-01-01T00:00:00.000Z',
  user: {
    id: 'u1',
    email: 'ada@lovelace.dev',
    fullName: 'Ada Lovelace',
    bio: null,
    avatarKey: null,
    isEmailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
}

const refreshSessionMock = vi.mocked(refreshSession)
const setAuthAdapterMock = vi.mocked(setAuthAdapter)
const resetApiClientStateMock = vi.mocked(resetApiClientState)

beforeEach(() => {
  vi.useFakeTimers()
  refreshSessionMock.mockReset()
  setAuthAdapterMock.mockClear()
  resetApiClientStateMock.mockClear()
  useAuthStore.setState({ user: null, accessToken: null, status: 'booting' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('auth store', () => {
  it('adopts a session and schedules a proactive refresh', () => {
    useAuthStore.getState().setSession(session)

    expect(useAuthStore.getState()).toMatchObject({
      user: session.user,
      accessToken: 'access-1',
      status: 'authenticated',
    })

    vi.advanceTimersByTime(89_000)
    expect(refreshSessionMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(refreshSessionMock).toHaveBeenCalledTimes(1)
  })

  it('re-scheduling a session replaces the pending refresh', () => {
    useAuthStore.getState().setSession(session)
    useAuthStore.getState().setSession({ ...session, expiresIn: 200 })

    vi.advanceTimersByTime(91_000)
    expect(refreshSessionMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(79_000)
    expect(refreshSessionMock).toHaveBeenCalledTimes(1)
  })

  it('clears the session and cancels the pending refresh', () => {
    useAuthStore.getState().setSession(session)
    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      status: 'anonymous',
    })

    vi.advanceTimersByTime(120_000)
    expect(refreshSessionMock).not.toHaveBeenCalled()
  })
})

describe('registerAuthAdapter', () => {
  it('wires the adapter to the store', () => {
    registerAuthAdapter()

    const adapter = setAuthAdapterMock.mock.calls[0]?.[0]
    expect(adapter).toBeDefined()
    if (!adapter) return

    expect(adapter.getAccessToken()).toBeNull()
    useAuthStore.getState().setSession(session)
    expect(adapter.getAccessToken()).toBe('access-1')

    adapter.onSessionRefreshed(session)
    expect(useAuthStore.getState().accessToken).toBe('access-1')

    adapter.onSessionExpired()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})

describe('bootstrapSession', () => {
  it('ends authenticated when the refresh succeeds', async () => {
    refreshSessionMock.mockImplementation(async () => {
      useAuthStore.getState().setSession(session)
      return true
    })

    await bootstrapSession()

    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('ends anonymous when the refresh fails', async () => {
    refreshSessionMock.mockResolvedValueOnce(false)

    await bootstrapSession()

    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('is a no-op once the store left the booting state', async () => {
    useAuthStore.setState({ user: session.user, accessToken: 'access-1', status: 'authenticated' })

    await bootstrapSession()

    expect(refreshSessionMock).not.toHaveBeenCalled()
  })
})

describe('hardLogout', () => {
  it('resets transport state and clears the session', () => {
    useAuthStore.getState().setSession(session)

    hardLogout()

    expect(resetApiClientStateMock).toHaveBeenCalled()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})
