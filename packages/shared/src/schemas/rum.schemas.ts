import { z } from 'zod'

/** Core Web Vitals the web app reports. */
export const RUM_METRIC_NAMES = ['LCP', 'INP', 'CLS'] as const

const STATIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/app',
  '/app/profile',
  '/app/notifications',
  '/app/organizations',
  '/app/projects',
])

const ROUTES_WITH_ID = new Set(['organizations', 'projects', 'boards', 'tasks'])

/**
 * Reduces a URL path to the screen it shows, so reports group by page and
 * never carry an id, a workspace slug or anything typed into the address bar.
 * The query string is dropped. Paths outside the app's routes become `/*`.
 */
export function toRumRoute(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] ?? ''
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  if (STATIC_ROUTES.has(trimmed)) return trimmed
  const segments = trimmed.split('/')
  if (segments.length === 4 && segments[1] === 'app' && ROUTES_WITH_ID.has(segments[2] ?? '')) {
    return `/app/${segments[2]}/:id`
  }
  return '/*'
}

export const rumMetricSchema = z.strictObject({
  name: z.enum(RUM_METRIC_NAMES),
  // LCP and INP are milliseconds; CLS is a unitless score well under 100.
  value: z.number().finite().min(0).max(600_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  navigationType: z
    .enum([
      'navigate',
      'reload',
      'back-forward',
      'back-forward-cache',
      'prerender',
      'restore',
      'soft-navigation',
    ])
    .optional(),
})

/**
 * One beacon from a page: the screen it loaded on and its latest metric
 * values. Strict, so a client cannot attach extra fields to the log line.
 */
export const rumReportSchema = z.strictObject({
  route: z.string().max(2_048).transform(toRumRoute),
  metrics: z.array(rumMetricSchema).min(1).max(RUM_METRIC_NAMES.length),
})

export type RumMetric = z.infer<typeof rumMetricSchema>
export type RumReport = z.input<typeof rumReportSchema>
