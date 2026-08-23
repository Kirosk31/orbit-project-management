import type { PaginationMeta } from '@orbit/shared'
import type { Response } from 'express'

export function respond<T>(
  res: Response,
  data: T,
  options?: { status?: number; meta?: PaginationMeta },
): void {
  res.status(options?.status ?? 200).json({
    data,
    ...(options?.meta ? { meta: options.meta } : {}),
    requestId: res.req.requestId,
  })
}
