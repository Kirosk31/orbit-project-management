import { describe, expect, it, vi } from 'vitest'

import { en } from '@/locales/en'
import { es } from '@/locales/es'
import { fr } from '@/locales/fr'
import { ptBR } from '@/locales/pt-br'
import i18n, {
  applyLocale,
  detectLocale,
  loadLocaleResource,
  LOCALE_STORAGE_KEY,
  persistLocale,
  translate,
} from '@/lib/i18n'
import { SUPPORTED_LOCALES } from '@orbit/shared'

type Leaf = string | number | boolean | null

function interpolationVariables(value: Leaf): string[] {
  if (typeof value !== 'string') return []
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map((match) => match[1] ?? '').sort()
}

function flatten(
  source: Record<string, unknown>,
  prefix = '',
  out: Record<string, Leaf> = {},
): Record<string, Leaf> {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[path] = value as Leaf
    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      flatten(value as Record<string, unknown>, path, out)
    }
  }
  return out
}

describe('i18n dictionaries', () => {
  it.each([
    ['es', es],
    ['fr', fr],
    ['pt-BR', ptBR],
  ] as const)('exposes every English leaf key in %s', (locale, dictionary) => {
    const enLeaves = flatten(en as unknown as Record<string, unknown>)
    const localeLeaves = flatten(dictionary as unknown as Record<string, unknown>)

    for (const key of Object.keys(enLeaves)) {
      expect(localeLeaves, `missing key in ${locale}: ${key}`).toHaveProperty(key)
      expect(
        interpolationVariables(localeLeaves[key]!),
        `interpolation mismatch in ${locale}: ${key}`,
      ).toEqual(interpolationVariables(enLeaves[key]!))
    }
    expect(Object.keys(localeLeaves).sort()).toEqual(Object.keys(enLeaves).sort())
    expect(Object.values(localeLeaves).every((value) => value !== '')).toBe(true)
  })

  it('can load every shared supported catalog', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      await loadLocaleResource(locale)
      expect(i18n.hasResourceBundle(locale, 'translation')).toBe(true)
    }
  })

  it('translates leaf keys through the loose accessor', () => {
    expect(translate('common.appName')).toBe('Orbit')
    expect(i18n.t('common.appName')).toBe('Orbit')
  })

  it('switches language at runtime', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.t('common.appName')).toBe('Orbit')
    expect(translate('nav.features')).toBe(fr.nav.features)
    await i18n.changeLanguage('en')
  })
})

describe('detectLocale / persistLocale', () => {
  it('prefers the persisted locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'pt-br')
    expect(detectLocale()).toBe('pt-BR')
    localStorage.removeItem(LOCALE_STORAGE_KEY)
  })

  it('falls back to the browser language', () => {
    const languagesSpy = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-CR'])
    expect(detectLocale()).toBe('es')
    languagesSpy.mockReturnValue(['fr-CA'])
    expect(detectLocale()).toBe('fr')
    languagesSpy.mockReturnValue(['pt-PT'])
    expect(detectLocale()).toBe('pt-BR')
    languagesSpy.mockReturnValue(['de-DE'])
    expect(detectLocale()).toBe('en')
    languagesSpy.mockRestore()
  })

  it('persists the chosen locale', () => {
    persistLocale('es')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
  })

  it('falls back safely when browser storage cannot be read', () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError')
    })
    const languagesSpy = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR'])

    expect(detectLocale()).toBe('fr')

    languagesSpy.mockRestore()
    storageSpy.mockRestore()
  })

  it('does not fail when browser storage cannot be written', () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError')
    })

    expect(() => persistLocale('es')).not.toThrow()

    storageSpy.mockRestore()
  })

  it('applies the locale to i18next, storage, and the document', async () => {
    await applyLocale('pt-BR')

    expect(i18n.resolvedLanguage).toBe('pt-BR')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')

    await applyLocale('en')
  })
})
