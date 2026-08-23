import { useEffect, useRef } from 'react'

type ModifierMap = {
  ctrl: boolean
  meta: boolean
  shift: boolean
  alt: boolean
}

function matchesCombo(combo: string, event: KeyboardEvent): boolean {
  const parts = combo
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (parts.length === 0) return false

  const key = parts[parts.length - 1] as string
  const modifiers = new Set(parts.slice(0, -1))

  const pressed: ModifierMap = {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  }

  for (const modifier of ['ctrl', 'meta', 'shift', 'alt'] as const) {
    const required = modifiers.has(modifier)
    const isMac = navigator.platform.toLowerCase().includes('mac')
    if (modifier === 'meta' && isMac && (modifiers.has('meta') || modifiers.has('mod'))) {
      if (required !== event.metaKey) return false
      continue
    }
    if (required !== pressed[modifier]) return false
  }

  if (modifiers.has('mod')) {
    const modPressed = navigator.platform.toLowerCase().includes('mac')
      ? event.metaKey
      : event.ctrlKey
    if (!modPressed) return false
  }

  const eventKey = event.key.toLowerCase()
  return eventKey === key
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Registers global keyboard shortcuts. Combos look like "mod+k",
 * "shift+mod+l". "mod" resolves to Cmd on macOS and Ctrl elsewhere.
 * Shortcuts are ignored while typing in form fields.
 */
export function useHotkeys(
  combos: readonly string[],
  handler: (event: KeyboardEvent) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const listener = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return

      for (const combo of combos) {
        if (matchesCombo(combo, event)) {
          event.preventDefault()
          handlerRef.current(event)
          return
        }
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [combos, enabled])
}
