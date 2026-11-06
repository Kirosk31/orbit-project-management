import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CompletionMark } from './completion-mark'

const glazing = (container: HTMLElement): boolean =>
  container.querySelector('path.animate-glaze') !== null

describe('CompletionMark', () => {
  it('glazes when a task finishes in front of the user', () => {
    const { container, rerender } = render(<CompletionMark completed={false} />)
    expect(glazing(container)).toBe(false)
    rerender(<CompletionMark completed />)
    expect(glazing(container)).toBe(true)
  })

  it('stays still for a task that finished long ago', () => {
    const longAgo = new Date(Date.now() - 86_400_000).toISOString()
    const { container } = render(<CompletionMark completed completedAt={longAgo} />)
    expect(glazing(container)).toBe(false)
  })

  it('glazes a card that mounts right after the task finished', () => {
    const now = new Date().toISOString()
    const { container } = render(<CompletionMark completed completedAt={now} />)
    expect(glazing(container)).toBe(true)
  })

  it('clears the glaze when the task is reopened', () => {
    const { container, rerender } = render(<CompletionMark completed={false} />)
    rerender(<CompletionMark completed />)
    rerender(<CompletionMark completed={false} />)
    expect(glazing(container)).toBe(false)
  })
})
