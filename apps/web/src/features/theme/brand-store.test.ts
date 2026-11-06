import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyBrandHue,
  BRAND_STORAGE_KEY,
  DEFAULT_BRAND_HUE,
  useBrandStore,
} from '@/features/theme/brand-store'

beforeEach(() => {
  useBrandStore.setState({ hue: DEFAULT_BRAND_HUE })
  document.documentElement.removeAttribute('style')
})

describe('useBrandStore', () => {
  it('persists a chosen hue and resets to the default', () => {
    useBrandStore.getState().setHue(150)
    expect(JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY) ?? '{}').state.hue).toBe(150)
    useBrandStore.getState().reset()
    expect(useBrandStore.getState().hue).toBe(DEFAULT_BRAND_HUE)
  })
})

describe('applyBrandHue', () => {
  it('overrides --brand-hue and clears the override for the default skin', () => {
    applyBrandHue(150)
    expect(document.documentElement.style.getPropertyValue('--brand-hue')).toBe('150')
    applyBrandHue(DEFAULT_BRAND_HUE)
    expect(document.documentElement.style.getPropertyValue('--brand-hue')).toBe('')
  })
})
