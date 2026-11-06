import { describe, expect, it } from 'vitest'

import { CATALOG_FOR, SITE_LOCALES, negotiateLocale } from './config'

describe('negotiateLocale', () => {
  it('prefers an exact regional match', () => {
    expect(negotiateLocale('es-CR,es;q=0.9,en;q=0.8')).toBe('es-CR')
    expect(negotiateLocale('pt-BR')).toBe('pt-BR')
  })

  it('falls back to the base language', () => {
    expect(negotiateLocale('es-MX,en;q=0.5')).toBe('es')
    expect(negotiateLocale('fr-CA')).toBe('fr')
  })

  it('maps a bare language to its only published region', () => {
    expect(negotiateLocale('pt')).toBe('pt-BR')
  })

  it('honors quality weights', () => {
    expect(negotiateLocale('de;q=1, en;q=0.4, fr;q=0.8')).toBe('fr')
  })

  it('uses Spanish when nothing matches or the header is missing', () => {
    expect(negotiateLocale('de-DE,ja')).toBe('es')
    expect(negotiateLocale(null)).toBe('es')
  })
})

describe('catalog mapping', () => {
  it('maps every published locale to a catalog', () => {
    for (const locale of SITE_LOCALES) {
      expect(CATALOG_FOR[locale]).toBeTruthy()
    }
  })
})
