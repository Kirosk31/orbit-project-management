import type { Request, Response } from 'express'
import type {
  AcceptInvitationDto,
  AddTeamMemberDto,
  CreateOrganizationDto,
  CreateTeamDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdateTeamDto,
} from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import type { OrganizationsService } from './organizations.service.js'

export class OrganizationsController {
  constructor(
    private readonly service: OrganizationsService,
    private readonly auditService: AuditService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const org = await this.service.createOrganization(
      req.user!.id,
      req.body as CreateOrganizationDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: org.id,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: org.id,
    })
    respond(res, org, { status: 201 })
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const orgs = await this.service.listOrganizations(req.user!.id)
    respond(res, orgs)
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const org = await this.service.getOrganization(orgId)
    respond(res, org)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const org = await this.service.updateOrganization(orgId, req.body as UpdateOrganizationDto)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: orgId,
      changes: { fields: Object.keys(req.body as object) },
    })
    respond(res, org)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    await this.service.deleteOrganization(orgId)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.deleted',
      resourceType: 'organization',
      resourceId: orgId,
    })
    respond(res, { deleted: true })
  }

  listMembers = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const members = await this.service.listMembers(orgId)
    respond(res, members)
  }

  listRoles = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const roles = await this.service.listRoles(orgId)
    respond(res, roles)
  }

  updateMemberRole = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const member = await this.service.updateMemberRole(
      orgId,
      req.params.userId as string,
      req.body as UpdateMemberRoleDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.member_role_updated',
      resourceType: 'user',
      resourceId: req.params.userId as string,
      changes: { fields: ['roleId'] },
    })
    respond(res, member)
  }

  removeMember = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    await this.service.removeMember(orgId, req.params.userId as string)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.member_removed',
      resourceType: 'user',
      resourceId: req.params.userId as string,
    })
    respond(res, { removed: true })
  }

  invite = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const invitation = await this.service.inviteMember(
      orgId,
      req.user!.id,
      req.body as InviteMemberDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.invitation_created',
      resourceType: 'invitation',
      resourceId: invitation.id,
      changes: { fields: ['email', 'roleId'] },
    })
    respond(res, invitation, { status: 201 })
  }

  listInvitations = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const invitations = await this.service.listInvitations(orgId)
    respond(res, invitations)
  }

  revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    await this.service.revokeInvitation(orgId, req.params.invitationId as string)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.invitation_revoked',
      resourceType: 'invitation',
      resourceId: req.params.invitationId as string,
    })
    respond(res, { revoked: true })
  }

  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    const org = await this.service.acceptInvitation(req.user!.id, req.body as AcceptInvitationDto)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: org.id,
      action: 'organization.invitation_accepted',
      resourceType: 'organization',
      resourceId: org.id,
    })
    respond(res, org)
  }

  listTeams = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const teams = await this.service.listTeams(orgId)
    respond(res, teams)
  }

  createTeam = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const team = await this.service.createTeam(orgId, req.body as CreateTeamDto)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.team_created',
      resourceType: 'team',
      resourceId: team.id,
    })
    respond(res, team, { status: 201 })
  }

  updateTeam = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const team = await this.service.updateTeam(
      orgId,
      req.params.teamId as string,
      req.body as UpdateTeamDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.team_updated',
      resourceType: 'team',
      resourceId: team.id,
      changes: { fields: Object.keys(req.body as object) },
    })
    respond(res, team)
  }

  deleteTeam = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    await this.service.deleteTeam(orgId, req.params.teamId as string)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.team_deleted',
      resourceType: 'team',
      resourceId: req.params.teamId as string,
    })
    respond(res, { deleted: true })
  }

  listTeamMembers = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const members = await this.service.listTeamMembers(orgId, req.params.teamId as string)
    respond(res, members)
  }

  addTeamMember = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    const member = await this.service.addTeamMember(
      orgId,
      req.params.teamId as string,
      req.body as AddTeamMemberDto,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.team_member_added',
      resourceType: 'team',
      resourceId: req.params.teamId as string,
    })
    respond(res, member, { status: 201 })
  }

  removeTeamMember = async (req: Request, res: Response): Promise<void> => {
    const orgId = (res.locals.org as { id: string }).id
    await this.service.removeTeamMember(
      orgId,
      req.params.teamId as string,
      req.params.userId as string,
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      orgId,
      action: 'organization.team_member_removed',
      resourceType: 'team',
      resourceId: req.params.teamId as string,
    })
    respond(res, { removed: true })
  }
}
