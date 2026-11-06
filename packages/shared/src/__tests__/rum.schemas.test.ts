import { describe, expect, it } from 'vitest'
import { rumReportSchema, toRumRoute } from '../schemas/rum.schemas.js'

describe('toRumRoute', () => {
  it('keeps known screens and replaces ids and slugs', () => {
    expect(toRumRoute('/')).toBe('/')
    expect(toRumRoute('/login')).toBe('/login')
    expect(toRumRoute('/app/projects/')).toBe('/app/projects')
    expect(toRumRoute('/app/boards/6f1c2a7e-0b8d-4c3e-9a51-2f7d8e9c1b04')).toBe('/app/boards/:id')
    expect(toRumRoute('/app/organizations/acme-legal')).toBe('/app/organizations/:id')
  })

  it('drops query strings, which can hold reset and verification tokens', () => {
    expect(toRumRoute('/reset-password?token=secret')).toBe('/reset-password')
  })

  it('collapses anything outside the app routes', () => {
    expect(toRumRoute('/someone@example.com')).toBe('/*')
    expect(toRumRoute('/app/tasks/1/extra')).toBe('/*')
    expect(toRumRoute('')).toBe('/*')
  })
})

describe('rumReportSchema', () => {
  const valid = {
    route: '/app/tasks/6f1c2a7e-0b8d-4c3e-9a51-2f7d8e9c1b04',
    metrics: [
      { name: 'LCP', value: 1820.5, rating: 'good', navigationType: 'navigate' },
      { name: 'CLS', value: 0.02, rating: 'good' },
    ],
  }

  it('accepts a report and normalizes its route', () => {
    const parsed = rumReportSchema.parse(valid)
    expect(parsed.route).toBe('/app/tasks/:id')
    expect(parsed.metrics).toHaveLength(2)
  })

  it('rejects extra fields, unknown metrics and impossible values', () => {
    expect(rumReportSchema.safeParse({ ...valid, userAgent: 'x' }).success).toBe(false)
    expect(
      rumReportSchema.safeParse({
        ...valid,
        metrics: [{ name: 'LCP', value: 1, rating: 'good', id: 'v4-1' }],
      }).success,
    ).toBe(false)
    expect(
      rumReportSchema.safeParse({ ...valid, metrics: [{ name: 'FID', value: 1, rating: 'good' }] })
        .success,
    ).toBe(false)
    expect(
      rumReportSchema.safeParse({ ...valid, metrics: [{ name: 'LCP', value: -1, rating: 'good' }] })
        .success,
    ).toBe(false)
    expect(rumReportSchema.safeParse({ ...valid, metrics: [] }).success).toBe(false)
  })
})
