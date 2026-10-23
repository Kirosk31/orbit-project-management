/** Where the product lives; CTAs send people there. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(
  /\/$/,
  '',
)

/** Canonical origin of this site, for metadata, sitemap and Open Graph. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export function appUrl(path: '/register' | '/login'): string {
  return `${APP_URL}${path}`
}
