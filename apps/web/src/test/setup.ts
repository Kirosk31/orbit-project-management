import '@/lib/i18n'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { beforeEach, afterEach, vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root: Element | null = null
  readonly rootMargin = ''
  readonly thresholds: readonly number[] = []

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
vi.stubGlobal('localStorage', window.localStorage)
vi.stubGlobal('sessionStorage', window.sessionStorage)

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
})
