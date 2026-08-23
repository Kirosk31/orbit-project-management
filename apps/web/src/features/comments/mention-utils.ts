const MENTION_TOKEN = /(?:^|\s)@([\p{L}\p{N}_-]*)$/u

export interface MentionCompletion {
  text: string
  caret: number
  inserted: string
}

/**
 * Returns the partial query typed after an `@` when the caret sits directly
 * after it (e.g. "hi @jo|" → "jo"), or null when no mention is being typed.
 */
export function extractMentionToken(text: string, caret: number): string | null {
  const beforeCaret = text.slice(0, caret)
  const match = MENTION_TOKEN.exec(beforeCaret)
  if (!match) {
    return null
  }
  const afterCaret = text.slice(caret)
  if (afterCaret.length > 0) {
    return null
  }
  const token = match[1] ?? ''
  const bareAt = token === '' && beforeCaret[beforeCaret.length - 1] === '@'
  if (token === '' && !bareAt) {
    return null
  }
  return token
}

/** Replaces the partial `@token` with `@fullName ` and returns the new text and caret. */
export function applyMentionCompletion(
  text: string,
  caret: number,
  fullName: string,
): MentionCompletion {
  const beforeCaret = text.slice(0, caret)
  const start = beforeCaret.lastIndexOf('@', caret - 1)
  if (start === -1) {
    return { text, caret, inserted: '' }
  }
  const inserted = `@${fullName} `
  const next = `${text.slice(0, start)}${inserted}${text.slice(caret)}`
  return { text: next, caret: start + inserted.length, inserted }
}

/** Whether `@fullName` occurs in the body (mention highlight + submit-time detection). */
export function bodyMentionsFullName(body: string, fullName: string): boolean {
  if (fullName.length === 0) {
    return false
  }
  const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\s)@${escaped}(?=\\s|$|[,.;:!?])`, 'u').test(body)
}

/** Bold-wraps `@fullName` occurrences so a markdown renderer highlights them. */
export function highlightMentions(body: string, fullNames: string[]): string {
  let result = body
  for (const name of fullNames) {
    if (name.length === 0) {
      continue
    }
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(
      new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[,.;:!?])`, 'gu'),
      `$1**@${name}**`,
    )
  }
  return result
}
