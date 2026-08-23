import type { Request, Response } from 'express'
import type {
  CreateBoardDto,
  CreateColumnDto,
  MoveColumnDto,
  UpdateBoardDto,
  UpdateColumnDto,
} from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import type { BoardsService } from './boards.service.js'

export class BoardsController {
  constructor(
    private readonly service: BoardsService,
    private readonly auditService: AuditService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const project = res.locals.project as { id: string }
    const boards = await this.service.listBoards(project.id, req.query.archived === 'true')
    respond(res, boards)
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const project = res.locals.project as { id: string; orgId: string }
    const board = await this.service.createBoard(
      project.id,
      project.orgId,
      req.user!.id,
      req.body as CreateBoardDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: project.orgId,
      action: 'board.created',
      resourceType: 'board',
      resourceId: board.id,
    })
    respond(res, board, { status: 201 })
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const board = await this.service.getBoard(req.params.id as string)
    respond(res, board)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const board = await this.service.updateBoard(
      req.params.id as string,
      orgId,
      req.user!.id,
      req.body as UpdateBoardDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'board.updated',
      resourceType: 'board',
      resourceId: board.id,
      changes: { fields: Object.keys(req.body as object) },
    })
    respond(res, board)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    await this.service.deleteBoard(req.params.id as string, orgId, req.user!.id)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'board.deleted',
      resourceType: 'board',
      resourceId: req.params.id as string,
    })
    respond(res, { deleted: true })
  }

  archive = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const board = await this.service.setArchived(req.params.id as string, orgId, req.user!.id, true)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'board.archived',
      resourceType: 'board',
      resourceId: board.id,
    })
    respond(res, board)
  }

  unarchive = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const board = await this.service.setArchived(
      req.params.id as string,
      orgId,
      req.user!.id,
      false,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'board.restored',
      resourceType: 'board',
      resourceId: board.id,
    })
    respond(res, board)
  }

  listColumns = async (req: Request, res: Response): Promise<void> => {
    const columns = await this.service.listColumns(req.params.id as string)
    respond(res, columns)
  }

  createColumn = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const column = await this.service.createColumn(
      req.params.id as string,
      orgId,
      req.user!.id,
      req.body as CreateColumnDto,
    )
    respond(res, column, { status: 201 })
  }

  updateColumn = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const column = await this.service.updateColumn(
      req.params.columnId as string,
      orgId,
      req.user!.id,
      req.body as UpdateColumnDto,
    )
    respond(res, column)
  }

  deleteColumn = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    await this.service.deleteColumn(req.params.columnId as string, orgId, req.user!.id)
    respond(res, { deleted: true })
  }

  moveColumn = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    await this.service.moveColumn(
      req.params.columnId as string,
      orgId,
      req.user!.id,
      req.body as MoveColumnDto,
    )
    respond(res, { moved: true })
  }
}
