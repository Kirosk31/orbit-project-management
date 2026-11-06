import { toRumRoute, type RumMetric, type RumReport } from '@orbit/shared'
import { onCLS, onINP, onLCP, type CLSMetric, type INPMetric, type LCPMetric } from 'web-vitals'

import { env } from './env'

type VitalsMetric = CLSMetric | INPMetric | LCPMetric

interface RumOptions {
  endpoint?: string
  /** Injectable for tests; defaults to the browser's own. */
  sendBeacon?: (url: string, data: Blob) => boolean
}

/**
 * Collects Core Web Vitals (LCP, INP, CLS) from real visits and beacons them
 * to the API when the page is hidden, which is the last moment the browser
 * guarantees to run code. Only the metric values and the screen the visit
 * landed on are sent; no ids, user, or URL query.
 */
export function startRum(options: RumOptions = {}): void {
  const send = options.sendBeacon ?? navigator.sendBeacon?.bind(navigator)
  if (!send) return

  const endpoint = options.endpoint ?? `${env.VITE_API_URL.replace(/\/$/, '')}/rum`
  // LCP, INP and CLS describe the page load, so they belong to its first screen.
  const route = toRumRoute(window.location.pathname)
  const pending = new Map<RumMetric['name'], RumMetric>()

  const record = (metric: VitalsMetric): void => {
    // A later report of the same metric replaces the earlier one.
    pending.set(metric.name, {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    })
  }

  const flush = (): void => {
    if (pending.size === 0) return
    const report: RumReport = { route, metrics: [...pending.values()] }
    pending.clear()
    send(endpoint, new Blob([JSON.stringify(report)], { type: 'application/json' }))
  }

  onLCP(record)
  onINP(record)
  onCLS(record)

  // web-vitals reports its final INP and CLS from capture-phase listeners on
  // window, which run before this document listener, so they are included.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  // Safari does not always fire visibilitychange when the tab closes.
  window.addEventListener('pagehide', flush)
}
