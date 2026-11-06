import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Request } from 'express'
import { pinoHttp, startTime } from 'pino-http'
import type { Logger } from './logger.js'

/** Requests slower than this are logged at warn, so they stand out in production logs. */
export const SLOW_REQUEST_MS = 500

export interface RequestLogInput {
  statusCode: number
  responseTimeMs: number
  failed: boolean
  /** Accepted Web Vitals beacons are logged by the RUM router instead. */
  isRumBeacon: boolean
}

/** The pino-http level for a finished request. */
export function requestLogLevel(input: RequestLogInput): 'silent' | 'info' | 'warn' {
  if (input.responseTimeMs > SLOW_REQUEST_MS) return 'warn'
  if (input.isRumBeacon && !input.failed && input.statusCode < 400) return 'silent'
  return 'info'
}

/** Per-request access log. `rumPath` is where Web Vitals beacons arrive. */
export function createHttpLogger(logger: Logger, rumPath: string) {
  const isRumBeacon = (req: IncomingMessage): boolean => {
    const path = ((req as Request).originalUrl ?? req.url ?? '').split('?', 1)[0]
    return req.method === 'POST' && path === rumPath
  }

  return pinoHttp({
    logger,
    genReqId: (req) => (req as Request).requestId ?? randomUUID(),
    // Slow requests log at warn. Accepted Web Vitals beacons are logged once, by
    // the RUM router, without the request's IP and headers; rejected ones still
    // show up here.
    customLogLevel: (req, res, error) =>
      requestLogLevel({
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - res[startTime],
        failed: Boolean(error),
        isRumBeacon: isRumBeacon(req),
      }),
  })
}
