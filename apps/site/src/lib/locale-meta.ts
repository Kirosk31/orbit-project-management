import { SITE_LOCALES, type SiteLocale } from '@/i18n/config'

/** Open Graph wants underscores: es-CR → es_CR. */
export function openGraphLocale(locale: SiteLocale): string {
  const [language = locale, region] = locale.split('-')
  const regions: Record<string, string> = { es: 'ES', en: 'US', fr: 'FR', pt: 'BR' }
  return `${language}_${region ?? regions[language] ?? language.toUpperCase()}`
}

/** hreflang alternates for one path, including x-default for unmatched readers. */
export function languageAlternates(path = ''): Record<string, string> {
  const alternates: Record<string, string> = {}
  for (const locale of SITE_LOCALES) alternates[locale] = `/${locale}${path}`
  alternates['x-default'] = `/es${path}`
  return alternates
}
