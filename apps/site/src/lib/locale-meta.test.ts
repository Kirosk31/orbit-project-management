import { describe, expect, it } from 'vitest'

import { languageAlternates, openGraphLocale } from './locale-meta'

describe('openGraphLocale', () => {
  it('keeps explicit regions and fills in a default one', () => {
    expect(openGraphLocale('es-CR')).toBe('es_CR')
    expect(openGraphLocale('pt-BR')).toBe('pt_BR')
    expect(openGraphLocale('fr')).toBe('fr_FR')
  })
})

describe('languageAlternates', () => {
  it('lists every locale plus x-default', () => {
    expect(languageAlternates()).toEqual({
      'es-CR': '/es-CR',
      es: '/es',
      'pt-BR': '/pt-BR',
      en: '/en',
      fr: '/fr',
      'x-default': '/es',
    })
  })
})
