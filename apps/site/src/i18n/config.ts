/**
 * Locales the public site is published in. Costa Rican Spanish leads: it shares
 * the Spanish catalog, and its own route sets html lang, hreflang and number
 * and date formatting for the region.
 */
export const SITE_LOCALES = ['es-CR', 'es', 'pt-BR', 'en', 'fr'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]

export const DEFAULT_SITE_LOCALE: SiteLocale = 'es'

export type CatalogKey = 'en' | 'es' | 'fr' | 'pt-br'

export const CATALOG_FOR: Record<SiteLocale, CatalogKey> = {
  'es-CR': 'es',
  es: 'es',
  'pt-BR': 'pt-br',
  en: 'en',
  fr: 'fr',
}

/** Name of each locale in its own language, for the language menu. */
export const LOCALE_LABEL: Record<SiteLocale, string> = {
  'es-CR': 'Español (Costa Rica)',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  fr: 'Français',
}

export function isSiteLocale(value: string): value is SiteLocale {
  return (SITE_LOCALES as readonly string[]).includes(value)
}

/**
 * Picks the best published locale for an Accept-Language header: an exact
 * region match first, then the base language, then the default.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): SiteLocale {
  if (!acceptLanguage) return DEFAULT_SITE_LOCALE
  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const quality = params.find((param) => param.trim().startsWith('q='))
      return { tag: tag.trim().toLowerCase(), q: quality ? Number(quality.split('=')[1]) : 1 }
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of requested) {
    const exact = SITE_LOCALES.find((locale) => locale.toLowerCase() === tag)
    if (exact) return exact
    const base = tag.split('-')[0]
    const byBase = SITE_LOCALES.find((locale) => locale.toLowerCase() === base)
    if (byBase) return byBase
    const regional = SITE_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === base)
    if (regional) return regional
  }
  return DEFAULT_SITE_LOCALE
}
