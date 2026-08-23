import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import type {
  CreateChecklistDto,
  CreateChecklistItemDto,
  MoveChecklistItemDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
} from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import type { TaskResourcesService } from './task-resources.service.js'

export class TaskResourcesController {
  constructor(
    private readonly service: TaskResourcesService,
    private readonly auditService: AuditService,
  ) {}

  listChecklists = async (req: Request, res: Response): Promise<void> => {
    respond(res, await this.service.listChecklists(req.params.id as string))
  }

  createChecklist = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.createChecklist(
      req.params.id as string,
      req.user!.id,
      req.body as CreateChecklistDto,
    )
    await this.recordAudit(req, res, 'task.checklist_created', 'checklist', checklist.id)
    respond(res, checklist, { status: 201 })
  }

  updateChecklist = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.updateChecklist(
      req.params.id as string,
      req.params.checklistId as string,
      req.user!.id,
      req.body as UpdateChecklistDto,
    )
    await this.recordAudit(req, res, 'task.checklist_updated', 'checklist', checklist.id, {
      fields: Object.keys(req.body as object),
    })
    respond(res, checklist)
  }

  deleteChecklist = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteChecklist(
      req.params.id as string,
      req.params.checklistId as string,
      req.user!.id,
    )
    await this.recordAudit(
      req,
      res,
      'task.checklist_deleted',
      'checklist',
      req.params.checklistId as string,
    )
    respond(res, { deleted: true })
  }

  createChecklistItem = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.createChecklistItem(
      req.params.id as string,
      req.params.checklistId as string,
      req.user!.id,
      req.body as CreateChecklistItemDto,
    )
    await this.recordAudit(req, res, 'task.checklist_item_created', 'checklist', checklist.id)
    respond(res, checklist, { status: 201 })
  }

  updateChecklistItem = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.updateChecklistItem(
      req.params.id as string,
      req.params.checklistId as string,
      req.params.itemId as string,
      req.user!.id,
      req.body as UpdateChecklistItemDto,
    )
    await this.recordAudit(
      req,
      res,
      'task.checklist_item_updated',
      'checklist_item',
      req.params.itemId as string,
      { fields: Object.keys(req.body as object) },
    )
    respond(res, checklist)
  }

  deleteChecklistItem = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.deleteChecklistItem(
      req.params.id as string,
      req.params.checklistId as string,
      req.params.itemId as string,
      req.user!.id,
    )
    await this.recordAudit(
      req,
      res,
      'task.checklist_item_deleted',
      'checklist_item',
      req.params.itemId as string,
    )
    respond(res, checklist)
  }

  moveChecklistItem = async (req: Request, res: Response): Promise<void> => {
    const checklist = await this.service.moveChecklistItem(
      req.params.id as string,
      req.params.checklistId as string,
      req.params.itemId as string,
      req.user!.id,
      req.body as MoveChecklistItemDto,
    )
    await this.recordAudit(
      req,
      res,
      'task.checklist_item_moved',
      'checklist_item',
      req.params.itemId as string,
      { toPosition: (req.body as MoveChecklistItemDto).toPosition },
    )
    respond(res, checklist)
  }

  private recordAudit(
    req: Request,
    res: Response,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: Prisma.InputJsonValue,
  ): Promise<void> {
    return this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action,
      resourceType,
      resourceId,
      changes,
    })
  }
}
