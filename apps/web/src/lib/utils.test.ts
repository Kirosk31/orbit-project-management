import { describe, expect, it } from 'vitest'

import {
  buildQueryString,
  cn,
  formatDate,
  getContrastTextColor,
  initialsOf,
  isNotNull,
} from '@/lib/utils'

describe('cn', () => {
  it('merges classes and resolves tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('returns an empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('initialsOf', () => {
  it('uses the first two name parts', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL')
  })

  it('handles a single name', () => {
    expect(initialsOf('ada')).toBe('A')
  })

  it('ignores surrounding whitespace and extra parts', () => {
    expect(initialsOf('  Grace Hopper Brewster  ')).toBe('GH')
  })

  it('returns an empty string for empty input', () => {
    expect(initialsOf('   ')).toBe('')
  })
})

describe('formatDate', () => {
  it('formats an ISO date using the requested locale', () => {
    expect(formatDate('2026-01-05T12:00:00.000Z', 'en-US')).toBe('Jan 5, 2026')
  })
})

describe('isNotNull', () => {
  it('narrows null and undefined away', () => {
    expect(isNotNull('value')).toBe(true)
    expect(isNotNull(null)).toBe(false)
    expect(isNotNull(undefined)).toBe(false)
  })
})

describe('buildQueryString', () => {
  it('serializes present values', () => {
    expect(buildQueryString({ page: 2, q: 'orbit', active: true })).toBe(
      '?page=2&q=orbit&active=true',
    )
  })

  it('omits undefined, null and empty strings', () => {
    expect(buildQueryString({ a: undefined, b: null, c: '', d: 'keep' })).toBe('?d=keep')
  })

  it('returns an empty string when nothing is present', () => {
    expect(buildQueryString({ a: null })).toBe('')
  })
})

describe('getContrastTextColor', () => {
  it('uses dark text on light colors and white text on dark colors', () => {
    expect(getContrastTextColor('#94a3b8')).toBe('#111827')
    expect(getContrastTextColor('#111827')).toBe('#ffffff')
  })

  it('falls back safely for an invalid color', () => {
    expect(getContrastTextColor('transparent')).toBe('#111827')
  })
})
