const APP_ROOT_PATH = '/app'
const INTERNAL_ORIGIN = 'https://orbit.invalid'

export function getSafeAuthReturnPath(value: unknown): string {
  if (typeof value !== 'string') {
    return APP_ROOT_PATH
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN)
    const isAppPath = url.pathname === APP_ROOT_PATH || url.pathname.startsWith(`${APP_ROOT_PATH}/`)

    if (url.origin !== INTERNAL_ORIGIN || !isAppPath) {
      return APP_ROOT_PATH
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return APP_ROOT_PATH
  }
}
