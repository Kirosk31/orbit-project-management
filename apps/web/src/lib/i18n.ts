import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  resolveSupportedLocale,
  type Locale,
} from '@orbit/shared'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { readStorageItem, writeStorageItem } from '@/lib/browser-storage'
import { en, type EnDictionary } from '@/locales/en'

export type { Locale } from '@orbit/shared'

export const LOCALE_STORAGE_KEY = 'orbit.language'

const baseResources = {
  en: { translation: en },
} as const

const catalogLoaders = {
  es: async () => (await import('@/locales/es')).es,
  fr: async () => (await import('@/locales/fr')).fr,
  'pt-BR': async () => (await import('@/locales/pt-br')).ptBR,
} as const

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: EnDictionary
    }
  }
}

/**
 * Recursively builds the union of every leaf translation key. Container
 * keys (objects and arrays) are included so dictionaries stay fully typed.
 */
export type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends readonly unknown[] | Record<string, unknown>
    ? K | `${K}.${NestedKeyOf<T[K]>}`
    : K
}[keyof T & string]

export type TranslationKey = NestedKeyOf<EnDictionary>

/**
 * Loose translation accessor for container keys (objects and arrays), which
 * the strict `t()` typing rejects. i18next returns the resolved value
 * verbatim when it is not a string.
 */
const looseTranslate = i18n.t as unknown as (key: string) => string

export function translate(key: TranslationKey): string {
  return looseTranslate(key)
}

export function translateArray(key: TranslationKey): readonly string[] {
  return looseTranslate(key) as unknown as readonly string[]
}

export function detectLocale(): Locale {
  const stored = readStorageItem(LOCALE_STORAGE_KEY)
  const storedLocale = resolveSupportedLocale(stored)
  if (storedLocale) {
    return storedLocale
  }

  const browserNavigator = typeof window === 'undefined' ? null : window.navigator
  const browserLanguages = browserNavigator
    ? [...(browserNavigator.languages ?? []), browserNavigator.language]
    : []
  for (const browserLanguage of browserLanguages) {
    const locale = resolveSupportedLocale(browserLanguage)
    if (locale) return locale
  }

  return DEFAULT_LOCALE
}

export function persistLocale(locale: Locale): void {
  writeStorageItem(LOCALE_STORAGE_KEY, locale)
}

export function getCurrentLocale(language = i18n.resolvedLanguage ?? i18n.language): Locale {
  return resolveSupportedLocale(language) ?? DEFAULT_LOCALE
}

export async function loadLocaleResource(locale: Locale): Promise<void> {
  if (locale === 'en' || i18n.hasResourceBundle(locale, 'translation')) return

  const catalog = await catalogLoaders[locale]()
  i18n.addResourceBundle(locale, 'translation', catalog, true, true)
}

function synchronizeDocumentLanguage(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = 'ltr'
}

/** Applies a locale consistently to i18next, browser storage, and the HTML document. */
export async function applyLocale(locale: Locale): Promise<void> {
  await loadLocaleResource(locale)
  persistLocale(locale)
  await i18n.changeLanguage(locale)
  synchronizeDocumentLanguage(locale)
}

const initialLocale = detectLocale()

await i18n.use(initReactI18next).init({
  resources: baseResources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  load: 'currentOnly',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  react: {
    useSuspense: false,
  },
})

i18n.on('languageChanged', (language) => {
  synchronizeDocumentLanguage(resolveSupportedLocale(language) ?? DEFAULT_LOCALE)
})

if (initialLocale !== DEFAULT_LOCALE) {
  await loadLocaleResource(initialLocale)
  await i18n.changeLanguage(initialLocale)
}
synchronizeDocumentLanguage(initialLocale)

export default i18n
