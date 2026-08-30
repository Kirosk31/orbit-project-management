import type { ChangePlanInput } from '@orbit/shared'
import type { Request, Response } from 'express'
import { respond } from '../../shared/http/index.js'
import type { BillingService } from './billing.service.js'

export class BillingController {
  constructor(private readonly service: BillingService) {}

  listPlans = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.service.listPlans()
    respond(res, { rows: plans })
  }

  getSubscription = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.service.getSubscription(res.locals.org.id)
    respond(res, subscription)
  }

  createCheckout = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.createCheckoutSession({
      orgId: res.locals.org.id,
      actorUserId: req.user!.id,
      planKey: (req.body as ChangePlanInput).planKey,
    })
    respond(res, result)
  }

  createPortal = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.createPortalSession({
      orgId: res.locals.org.id,
      actorUserId: req.user!.id,
    })
    respond(res, result)
  }
}
