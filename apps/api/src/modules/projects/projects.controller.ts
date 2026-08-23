import type { Request, Response } from 'express'
import type {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectQuery,
  UpdateProjectDto,
} from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import type { ProjectsService } from './projects.service.js'

export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string; slug: string }
    const projects = await this.service.listProjects(
      org.id,
      req.user!.id,
      res.locals.validatedQuery as ProjectQuery,
    )
    respond(res, projects)
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const org = res.locals.org as { id: string; slug: string }
    const project = await this.service.createProject(
      org.id,
      req.user!.id,
      req.body as CreateProjectDto,
      req.ip,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: org.id,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
    })
    respond(res, project, { status: 201 })
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const project = await this.service.getProject(req.params.id as string, req.user!.id)
    respond(res, project)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const project = await this.service.updateProject(
      req.params.id as string,
      req.user!.id,
      req.body as UpdateProjectDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.updated',
      resourceType: 'project',
      resourceId: project.id,
      changes: { fields: Object.keys(req.body as object) },
    })
    respond(res, project)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteProject(req.params.id as string, req.user!.id)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.deleted',
      resourceType: 'project',
      resourceId: req.params.id as string,
    })
    respond(res, { deleted: true })
  }

  archive = async (req: Request, res: Response): Promise<void> => {
    const project = await this.service.setArchived(req.params.id as string, req.user!.id, true)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.archived',
      resourceType: 'project',
      resourceId: project.id,
    })
    respond(res, project)
  }

  unarchive = async (req: Request, res: Response): Promise<void> => {
    const project = await this.service.setArchived(req.params.id as string, req.user!.id, false)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.restored',
      resourceType: 'project',
      resourceId: project.id,
    })
    respond(res, project)
  }

  favorite = async (req: Request, res: Response): Promise<void> => {
    await this.service.setFavorite(req.params.id as string, req.user!.id, true)
    respond(res, { id: req.params.id, isFavorite: true })
  }

  unfavorite = async (req: Request, res: Response): Promise<void> => {
    await this.service.setFavorite(req.params.id as string, req.user!.id, false)
    respond(res, { id: req.params.id, isFavorite: false })
  }

  listMembers = async (req: Request, res: Response): Promise<void> => {
    const members = await this.service.listMembers(req.params.id as string)
    respond(res, members)
  }

  addMember = async (req: Request, res: Response): Promise<void> => {
    const member = await this.service.addMember(
      req.params.id as string,
      req.user!.id,
      req.body as AddProjectMemberDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.member_added',
      resourceType: 'user',
      resourceId: member.userId,
      changes: { projectId: req.params.id as string },
    })
    respond(res, member, { status: 201 })
  }

  removeMember = async (req: Request, res: Response): Promise<void> => {
    await this.service.removeMember(
      req.params.id as string,
      req.user!.id,
      req.params.userId as string,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.org as { id: string }).id,
      action: 'project.member_removed',
      resourceType: 'user',
      resourceId: req.params.userId as string,
      changes: { projectId: req.params.id as string },
    })
    respond(res, { removed: true })
  }

  listActivity = async (req: Request, res: Response): Promise<void> => {
    const activity = await this.service.listActivity(req.params.id as string)
    respond(res, activity)
  }
}
