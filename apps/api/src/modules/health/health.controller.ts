import type { Response } from 'express'
import { respond } from '../../shared/http/index.js'
import type { HealthService } from './health.service.js'

export class HealthController {
  constructor(private readonly service: HealthService) {}

  liveness = (_: unknown, res: Response): void => {
    respond(res, this.service.liveness())
  }

  readiness = async (_: unknown, res: Response): Promise<void> => {
    const report = await this.service.readiness()
    respond(res, report, { status: report.status === 'ok' ? 200 : 503 })
  }
}
