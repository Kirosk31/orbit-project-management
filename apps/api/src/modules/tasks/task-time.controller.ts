import type { Request, Response } from 'express'
import type {
  LogTimeEntryDto,
  PaginationQuery,
  StartTaskTimerDto,
  UpdateTimeEntryDto,
} from '@orbit/shared'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import { respond } from '../../shared/http/index.js'
import type { TaskTimeService } from './task-time.service.js'

export class TaskTimeController {
  constructor(
    private readonly service: TaskTimeService,
    private readonly auditService: AuditService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    respond(
      res,
      await this.service.list(
        req.params.id as string,
        res.locals.validatedQuery as PaginationQuery,
      ),
    )
  }

  log = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.service.log(
      req.params.id as string,
      req.user!.id,
      req.body as LogTimeEntryDto,
    )
    await this.recordAudit(req, res, 'task.time_logged', entry.id, {
      durationSeconds: entry.durationSeconds,
    })
    respond(res, entry, { status: 201 })
  }

  start = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.service.startTimer(
      req.params.id as string,
      req.user!.id,
      req.body as StartTaskTimerDto,
    )
    await this.recordAudit(req, res, 'task.timer_started', entry.id)
    respond(res, entry, { status: 201 })
  }

  stop = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.service.stopTimer(req.params.id as string, req.user!.id)
    await this.recordAudit(req, res, 'task.timer_stopped', entry.id, {
      durationSeconds: entry.durationSeconds,
    })
    respond(res, entry)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.service.update(
      req.params.id as string,
      req.params.timeEntryId as string,
      req.user!.id,
      req.body as UpdateTimeEntryDto,
    )
    await this.recordAudit(req, res, 'task.time_entry_updated', entry.id, {
      fields: Object.keys(req.body as object),
    })
    respond(res, entry)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const entryId = req.params.timeEntryId as string
    await this.service.remove(req.params.id as string, entryId, req.user!.id)
    await this.recordAudit(req, res, 'task.time_entry_deleted', entryId)
    respond(res, { deleted: true })
  }

  private recordAudit(
    req: Request,
    res: Response,
    action: string,
    resourceId: string,
    changes?: { durationSeconds?: number; fields?: string[] },
  ): Promise<void> {
    return this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action,
      resourceType: 'time_entry',
      resourceId,
      changes,
    })
  }
}
