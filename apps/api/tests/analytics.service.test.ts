import { describe, expect, it, vi } from 'vitest'
import type { AnalyticsRepository } from '../src/modules/analytics/analytics.repository.js'
import {
  ANALYTICS_CACHE_SECONDS,
  AnalyticsService,
} from '../src/modules/analytics/analytics.service.js'
import type { CacheService } from '../src/shared/cache/CacheService.js'

function fakeRepository(): AnalyticsRepository {
  return {
    getOrganizationSnapshot: vi.fn(async () => ({
      summary: {
        totalTasks: 4n,
        openTasks: 3n,
        completedTasks: 1n,
        createdInPeriod: 2n,
        completedInPeriod: 1n,
        overdueTasks: 0n,
        trackedSeconds: 60n,
      },
      projects: [],
      workload: [],
      trend: [],
    })),
  }
}

function memoryCache(): CacheService & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>()
  return {
    store,
    get: vi.fn(async (key: string) => (store.get(key) ?? null) as never),
    set: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
    del: vi.fn(async () => undefined),
    delByPattern: vi.fn(async () => undefined),
    flush: vi.fn(async () => undefined),
    ping: vi.fn(async () => true),
  }
}

describe('AnalyticsService caching', () => {
  it('computes once per organization and period, then serves the cached copy', async () => {
    const repository = fakeRepository()
    const cache = memoryCache()
    const service = new AnalyticsService(repository, cache)

    const first = await service.organizationAnalytics('org-1', { days: 30 })
    const second = await service.organizationAnalytics('org-1', { days: 30 })

    expect(second).toEqual(first)
    expect(repository.getOrganizationSnapshot).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalledWith(
      'analytics:org:org-1:days:30',
      first,
      ANALYTICS_CACHE_SECONDS,
    )
  })

  it('never shares a snapshot across organizations or periods', async () => {
    const repository = fakeRepository()
    const service = new AnalyticsService(repository, memoryCache())

    await service.organizationAnalytics('org-1', { days: 30 })
    await service.organizationAnalytics('org-2', { days: 30 })
    await service.organizationAnalytics('org-1', { days: 7 })

    expect(repository.getOrganizationSnapshot).toHaveBeenCalledTimes(3)
  })

  it('falls back to the database when Redis is down', async () => {
    const repository = fakeRepository()
    const cache = memoryCache()
    cache.get = vi.fn(async () => {
      throw new Error('redis down')
    })
    cache.set = vi.fn(async () => {
      throw new Error('redis down')
    })
    const service = new AnalyticsService(repository, cache)

    const result = await service.organizationAnalytics('org-1', { days: 30 })
    expect(result.summary.totalTasks).toBe(4)
  })
})
