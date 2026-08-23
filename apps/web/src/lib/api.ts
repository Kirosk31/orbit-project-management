import { ApiErrorCode, type ApiEnvelope, type AuthResponseDto } from '@orbit/shared'
import { env } from './env'
import { buildQueryString } from './utils'

export const CSRF_HEADER_NAME = 'x-csrf-token'
export const AUTH_REFRESH_PATH = '/auth/refresh'
export const AUTH_CSRF_PATH = '/auth/csrf'

export interface ApiRequestOptions extends Omit<RequestInit, 'headers' | 'body' | 'method'> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  /** Skip the CSRF header. Only for the CSRF bootstrap request itself. */
  skipCsrf?: boolean
  /** Skip the token-refresh retry. Only for the refresh endpoint itself. */
  skipAuth?: boolean
}

/**
 * Adapter decoupling the transport layer from the auth state layer.
 * The auth feature registers itself once during app bootstrap, so this
 * module never needs to import the Zustand store (no circular imports).
 */
export interface AuthAdapter {
  getAccessToken(): string | null
  onSessionRefreshed(session: AuthResponseDto): void
  onSessionExpired(): void
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details: unknown

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isValidationError(): boolean {
    return this.code === ApiErrorCode.VALIDATION_ERROR
  }
}

function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

let adapter: AuthAdapter | null = null
let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null
let refreshPromise: Promise<boolean> | null = null

export function setAuthAdapter(next: AuthAdapter | null): void {
  adapter = next
}

/**
 * Resets in-memory transport state (CSRF token, in-flight refresh).
 * Used on full logout and in tests.
 */
export function resetApiClientState(): void {
  csrfToken = null
  csrfPromise = null
  refreshPromise = null
}

function resolveBaseUrl(): string {
  const base = env.VITE_API_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken
  if (csrfPromise === null) {
    csrfPromise = (async () => {
      const data = await execute<{ csrfToken: string }>(AUTH_CSRF_PATH, {
        method: 'GET',
        skipCsrf: true,
        skipAuth: true,
      })
      csrfToken = data.csrfToken
      return csrfToken
    })().finally(() => {
      csrfPromise = null
    })
  }
  return csrfPromise
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (response.status === 204) {
    return { data: undefined as T }
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { data: (await response.text()) as T }
  }
  return (await response.json()) as ApiEnvelope<T>
}

function toApiClientError(status: number, payload: unknown): ApiClientError {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'object' &&
    (payload as { error?: unknown }).error !== null
  ) {
    const { code, message, details } = (
      payload as {
        error: { code?: string; message?: string; details?: unknown }
      }
    ).error
    return new ApiClientError(
      status,
      Object.values(ApiErrorCode).includes(code as ApiErrorCode)
        ? (code as ApiErrorCode)
        : ApiErrorCode.INTERNAL_ERROR,
      message ?? 'Request failed',
      details,
    )
  }
  return new ApiClientError(status, ApiErrorCode.INTERNAL_ERROR, `Request failed (${status})`)
}

async function execute<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { method = 'GET', params, headers = {}, body, timeoutMs, skipCsrf = false } = options
  const url = `${resolveBaseUrl()}${path}${buildQueryString(params ?? {})}`

  const requestHeaders: Record<string, string> = { ...headers }
  const token = adapter?.getAccessToken()
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json'
  }
  if (method !== 'GET' && !skipCsrf) {
    requestHeaders[CSRF_HEADER_NAME] = await fetchCsrfToken()
  }

  const signals: AbortSignal[] = []
  if (options.signal) signals.push(options.signal)
  if (timeoutMs !== undefined) signals.push(AbortSignal.timeout(timeoutMs))
  const signal = signals.length > 0 ? AbortSignal.any(signals) : undefined

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      credentials: 'include',
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(0, ApiErrorCode.BAD_REQUEST, 'Request aborted')
    }
    throw new ApiClientError(0, ApiErrorCode.SERVICE_UNAVAILABLE, 'Network error — are you online?')
  }

  const payload = await parseEnvelope<T>(response)

  if (!response.ok) {
    throw toApiClientError(response.status, payload)
  }

  return payload.data
}

async function executeBlob(path: string, options: Pick<ApiRequestOptions, 'signal' | 'timeoutMs'>) {
  const requestHeaders: Record<string, string> = {}
  const token = adapter?.getAccessToken()
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const signals: AbortSignal[] = []
  if (options.signal) signals.push(options.signal)
  if (options.timeoutMs !== undefined) signals.push(AbortSignal.timeout(options.timeoutMs))

  let response: Response
  try {
    response = await fetch(`${resolveBaseUrl()}${path}`, {
      method: 'GET',
      headers: requestHeaders,
      credentials: 'include',
      signal: signals.length > 0 ? AbortSignal.any(signals) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(0, ApiErrorCode.BAD_REQUEST, 'Request aborted')
    }
    throw new ApiClientError(0, ApiErrorCode.SERVICE_UNAVAILABLE, 'Network error — are you online?')
  }

  if (!response.ok) {
    throw toApiClientError(response.status, await parseEnvelope<unknown>(response))
  }

  return response.blob()
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (options.skipAuth) {
    return execute<T>(path, options)
  }

  try {
    return await execute<T>(path, options)
  } catch (error) {
    // Single-flight refresh on expired access tokens, then retry once.
    if (isApiClientError(error) && error.status === 401) {
      const refreshed = await refreshSession()
      if (refreshed) {
        return execute<T>(path, options)
      }
    }
    throw error
  }
}

export async function apiBlobRequest(
  path: string,
  options: Pick<ApiRequestOptions, 'signal' | 'timeoutMs'> = {},
): Promise<Blob> {
  try {
    return await executeBlob(path, options)
  } catch (error) {
    if (isApiClientError(error) && error.status === 401 && (await refreshSession())) {
      return executeBlob(path, options)
    }
    throw error
  }
}

/**
 * Rotates the refresh token and issues a fresh access token. Single-flighted:
 * concurrent 401s share one refresh instead of hammering the endpoint.
 * Returns true when a new session was established.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshPromise === null) {
    refreshPromise = doRefreshSession().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doRefreshSession(): Promise<boolean> {
  try {
    const session = await execute<AuthResponseDto>(AUTH_REFRESH_PATH, {
      method: 'POST',
      skipAuth: true,
    })
    adapter?.onSessionRefreshed(session)
    return true
  } catch (error) {
    if (isApiClientError(error)) {
      adapter?.onSessionExpired()
    }
    return false
  }
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST' }),
  put: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT' }),
  patch: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH' }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}
