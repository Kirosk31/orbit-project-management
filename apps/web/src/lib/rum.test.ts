import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Callback = (metric: Record<string, unknown>) => void
const callbacks: Record<string, Callback> = {}

vi.mock('web-vitals', () => ({
  onLCP: (callback: Callback) => (callbacks.LCP = callback),
  onINP: (callback: Callback) => (callbacks.INP = callback),
  onCLS: (callback: Callback) => (callbacks.CLS = callback),
}))

import { startRum } from '@/lib/rum'

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

function mockBeacon() {
  return vi.fn((_url: string, _data: Blob) => true)
}

async function readBeacon(beacon: ReturnType<typeof mockBeacon>, call = 0): Promise<unknown> {
  const blob = beacon.mock.calls[call]?.[1] as Blob
  expect(blob.type).toBe('application/json')
  // jsdom's Blob has no text(); FileReader is the portable way to read it.
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsText(blob)
  })
  return JSON.parse(text)
}

describe('startRum', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/app/tasks/6f1c2a7e-0b8d-4c3e-9a51-2f7d8e9c1b04?tab=x')
  })

  afterEach(() => {
    setVisibility('visible')
  })

  it('beacons the latest LCP, INP and CLS with an anonymized route when the page hides', async () => {
    const beacon = mockBeacon()
    startRum({ endpoint: '/api/v1/rum', sendBeacon: beacon })

    callbacks.LCP?.({
      name: 'LCP',
      value: 1500,
      rating: 'good',
      navigationType: 'navigate',
      id: 'v6-1',
      entries: [],
    })
    callbacks.CLS?.({
      name: 'CLS',
      value: 0.3,
      rating: 'poor',
      navigationType: 'navigate',
      id: 'v6-2',
      entries: [],
    })
    callbacks.CLS?.({
      name: 'CLS',
      value: 0.05,
      rating: 'good',
      navigationType: 'navigate',
      id: 'v6-2',
      entries: [],
    })
    expect(beacon).not.toHaveBeenCalled()

    setVisibility('hidden')

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0]?.[0]).toBe('/api/v1/rum')
    expect(await readBeacon(beacon)).toEqual({
      route: '/app/tasks/:id',
      metrics: [
        { name: 'LCP', value: 1500, rating: 'good', navigationType: 'navigate' },
        { name: 'CLS', value: 0.05, rating: 'good', navigationType: 'navigate' },
      ],
    })
  })

  it('sends nothing when there is nothing new', () => {
    const beacon = mockBeacon()
    startRum({ sendBeacon: beacon })

    setVisibility('hidden')
    window.dispatchEvent(new Event('pagehide'))

    expect(beacon).not.toHaveBeenCalled()
  })
})
