export type Result<T, E = unknown> = { ok: true; value: T } | { ok: false; error: E }

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value }
}

export function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}
