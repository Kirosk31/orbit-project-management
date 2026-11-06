import { describe, expect, it } from 'vitest'

import { SITE_LOCALES } from './config'
import { format, getDictionary } from './dictionary'

describe('getDictionary', () => {
  it('serves Costa Rica from the Spanish catalog', () => {
    expect(getDictionary('es-CR')).toBe(getDictionary('es'))
  })

  it('has site copy for every published locale', () => {
    for (const locale of SITE_LOCALES) {
      const { site } = getDictionary(locale)
      expect(site.metaTitle).toMatch(/Orbit/)
      expect(site.metaDescription.length).toBeGreaterThan(80)
    }
  })
})

describe('format', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(format('{{done}} of {{ total }} done', { done: 5, total: '14' })).toBe('5 of 14 done')
    expect(format('{{missing}}', {})).toBe('{{missing}}')
  })
})
