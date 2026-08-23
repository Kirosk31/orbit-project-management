import type { Request, Response } from 'express'
import type { OrganizationAnalyticsQuery } from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import type { AnalyticsService } from './analytics.service.js'

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  organization = async (_req: Request, res: Response): Promise<void> => {
    respond(
      res,
      await this.service.organizationAnalytics(
        res.locals.org.id as string,
        res.locals.validatedQuery as OrganizationAnalyticsQuery,
      ),
    )
  }
}
