import type { Request, Response } from 'express'
import type { CreateCommentDto, ToggleReactionDto, UpdateCommentDto } from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import type { CommentsService } from './comments.service.js'

export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.validatedQuery as { page: number; pageSize: number }
    const result = await this.service.listComments(req.params.id as string, req.user!.id, query)
    respond(res, result)
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const comment = await this.service.createComment(
      req.params.id as string,
      req.user!.id,
      req.body as CreateCommentDto,
    )
    respond(res, comment, { status: 201 })
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const comment = await this.service.updateComment(
      req.params.id as string,
      req.user!.id,
      req.body as UpdateCommentDto,
    )
    respond(res, comment)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const membership = res.locals.orgMembership as { permissions: Set<string> } | undefined
    const isModerator = membership?.permissions.has('task.comment.moderate') ?? false
    await this.service.deleteComment(req.params.id as string, req.user!.id, isModerator)
    respond(res, { deleted: true })
  }

  toggleReaction = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.toggleReaction(
      req.params.id as string,
      req.user!.id,
      req.body as ToggleReactionDto,
    )
    respond(res, result)
  }
}
