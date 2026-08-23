import { z } from 'zod'

/**
 * Locale identifiers supported across the API and web application.
 *
 * Keep this list in the shared package so persisted preferences, request
 * validation, and frontend catalogs cannot drift independently.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt-BR'] as const

export const localeSchema = z.enum(SUPPORTED_LOCALES)

export type Locale = z.infer<typeof localeSchema>

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_FORMATTING_TAGS: Readonly<Record<Locale, string>> = {
  en: 'en-US',
  es: 'es-419',
  fr: 'fr-FR',
  'pt-BR': 'pt-BR',
}

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value)
}

/** Maps browser-style regional tags to the closest supported application locale. */
export function resolveSupportedLocale(value: string | null | undefined): Locale | null {
  if (!value) return null

  const normalized = value.trim().replace('_', '-').toLowerCase()
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized)
  if (exact) return exact

  const language = normalized.split('-')[0]
  return (
    SUPPORTED_LOCALES.find((locale) => locale.split('-')[0]?.toLowerCase() === language) ?? null
  )
}

export function resolveFormattingLocale(value: string | null | undefined): string {
  const locale = resolveSupportedLocale(value) ?? DEFAULT_LOCALE
  return LOCALE_FORMATTING_TAGS[locale]
}
