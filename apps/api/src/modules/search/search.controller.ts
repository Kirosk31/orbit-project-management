import type { Request, Response } from 'express'
import type { GlobalSearchQuery } from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import type { SearchService } from './search.service.js'

export class SearchController {
  constructor(private readonly service: SearchService) {}

  search = async (req: Request, res: Response): Promise<void> => {
    respond(
      res,
      await this.service.search(req.user!.id, res.locals.validatedQuery as GlobalSearchQuery),
    )
  }
}
