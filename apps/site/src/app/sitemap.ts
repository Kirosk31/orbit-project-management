import type { MetadataRoute } from 'next'

import { SITE_LOCALES } from '@/i18n/config'
import { languageAlternates } from '@/lib/locale-meta'
import { SITE_URL } from '@/lib/urls'

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(languageAlternates()).map(([locale, path]) => [locale, `${SITE_URL}${path}`]),
  )
  return SITE_LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    changeFrequency: 'monthly',
    priority: locale === 'es-CR' || locale === 'es' ? 1 : 0.8,
    alternates: { languages },
  }))
}
