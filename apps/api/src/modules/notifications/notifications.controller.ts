import type { Request, Response } from 'express'
import { respond } from '../../shared/http/index.js'
import type { NotificationsService } from './notifications.service.js'

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.validatedQuery as {
      page: number
      pageSize: number
      unreadOnly: boolean
    }
    const result = await this.service.list(req.user!.id, query)
    respond(res, result)
  }

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const count = await this.service.unreadCount(req.user!.id)
    respond(res, { count })
  }

  markRead = async (req: Request, res: Response): Promise<void> => {
    const notification = await this.service.markRead(req.params.id as string, req.user!.id)
    respond(res, notification)
  }

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.markAllRead(req.user!.id)
    respond(res, result)
  }
}
