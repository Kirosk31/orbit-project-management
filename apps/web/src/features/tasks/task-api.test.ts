import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  apiBlobRequest: vi.fn(),
}))

import { listAllBoardTasksRequest } from './task-api'

function page(from: number, count: number, total: number) {
  return { rows: Array.from({ length: count }, (_, i) => ({ id: `t${from + i}` })), total }
}

beforeEach(() => get.mockReset())

describe('listAllBoardTasksRequest', () => {
  it('returns a single page when the board fits in one', async () => {
    get.mockResolvedValueOnce(page(0, 12, 12))
    const result = await listAllBoardTasksRequest('b1')
    expect(result.rows).toHaveLength(12)
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]?.[0]).toBe('/boards/b1/tasks?page=1&pageSize=100')
  })

  it('loads every remaining page so large boards are never truncated', async () => {
    get.mockImplementation(async (url: string) => {
      const pageNumber = Number(new URL(url, 'http://x').searchParams.get('page'))
      return pageNumber === 3 ? page(200, 50, 250) : page((pageNumber - 1) * 100, 100, 250)
    })
    const result = await listAllBoardTasksRequest('b1', { search: 'qr' })
    expect(get).toHaveBeenCalledTimes(3)
    expect(result.rows).toHaveLength(250)
    expect(result.rows.at(-1)).toEqual({ id: 't249' })
    expect(get.mock.calls.every(([url]) => String(url).includes('search=qr'))).toBe(true)
  })
})
