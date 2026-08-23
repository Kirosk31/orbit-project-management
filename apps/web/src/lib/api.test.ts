import { ApiErrorCode } from '@orbit/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, apiBlobRequest, ApiClientError, resetApiClientState, setAuthAdapter } from '@/lib/api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function csrfResponse(): Response {
  return jsonResponse({ data: { csrfToken: 'csrf-123' } })
}

function okEnvelope(data: unknown): Response {
  return jsonResponse({ data })
}

/** Routes /auth/csrf to the CSRF response and everything else through `handler`. */
function mockWithCsrf(handler: (url: string) => Response): void {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/auth/csrf')) return Promise.resolve(csrfResponse())
    return Promise.resolve(handler(url))
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetApiClientState()
  setAuthAdapter(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api transport', () => {
  it('performs GET requests without CSRF and with credentials', async () => {
    fetchMock.mockResolvedValueOnce(okEnvelope({ id: 'u1' }))

    const data = await api.get<{ id: string }>('/users/me')

    expect(data).toEqual({ id: 'u1' })
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit]
    expect(String(url)).toBe('/api/v1/users/me')
    expect(init.credentials).toBe('include')
    expect(init.headers).not.toHaveProperty('x-csrf-token')
  })

  it('attaches the Bearer token from the adapter', async () => {
    setAuthAdapter({
      getAccessToken: () => 'token-1',
      onSessionRefreshed: vi.fn(),
      onSessionExpired: vi.fn(),
    })
    fetchMock.mockResolvedValueOnce(okEnvelope({ ok: true }))

    await api.get('/health')

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1')
  })

  it('downloads private binary content with the Bearer token', async () => {
    setAuthAdapter({
      getAccessToken: () => 'token-1',
      onSessionRefreshed: vi.fn(),
      onSessionExpired: vi.fn(),
    })
    fetchMock.mockResolvedValueOnce(
      new Response(new Blob(['avatar'], { type: 'image/png' }), {
        headers: { 'content-type': 'image/png' },
      }),
    )

    const blob = await apiBlobRequest('/users/user-1/avatar')

    expect(blob.type).toBe('image/png')
    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1')
    expect(init.credentials).toBe('include')
  })

  it('fetches a CSRF token once and reuses it for mutations', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/csrf')) return Promise.resolve(csrfResponse())
      return Promise.resolve(okEnvelope({ ok: true }))
    })

    await api.post('/tasks', { body: { title: 'first' } })
    await api.post('/tasks', { body: { title: 'second' } })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const mutationCalls = fetchMock.mock.calls.slice(1) as Array<[RequestInfo | URL, RequestInit]>
    for (const [, init] of mutationCalls) {
      expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('csrf-123')
    }
  })

  it('serializes JSON bodies', async () => {
    mockWithCsrf(() => okEnvelope({ ok: true }))

    await api.post('/tasks', { body: { title: 'ship it' } })

    const [, init] = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit]
    expect(init.body).toBe(JSON.stringify({ title: 'ship it' }))
  })

  it('passes FormData bodies through without a JSON content type', async () => {
    mockWithCsrf(() => okEnvelope({ ok: true }))
    const form = new FormData()
    form.append('avatar', new Blob(['fake-image'], { type: 'image/jpeg' }), 'avatar.jpg')

    await api.post('/users/me/avatar', { body: form })

    const [, init] = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit]
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('csrf-123')
  })

  it('throws ApiClientError with envelope metadata on failure', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: ApiErrorCode.NOT_FOUND, message: 'Task not found', requestId: 'r1' } },
        404,
      ),
    )

    const promise = api.get('/tasks/123')

    await expect(promise).rejects.toMatchObject({
      status: 404,
      code: ApiErrorCode.NOT_FOUND,
      message: 'Task not found',
    })
    await expect(promise).rejects.toBeInstanceOf(ApiClientError)
  })

  it('maps network failures to SERVICE_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const promise = api.get('/tasks')

    await expect(promise).rejects.toMatchObject({
      status: 0,
      code: ApiErrorCode.SERVICE_UNAVAILABLE,
    })
  })

  it('unwraps 204 responses', async () => {
    mockWithCsrf(() => new Response(null, { status: 204 }))

    const data = await api.delete('/tasks/1')

    expect(data).toBeUndefined()
  })
})

describe('session refresh', () => {
  const session = {
    accessToken: 'new-token',
    expiresIn: 3600,
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

  it('refreshes once and retries the original request after a 401', async () => {
    let meCalls = 0
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/csrf')) return Promise.resolve(csrfResponse())
      if (String(input).endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ data: session }))
      }
      meCalls += 1
      if (meCalls === 1) {
        return Promise.resolve(
          jsonResponse({ error: { code: ApiErrorCode.UNAUTHORIZED, message: 'Expired' } }, 401),
        )
      }
      return Promise.resolve(okEnvelope({ id: 'u1' }))
    })

    const onRefreshed = vi.fn()
    setAuthAdapter({
      getAccessToken: () => 'expired-token',
      onSessionRefreshed: onRefreshed,
      onSessionExpired: vi.fn(),
    })

    const data = await api.get<{ id: string }>('/users/me')

    expect(data).toEqual({ id: 'u1' })
    expect(onRefreshed).toHaveBeenCalledWith(session)
    const meCallsActual = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith('/users/me'),
    )
    expect(meCallsActual).toHaveLength(2)
  })

  it('single-flights concurrent refreshes', async () => {
    let refreshCalls = 0
    mockWithCsrf((url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        return jsonResponse({ data: session })
      }
      if (refreshCalls === 0) {
        return jsonResponse({ error: { code: ApiErrorCode.UNAUTHORIZED, message: 'Expired' } }, 401)
      }
      return okEnvelope({ ok: true })
    })

    const [first, second] = await Promise.all([api.get('/a'), api.get('/b')])

    expect(first).toEqual({ ok: true })
    expect(second).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
  })

  it('notifies the adapter and propagates the error when refresh fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ error: { code: ApiErrorCode.UNAUTHORIZED, message: 'No session' } }, 401),
        )
      }
      return Promise.resolve(
        jsonResponse({ error: { code: ApiErrorCode.UNAUTHORIZED, message: 'Expired' } }, 401),
      )
    })

    const onExpired = vi.fn()
    setAuthAdapter({
      getAccessToken: () => 'expired-token',
      onSessionRefreshed: vi.fn(),
      onSessionExpired: onExpired,
    })

    const promise = api.get('/users/me')

    await expect(promise).rejects.toBeInstanceOf(ApiClientError)
    expect(onExpired).toHaveBeenCalledTimes(1)
  })
})
