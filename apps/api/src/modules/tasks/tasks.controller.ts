import type { Request, Response } from 'express'
import type {
  CreateLabelDto,
  CreateSubtaskDto,
  CreateTaskDto,
  MoveTaskDto,
  TaskQuery,
  UpdateLabelDto,
  UpdateTaskDto,
} from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import type { TasksService } from './tasks.service.js'

export class TasksController {
  constructor(
    private readonly service: TasksService,
    private readonly auditService: AuditService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const project = res.locals.project as { id: string }
    const query = res.locals.validatedQuery as TaskQuery
    const result = await this.service.listTasks(project.id, query)
    respond(res, result)
  }

  listBoardTasks = async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.validatedQuery as TaskQuery
    const result = await this.service.listBoardTasks(req.params.id as string, query)
    respond(res, result)
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const project = res.locals.project as { id: string; orgId: string }
    const task = await this.service.createTask(
      project.id,
      project.orgId,
      req.user!.id,
      req.body as CreateTaskDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: project.orgId,
      action: 'task.created',
      resourceType: 'task',
      resourceId: task.id,
    })
    respond(res, task, { status: 201 })
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.getTask(req.params.id as string)
    respond(res, task)
  }

  listSubtasks = async (req: Request, res: Response): Promise<void> => {
    const subtasks = await this.service.listSubtasks(req.params.id as string)
    respond(res, subtasks)
  }

  createSubtask = async (req: Request, res: Response): Promise<void> => {
    const subtask = await this.service.createSubtask(
      req.params.id as string,
      req.user!.id,
      req.body as CreateSubtaskDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action: 'task.subtask_created',
      resourceType: 'task',
      resourceId: subtask.id,
      changes: { parentTaskId: req.params.id as string },
    })
    respond(res, subtask, { status: 201 })
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    const task = await this.service.updateTask(
      req.params.id as string,
      orgId,
      req.user!.id,
      req.body as UpdateTaskDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'task.updated',
      resourceType: 'task',
      resourceId: task.id,
      changes: { fields: Object.keys(req.body as object) },
    })
    respond(res, task)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteTask(req.params.id as string, req.user!.id)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action: 'task.deleted',
      resourceType: 'task',
      resourceId: req.params.id as string,
    })
    respond(res, { deleted: true })
  }

  archive = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.setArchived(req.params.id as string, req.user!.id, true)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action: 'task.archived',
      resourceType: 'task',
      resourceId: task.id,
    })
    respond(res, task)
  }

  unarchive = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.setArchived(req.params.id as string, req.user!.id, false)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action: 'task.restored',
      resourceType: 'task',
      resourceId: task.id,
    })
    respond(res, task)
  }

  move = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.project as { orgId: string }).orgId
    await this.service.moveTask(
      req.params.id as string,
      orgId,
      req.user!.id,
      req.body as MoveTaskDto,
    )
    respond(res, { moved: true })
  }

  addAssignee = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.addAssignee(
      req.params.id as string,
      req.params.userId as string,
      req.user!.id,
    )
    respond(res, task)
  }

  removeAssignee = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.removeAssignee(
      req.params.id as string,
      req.params.userId as string,
      req.user!.id,
    )
    respond(res, task)
  }

  addLabel = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.addLabel(
      req.params.id as string,
      req.params.labelId as string,
      req.user!.id,
    )
    respond(res, task)
  }

  removeLabel = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.removeLabel(
      req.params.id as string,
      req.params.labelId as string,
      req.user!.id,
    )
    respond(res, task)
  }

  activity = async (req: Request, res: Response): Promise<void> => {
    const rows = await this.service.listTaskActivity(req.params.id as string)
    respond(res, rows)
  }

  listLabels = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string }
    const labels = await this.service.listLabels(org.id)
    respond(res, labels)
  }

  createLabel = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string }
    const label = await this.service.createLabel(org.id, req.body as CreateLabelDto)
    respond(res, label, { status: 201 })
  }

  updateLabel = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string }
    const label = await this.service.updateLabel(
      req.params.id as string,
      org.id,
      req.body as UpdateLabelDto,
    )
    respond(res, label)
  }

  deleteLabel = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string }
    await this.service.deleteLabel(req.params.id as string, org.id)
    respond(res, { deleted: true })
  }
}
