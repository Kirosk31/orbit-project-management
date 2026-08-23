import { createHash, randomBytes } from 'node:crypto'
import {
  type AcceptInvitationDto,
  type AddTeamMemberDto,
  type CreateOrganizationDto,
  type CreateTeamDto,
  type InvitationDto,
  type InviteMemberDto,
  type OrganizationDto,
  type OrganizationMemberDto,
  type OrgRoleDto,
  type TeamDto,
  type TeamMemberDto,
  type UpdateMemberRoleDto,
  type UpdateOrganizationDto,
  type UpdateTeamDto,
} from '@orbit/shared'
import { conflict, forbidden, notFound, badRequest } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/logger.js'
import type { MailService } from '../../shared/mail/mail.js'
import { createInvitationEmail } from '../../shared/mail/templates.js'
import type { OrganizationsRepository } from './organizations.repository.js'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'org'
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface OrganizationsServiceDependencies {
  repository: OrganizationsRepository
  logger: Logger
  mailService: MailService
  webAppUrl: string
}

export class OrganizationsService {
  constructor(private readonly deps: OrganizationsServiceDependencies) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto): Promise<OrganizationDto> {
    const ownerRole = await this.deps.repository.findSystemRoleByKey('OWNER')
    if (!ownerRole) {
      throw new Error('OWNER role is not seeded; run prisma db seed')
    }

    const slug = await this.uniqueSlug(slugify(dto.name))
    const org = await this.deps.repository.createOrgWithOwner(
      {
        name: dto.name,
        slug,
        description: dto.description === '' ? null : dto.description,
      },
      userId,
      ownerRole.id,
    )

    this.deps.logger.info({ orgId: org.id }, 'organization created')
    return this.toOrganizationDto(org, 'OWNER', 1)
  }

  async listOrganizations(userId: string): Promise<OrganizationDto[]> {
    const rows = await this.deps.repository.listOrgsForUser(userId)
    return rows.map((row) => this.toOrganizationDto(row, row.roleKey, row.memberCount))
  }

  async getOrganization(orgId: string): Promise<OrganizationDto> {
    const org = await this.deps.repository.findById(orgId)
    if (!org || org.deletedAt) {
      throw notFound('Organization not found')
    }
    const memberCount = await this.deps.repository.countMembers(orgId)
    return this.toOrganizationDto(org, null, memberCount)
  }

  async updateOrganization(orgId: string, dto: UpdateOrganizationDto): Promise<OrganizationDto> {
    const org = await this.deps.repository.updateOrg(orgId, {
      name: dto.name,
      description:
        dto.description === undefined ? undefined : dto.description === '' ? null : dto.description,
    })
    const memberCount = await this.deps.repository.countMembers(orgId)
    this.deps.logger.info({ orgId }, 'organization updated')
    return this.toOrganizationDto(org, null, memberCount)
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await this.deps.repository.softDeleteOrg(orgId)
    this.deps.logger.info({ orgId }, 'organization deleted')
  }

  async listMembers(orgId: string): Promise<OrganizationMemberDto[]> {
    const rows = await this.deps.repository.listMembers(orgId)
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.email,
      fullName: row.fullName,
      avatarKey: row.avatarKey,
      roleId: row.roleId,
      roleKey: row.roleKey,
      roleName: row.roleName,
      joinedAt: row.joinedAt.toISOString(),
    }))
  }

  async listRoles(orgId: string): Promise<OrgRoleDto[]> {
    const roles = await this.deps.repository.listRolesForOrg(orgId)
    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
    }))
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<OrganizationMemberDto> {
    const target = await this.deps.repository.findMember(orgId, targetUserId)
    if (!target) {
      throw notFound('Member not found')
    }
    if (target.roleKey === 'OWNER') {
      throw forbidden('The owner role cannot be changed')
    }

    const role = await this.deps.repository.findRoleById(dto.roleId)
    if (!role || (role.orgId !== null && role.orgId !== orgId)) {
      throw badRequest('The selected role is not available in this organization')
    }

    await this.deps.repository.updateMemberRole(target.id, dto.roleId)
    this.deps.logger.info({ orgId, userId: targetUserId }, 'member role updated')
    return this.toMemberDto({
      ...target,
      roleId: dto.roleId,
      roleKey: role.key,
      roleName: role.name,
    })
  }

  async removeMember(orgId: string, targetUserId: string): Promise<void> {
    const target = await this.deps.repository.findMember(orgId, targetUserId)
    if (!target) {
      throw notFound('Member not found')
    }
    if (target.roleKey === 'OWNER') {
      throw forbidden('The owner cannot be removed from the organization')
    }
    await this.deps.repository.removeMember(target.id)
    this.deps.logger.info({ orgId, userId: targetUserId }, 'member removed')
  }

  async inviteMember(
    orgId: string,
    inviterId: string,
    dto: InviteMemberDto,
  ): Promise<InvitationDto> {
    const email = dto.email.toLowerCase()

    const existingMember = await this.deps.repository.findMemberByEmail(orgId, email)
    if (existingMember) {
      throw conflict('This user is already a member of the organization')
    }

    const pending = await this.deps.repository.findInvitationByEmail(orgId, email)
    if (pending) {
      throw conflict('An invitation for this email is already pending')
    }

    const role = await this.deps.repository.findRoleById(dto.roleId)
    if (!role || (role.orgId !== null && role.orgId !== orgId)) {
      throw badRequest('The selected role is not available in this organization')
    }

    const org = await this.deps.repository.findById(orgId)
    if (!org || org.deletedAt) {
      throw notFound('Organization not found')
    }

    const token = randomBytes(32).toString('base64url')
    const invitation = await this.deps.repository.createInvitation({
      orgId,
      inviterId,
      email,
      roleId: dto.roleId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })

    try {
      await this.deps.mailService.sendMail({
        to: { address: email },
        ...createInvitationEmail(
          { appUrl: this.deps.webAppUrl, organizationName: org.name },
          token,
        ),
      })
    } catch (error) {
      await this.deps.repository.setInvitationStatus(invitation.id, 'REVOKED')
      this.deps.logger.error(
        { error, orgId, invitationId: invitation.id },
        'invitation email failed',
      )
      throw new Error('Invitation email could not be delivered', { cause: error })
    }

    this.deps.logger.info({ orgId, invitationId: invitation.id }, 'invitation created')
    return this.toInvitationDto(invitation, role.name, null)
  }

  async acceptInvitation(userId: string, dto: AcceptInvitationDto): Promise<OrganizationDto> {
    const invitation = await this.deps.repository.findInvitationByTokenHash(hashToken(dto.token))
    if (!invitation) {
      throw notFound('Invitation not found')
    }

    const user = await this.deps.repository.findInvitationUser(userId)
    if (
      !user ||
      !user.isActive ||
      user.deletedAt ||
      user.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw notFound('Invitation not found')
    }

    if (invitation.status !== 'PENDING') {
      throw conflict('This invitation is no longer pending')
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.deps.repository.setInvitationStatus(invitation.id, 'EXPIRED')
      throw conflict('This invitation has expired')
    }

    const org = await this.deps.repository.findById(invitation.orgId)
    if (!org || org.deletedAt) {
      throw notFound('Organization not found')
    }

    const existingMember = await this.deps.repository.findMember(org.id, userId)
    if (existingMember) {
      throw conflict('You are already a member of this organization')
    }

    const role = await this.deps.repository.findRoleById(invitation.roleId)
    if (!role || (role.orgId !== null && role.orgId !== org.id)) {
      throw conflict('The role for this invitation is no longer available')
    }

    const accepted = await this.deps.repository.acceptInvitation({
      invitationId: invitation.id,
      orgId: org.id,
      userId,
      roleId: role.id,
      acceptedAt: new Date(),
    })
    if (!accepted) {
      throw conflict('This invitation is no longer pending')
    }

    const memberCount = await this.deps.repository.countMembers(org.id)
    this.deps.logger.info({ orgId: org.id, userId }, 'invitation accepted')
    return this.toOrganizationDto(org, role.key, memberCount)
  }

  async revokeInvitation(orgId: string, invitationId: string): Promise<void> {
    const invitation = await this.deps.repository.findInvitationById(orgId, invitationId)
    if (!invitation) {
      throw notFound('Invitation not found')
    }
    if (invitation.status !== 'PENDING') {
      throw conflict('Only pending invitations can be revoked')
    }
    await this.deps.repository.setInvitationStatus(invitation.id, 'REVOKED')
    this.deps.logger.info({ orgId, invitationId }, 'invitation revoked')
  }

  async listInvitations(orgId: string): Promise<InvitationDto[]> {
    const rows = await this.deps.repository.listInvitations(orgId)
    return rows.map((row) => this.toInvitationDto(row, row.roleName, row.inviterName))
  }

  async listTeams(orgId: string): Promise<TeamDto[]> {
    const rows = await this.deps.repository.listTeams(orgId)
    return rows.map((row) => this.toTeamDto(row))
  }

  async createTeam(orgId: string, dto: CreateTeamDto): Promise<TeamDto> {
    const existing = await this.deps.repository.findTeamByName(orgId, dto.name)
    if (existing) {
      throw conflict('A team with this name already exists')
    }
    const team = await this.deps.repository.createTeam(orgId, {
      name: dto.name,
      description: dto.description === '' ? null : dto.description,
    })
    this.deps.logger.info({ orgId, teamId: team.id }, 'team created')
    return this.toTeamDto({ ...team, memberCount: 0 })
  }

  async updateTeam(orgId: string, teamId: string, dto: UpdateTeamDto): Promise<TeamDto> {
    const team = await this.deps.repository.findTeam(orgId, teamId)
    if (!team) {
      throw notFound('Team not found')
    }
    const updated = await this.deps.repository.updateTeam(teamId, {
      name: dto.name,
      description:
        dto.description === undefined ? undefined : dto.description === '' ? null : dto.description,
    })
    const memberCount = (await this.deps.repository.listTeamMembers(teamId)).length
    this.deps.logger.info({ orgId, teamId }, 'team updated')
    return this.toTeamDto({ ...updated, memberCount })
  }

  async deleteTeam(orgId: string, teamId: string): Promise<void> {
    const team = await this.deps.repository.findTeam(orgId, teamId)
    if (!team) {
      throw notFound('Team not found')
    }
    await this.deps.repository.softDeleteTeam(teamId)
    this.deps.logger.info({ orgId, teamId }, 'team deleted')
  }

  async listTeamMembers(orgId: string, teamId: string): Promise<TeamMemberDto[]> {
    const team = await this.deps.repository.findTeam(orgId, teamId)
    if (!team) {
      throw notFound('Team not found')
    }
    const rows = await this.deps.repository.listTeamMembers(teamId)
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.email,
      fullName: row.fullName,
      avatarKey: row.avatarKey,
      addedAt: row.addedAt.toISOString(),
    }))
  }

  async addTeamMember(
    orgId: string,
    teamId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMemberDto> {
    const team = await this.deps.repository.findTeam(orgId, teamId)
    if (!team) {
      throw notFound('Team not found')
    }

    const member = await this.deps.repository.findMember(orgId, dto.userId)
    if (!member) {
      throw badRequest('Only organization members can be added to a team')
    }

    const existing = await this.deps.repository.findTeamMember(teamId, dto.userId)
    if (existing) {
      throw conflict('This user is already in the team')
    }

    await this.deps.repository.addTeamMember(teamId, dto.userId)
    this.deps.logger.info({ orgId, teamId, userId: dto.userId }, 'team member added')
    return {
      id: `${teamId}:${dto.userId}`,
      userId: dto.userId,
      email: member.email,
      fullName: member.fullName,
      avatarKey: member.avatarKey,
      addedAt: new Date().toISOString(),
    }
  }

  async removeTeamMember(orgId: string, teamId: string, userId: string): Promise<void> {
    const team = await this.deps.repository.findTeam(orgId, teamId)
    if (!team) {
      throw notFound('Team not found')
    }
    const existing = await this.deps.repository.findTeamMember(teamId, userId)
    if (!existing) {
      throw notFound('Team member not found')
    }
    await this.deps.repository.removeTeamMember(teamId, userId)
    this.deps.logger.info({ orgId, teamId, userId }, 'team member removed')
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base
    let suffix = 2
    while (await this.deps.repository.findBySlug(slug)) {
      slug = `${base}-${suffix}`
      suffix += 1
    }
    return slug
  }

  private toOrganizationDto(
    org: {
      id: string
      name: string
      slug: string
      description: string | null
      logoKey: string | null
      isPersonal: boolean
      createdAt: Date
    },
    roleKey: string | null,
    memberCount: number,
  ): OrganizationDto {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logoKey: org.logoKey,
      isPersonal: org.isPersonal,
      roleKey,
      memberCount,
      createdAt: org.createdAt.toISOString(),
    }
  }

  private toMemberDto(member: {
    id: string
    userId: string
    email: string
    fullName: string
    avatarKey: string | null
    roleId: string
    roleKey: string
    roleName: string
    joinedAt: Date
  }): OrganizationMemberDto {
    return {
      id: member.id,
      userId: member.userId,
      email: member.email,
      fullName: member.fullName,
      avatarKey: member.avatarKey,
      roleId: member.roleId,
      roleKey: member.roleKey,
      roleName: member.roleName,
      joinedAt: member.joinedAt.toISOString(),
    }
  }

  private toInvitationDto(
    invitation: {
      id: string
      email: string
      roleId: string
      status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
      expiresAt: Date
      createdAt: Date
    },
    roleName: string,
    inviterName: string | null,
  ): InvitationDto {
    return {
      id: invitation.id,
      email: invitation.email,
      roleId: invitation.roleId,
      roleName,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      inviterName,
      createdAt: invitation.createdAt.toISOString(),
    }
  }

  private toTeamDto(team: {
    id: string
    orgId: string
    name: string
    description: string | null
    memberCount: number
    createdAt: Date
  }): TeamDto {
    return {
      id: team.id,
      orgId: team.orgId,
      name: team.name,
      description: team.description,
      memberCount: team.memberCount,
      createdAt: team.createdAt.toISOString(),
    }
  }
}

export { slugify, hashToken, INVITATION_TTL_MS }
