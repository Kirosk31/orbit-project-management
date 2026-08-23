import type { Request, Response } from 'express'
import type { CreateSavedFilterDto, UpdateSavedFilterDto } from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import type { TaskFiltersService } from './task-filters.service.js'

export class TaskFiltersController {
  constructor(private readonly service: TaskFiltersService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    respond(res, await this.service.list(req.params.id as string, req.user!.id))
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const filter = await this.service.create(
      req.params.id as string,
      (res.locals.project as { orgId: string }).orgId,
      req.user!.id,
      req.body as CreateSavedFilterDto,
    )
    respond(res, filter, { status: 201 })
  }

  update = async (req: Request, res: Response): Promise<void> => {
    respond(
      res,
      await this.service.update(
        req.params.id as string,
        req.user!.id,
        req.params.filterId as string,
        req.body as UpdateSavedFilterDto,
      ),
    )
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(req.params.id as string, req.user!.id, req.params.filterId as string)
    respond(res, { deleted: true })
  }
}
