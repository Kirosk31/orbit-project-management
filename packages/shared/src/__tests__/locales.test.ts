import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localeSchema,
  resolveFormattingLocale,
  resolveSupportedLocale,
} from '../locales.js'

describe('locale contract', () => {
  it('accepts every supported locale and rejects unknown values', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(localeSchema.parse(locale)).toBe(locale)
    }
    expect(localeSchema.safeParse('de').success).toBe(false)
  })

  it('resolves exact and language-family browser tags', () => {
    expect(resolveSupportedLocale('PT_br')).toBe('pt-BR')
    expect(resolveSupportedLocale('es-CR')).toBe('es')
    expect(resolveSupportedLocale('fr-CA')).toBe('fr')
    expect(resolveSupportedLocale('de-DE')).toBeNull()
    expect(resolveFormattingLocale('es-CR')).toBe('es-419')
    expect(DEFAULT_LOCALE).toBe('en')
  })
})
