import { LOCALE_FORMATTING_TAGS, SUPPORTED_LOCALES, type Locale } from '@orbit/shared'

export interface LocaleOption {
  code: Locale
  /** Native language name so the option remains recognizable in every UI language. */
  label: string
  /** Canonical locale passed to Intl formatters. */
  intlLocale: string
}

const localeMetadata: Record<Locale, Omit<LocaleOption, 'code'>> = {
  en: { label: 'English', intlLocale: LOCALE_FORMATTING_TAGS.en },
  es: { label: 'Español', intlLocale: LOCALE_FORMATTING_TAGS.es },
  fr: { label: 'Français', intlLocale: LOCALE_FORMATTING_TAGS.fr },
  'pt-BR': { label: 'Português (Brasil)', intlLocale: LOCALE_FORMATTING_TAGS['pt-BR'] },
}

export const LOCALE_OPTIONS: readonly LocaleOption[] = SUPPORTED_LOCALES.map((code) => ({
  code,
  ...localeMetadata[code],
}))

export function getLocaleOption(locale: Locale): LocaleOption {
  return LOCALE_OPTIONS.find((option) => option.code === locale) ?? LOCALE_OPTIONS[0]!
}
