type StorageKind = 'local' | 'session'

export function getBrowserStorage(kind: StorageKind = 'local'): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStorageItem(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return getBrowserStorage(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStorageItem(key: string, value: string, kind: StorageKind = 'local'): boolean {
  try {
    const storage = getBrowserStorage(kind)
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
