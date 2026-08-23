import { describe, expect, it } from 'vitest'
import {
  applyMentionCompletion,
  bodyMentionsFullName,
  extractMentionToken,
  highlightMentions,
} from './mention-utils'

describe('extractMentionToken', () => {
  it('returns the partial query after @', () => {
    expect(extractMentionToken('hi @jo', 6)).toBe('jo')
  })

  it('returns empty string for a bare @', () => {
    expect(extractMentionToken('hi @', 4)).toBe('')
  })

  it('returns null when the caret is not after the token', () => {
    expect(extractMentionToken('hi @jo', 3)).toBeNull()
  })

  it('returns null when the caret is in the middle of a token', () => {
    expect(extractMentionToken('hi @jo', 5)).toBeNull()
  })

  it('returns null when @ is mid-word', () => {
    expect(extractMentionToken('x@jo', 4)).toBeNull()
  })

  it('ignores trailing characters after the caret', () => {
    expect(extractMentionToken('hi @jo there', 6)).toBeNull()
  })

  it('closes the picker after the user types a space', () => {
    expect(extractMentionToken('hi @jo ', 7)).toBeNull()
  })

  it('does not reopen the picker right after a completion', () => {
    expect(extractMentionToken('hi @John Doe ', 13)).toBeNull()
  })
})

describe('applyMentionCompletion', () => {
  it('replaces the partial token and moves the caret', () => {
    const result = applyMentionCompletion('hi @jo', 6, 'John Doe')
    expect(result).toEqual({
      text: 'hi @John Doe ',
      caret: 13,
      inserted: '@John Doe ',
    })
  })

  it('keeps the rest of the text', () => {
    const result = applyMentionCompletion('hi @jo and bye', 6, 'John Doe')
    expect(result.text).toBe('hi @John Doe  and bye')
  })

  it('returns the input unchanged when no @ exists', () => {
    const result = applyMentionCompletion('no mention', 3, 'John Doe')
    expect(result).toEqual({ text: 'no mention', caret: 3, inserted: '' })
  })
})

describe('bodyMentionsFullName', () => {
  it('matches a mention at the start of the body', () => {
    expect(bodyMentionsFullName('@John Doe please review', 'John Doe')).toBe(true)
  })

  it('matches a mention after whitespace', () => {
    expect(bodyMentionsFullName('Hi @John Doe please review', 'John Doe')).toBe(true)
  })

  it('does not match a partial name', () => {
    expect(bodyMentionsFullName('Hi @John Does not', 'John Doe')).toBe(false)
  })

  it('does not match without the @', () => {
    expect(bodyMentionsFullName('John Doe please', 'John Doe')).toBe(false)
  })

  it('handles names with regex characters', () => {
    expect(bodyMentionsFullName('Hi @Jane A. Smith!', 'Jane A. Smith')).toBe(true)
  })
})

describe('highlightMentions', () => {
  it('bold-wraps mentions at word boundaries', () => {
    expect(highlightMentions('Hi @John Doe, please', ['John Doe'])).toBe('Hi **@John Doe**, please')
  })

  it('leaves the body unchanged without mentions', () => {
    expect(highlightMentions('Plain body', ['John Doe'])).toBe('Plain body')
  })

  it('highlights several names', () => {
    expect(highlightMentions('@A and @B', ['A', 'B'])).toBe('**@A** and **@B**')
  })
})
