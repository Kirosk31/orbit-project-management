import type {
  Invitation,
  Organization,
  OrganizationMember,
  PrismaClient,
  Role,
  Team,
  TeamMember,
} from '@prisma/client'

export interface OrgMembership extends OrganizationMember {
  role: {
    key: string
    name: string
    isSystem: boolean
    permissions: Array<{ permission: { key: string } }>
  }
}

export interface OrgMemberRow {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  roleId: string
  roleKey: string
  roleName: string
  joinedAt: Date
}

export interface OrgRow extends Organization {
  roleKey: string | null
  memberCount: number
}

export interface InvitationRow extends Invitation {
  roleName: string
  inviterName: string | null
}

export interface TeamRow extends Team {
  memberCount: number
}

export interface TeamMemberRow {
  id: string
  teamId: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  addedAt: Date
}

export interface OrganizationsRepository {
  createOrg(data: {
    name: string
    slug: string
    description: string | null
    ownerId: string
  }): Promise<Organization>
  createOrgWithOwner(
    data: { name: string; slug: string; description: string | null },
    ownerId: string,
    ownerRoleId: string,
  ): Promise<Organization>
  findBySlug(slug: string): Promise<Organization | null>
  findById(id: string): Promise<Organization | null>
  updateOrg(id: string, data: { name?: string; description?: string | null }): Promise<Organization>
  softDeleteOrg(id: string): Promise<void>
  listOrgsForUser(userId: string): Promise<OrgRow[]>
  getMembership(orgId: string, userId: string): Promise<OrgMembership | null>
  countMembers(orgId: string): Promise<number>
  listMembers(orgId: string): Promise<OrgMemberRow[]>
  findMember(orgId: string, userId: string): Promise<OrgMemberRow | null>
  findMemberByEmail(orgId: string, email: string): Promise<OrgMemberRow | null>
  updateMemberRole(memberId: string, roleId: string): Promise<void>
  transferOwnership(input: {
    orgId: string
    currentOwnerId: string
    targetUserId: string
    ownerRoleId: string
    previousOwnerRoleId: string
  }): Promise<boolean>
  removeMember(memberId: string): Promise<void>
  findRoleById(roleId: string): Promise<Role | null>
  findSystemRoleByKey(key: string): Promise<Role | null>
  listRolesForOrg(orgId: string): Promise<Role[]>
  listTeams(orgId: string): Promise<TeamRow[]>
  findTeam(orgId: string, teamId: string): Promise<Team | null>
  findTeamByName(orgId: string, name: string): Promise<Team | null>
  createTeam(orgId: string, data: { name: string; description: string | null }): Promise<Team>
  updateTeam(teamId: string, data: { name?: string; description?: string | null }): Promise<Team>
  softDeleteTeam(teamId: string): Promise<void>
  listTeamMembers(teamId: string): Promise<TeamMemberRow[]>
  findTeamMember(teamId: string, userId: string): Promise<TeamMember | null>
  addTeamMember(teamId: string, userId: string): Promise<void>
  removeTeamMember(teamId: string, userId: string): Promise<void>
  createInvitation(data: {
    orgId: string
    inviterId: string
    email: string
    roleId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<Invitation>
  findInvitationById(orgId: string, invitationId: string): Promise<Invitation | null>
  findInvitationByEmail(orgId: string, email: string): Promise<Invitation | null>
  findInvitationByTokenHash(tokenHash: string): Promise<Invitation | null>
  findInvitationUser(userId: string): Promise<{
    email: string
    isActive: boolean
    deletedAt: Date | null
  } | null>
  listInvitations(orgId: string): Promise<InvitationRow[]>
  setInvitationStatus(
    id: string,
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED',
    acceptedAt?: Date,
  ): Promise<void>
  acceptInvitation(input: {
    invitationId: string
    orgId: string
    userId: string
    roleId: string
    acceptedAt: Date
  }): Promise<boolean>
}

export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createOrg(data: { name: string; slug: string; description: string | null; ownerId: string }) {
    return this.prisma.organization.create({ data })
  }

  createOrgWithOwner(
    data: { name: string; slug: string; description: string | null },
    ownerId: string,
    ownerRoleId: string,
  ) {
    return this.prisma.organization.create({
      data: {
        ...data,
        ownerId,
        members: {
          create: { userId: ownerId, roleId: ownerRoleId },
        },
      },
    })
  }

  findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } })
  }

  findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } })
  }

  updateOrg(id: string, data: { name?: string; description?: string | null }) {
    return this.prisma.organization.update({ where: { id }, data })
  }

  async softDeleteOrg(id: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async listOrgsForUser(userId: string): Promise<OrgRow[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true, org: { deletedAt: null } },
      include: {
        org: {
          include: {
            _count: { select: { members: { where: { isActive: true } } } },
          },
        },
        role: { select: { key: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return memberships
      .filter(
        (membership) =>
          membership.role.key !== 'OWNER' || membership.org.ownerId === membership.userId,
      )
      .map((membership) => ({
        ...membership.org,
        roleKey: membership.role.key,
        memberCount: membership.org._count.members,
      }))
  }

  async getMembership(orgId: string, userId: string): Promise<OrgMembership | null> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: {
        org: { select: { ownerId: true } },
        role: {
          select: {
            key: true,
            name: true,
            isSystem: true,
            permissions: { select: { permission: { select: { key: true } } } },
          },
        },
      },
    })

    if (!membership) return null
    if (membership.role.key === 'OWNER' && membership.org.ownerId !== membership.userId) {
      return null
    }

    const { org: _org, ...authorizedMembership } = membership
    return authorizedMembership
  }

  countMembers(orgId: string) {
    return this.prisma.organizationMember.count({
      where: { orgId, isActive: true },
    })
  }

  async listMembers(orgId: string): Promise<OrgMemberRow[]> {
    const rows = await this.prisma.organizationMember.findMany({
      where: { orgId, isActive: true },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarKey: true } },
        role: { select: { id: true, key: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((row) => ({
      id: row.id,
      userId: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      avatarKey: row.user.avatarKey,
      roleId: row.role.id,
      roleKey: row.role.key,
      roleName: row.role.name,
      joinedAt: row.createdAt,
    }))
  }

  async findMember(orgId: string, userId: string): Promise<OrgMemberRow | null> {
    const row = await this.prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarKey: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    })

    if (!row || !row.isActive) return null

    return {
      id: row.id,
      userId: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      avatarKey: row.user.avatarKey,
      roleId: row.role.id,
      roleKey: row.role.key,
      roleName: row.role.name,
      joinedAt: row.createdAt,
    }
  }

  async findMemberByEmail(orgId: string, email: string): Promise<OrgMemberRow | null> {
    const row = await this.prisma.organizationMember.findFirst({
      where: { orgId, isActive: true, user: { email } },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarKey: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    })

    if (!row) return null

    return {
      id: row.id,
      userId: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      avatarKey: row.user.avatarKey,
      roleId: row.role.id,
      roleKey: row.role.key,
      roleName: row.role.name,
      joinedAt: row.createdAt,
    }
  }

  async updateMemberRole(memberId: string, roleId: string): Promise<void> {
    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId },
    })
  }

  transferOwnership(input: {
    orgId: string
    currentOwnerId: string
    targetUserId: string
    ownerRoleId: string
    previousOwnerRoleId: string
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const ownership = await tx.organization.updateMany({
        where: {
          id: input.orgId,
          ownerId: input.currentOwnerId,
          deletedAt: null,
        },
        data: { ownerId: input.targetUserId },
      })
      if (ownership.count !== 1) return false

      const target = await tx.organizationMember.updateMany({
        where: {
          orgId: input.orgId,
          userId: input.targetUserId,
          isActive: true,
        },
        data: { roleId: input.ownerRoleId },
      })
      if (target.count !== 1) {
        throw new Error('Ownership target is not an active organization member')
      }

      const previousOwner = await tx.organizationMember.updateMany({
        where: {
          orgId: input.orgId,
          userId: input.currentOwnerId,
          isActive: true,
        },
        data: { roleId: input.previousOwnerRoleId },
      })
      if (previousOwner.count !== 1) {
        throw new Error('Current owner membership is missing')
      }

      await tx.organizationMember.updateMany({
        where: {
          orgId: input.orgId,
          roleId: input.ownerRoleId,
          userId: { not: input.targetUserId },
        },
        data: { roleId: input.previousOwnerRoleId },
      })

      return true
    })
  }

  async removeMember(memberId: string): Promise<void> {
    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    })
  }

  findRoleById(roleId: string) {
    return this.prisma.role.findUnique({ where: { id: roleId } })
  }

  findSystemRoleByKey(key: string) {
    return this.prisma.role.findFirst({ where: { orgId: null, key } })
  }

  listRolesForOrg(orgId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ orgId }, { orgId: null }] },
      orderBy: { createdAt: 'asc' },
    })
  }

  async listTeams(orgId: string): Promise<TeamRow[]> {
    const teams = await this.prisma.team.findMany({
      where: { orgId, deletedAt: null },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return teams.map((team) => ({
      ...team,
      memberCount: team._count.members,
    }))
  }

  findTeam(orgId: string, teamId: string) {
    return this.prisma.team.findFirst({ where: { id: teamId, orgId, deletedAt: null } })
  }

  findTeamByName(orgId: string, name: string) {
    return this.prisma.team.findFirst({ where: { orgId, name, deletedAt: null } })
  }

  createTeam(orgId: string, data: { name: string; description: string | null }) {
    return this.prisma.team.create({ data: { orgId, ...data } })
  }

  updateTeam(teamId: string, data: { name?: string; description?: string | null }) {
    return this.prisma.team.update({ where: { id: teamId }, data })
  }

  async softDeleteTeam(teamId: string): Promise<void> {
    await this.prisma.team.update({
      where: { id: teamId },
      data: { deletedAt: new Date() },
    })
  }

  async listTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { email: true, fullName: true, avatarKey: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      userId: row.userId,
      email: row.user.email,
      fullName: row.user.fullName,
      avatarKey: row.user.avatarKey,
      addedAt: row.createdAt,
    }))
  }

  findTeamMember(teamId: string, userId: string) {
    return this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
  }

  async addTeamMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.create({ data: { teamId, userId } })
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })
  }

  createInvitation(data: {
    orgId: string
    inviterId: string
    email: string
    roleId: string
    tokenHash: string
    expiresAt: Date
  }) {
    return this.prisma.invitation.create({ data })
  }

  findInvitationById(orgId: string, invitationId: string) {
    return this.prisma.invitation.findFirst({ where: { id: invitationId, orgId } })
  }

  findInvitationByEmail(orgId: string, email: string) {
    return this.prisma.invitation.findFirst({
      where: { orgId, email, status: 'PENDING' },
    })
  }

  findInvitationByTokenHash(tokenHash: string) {
    return this.prisma.invitation.findUnique({ where: { tokenHash } })
  }

  findInvitationUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isActive: true, deletedAt: true },
    })
  }

  async listInvitations(orgId: string): Promise<InvitationRow[]> {
    const rows = await this.prisma.invitation.findMany({
      where: { orgId },
      include: {
        role: { select: { name: true } },
        inviter: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => ({
      ...row,
      roleName: row.role.name,
      inviterName: row.inviter.fullName,
    }))
  }

  async setInvitationStatus(
    id: string,
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED',
    acceptedAt?: Date,
  ): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { status, acceptedAt },
    })
  }

  acceptInvitation(input: {
    invitationId: string
    orgId: string
    userId: string
    roleId: string
    acceptedAt: Date
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.invitation.updateMany({
        where: {
          id: input.invitationId,
          orgId: input.orgId,
          roleId: input.roleId,
          status: 'PENDING',
          expiresAt: { gt: input.acceptedAt },
        },
        data: { status: 'ACCEPTED', acceptedAt: input.acceptedAt },
      })
      if (claim.count !== 1) return false

      await tx.organizationMember.upsert({
        where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
        create: { orgId: input.orgId, userId: input.userId, roleId: input.roleId },
        update: { roleId: input.roleId, isActive: true },
      })
      return true
    })
  }
}
