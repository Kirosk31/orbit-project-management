import type { Prisma, PrismaClient, Project, ProjectMember } from '@prisma/client'

export interface ProjectRow extends Project {
  memberCount: number
  isFavorite: boolean
}

export interface ProjectMemberRow {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  roleId: string | null
  roleName: string | null
  addedAt: Date
}

export interface ProjectActivityRow {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Prisma.JsonValue | null
  actorName: string
  createdAt: Date
}

export interface ProjectsRepository {
  createProject(
    data: {
      orgId: string
      createdById: string
      name: string
      key: string
      description: string
      color: string
      icon: string | null
    },
    metadata?: { ipAddress?: string },
  ): Promise<Project>
  findById(id: string): Promise<Project | null>
  findByOrgAndKey(orgId: string, key: string): Promise<Project | null>
  updateProject(
    id: string,
    data: {
      name?: string
      key?: string
      description?: string | null
      color?: string
      icon?: string | null
    },
  ): Promise<Project>
  softDeleteProject(id: string): Promise<void>
  listProjects(orgId: string, userId: string, archived: boolean | null): Promise<ProjectRow[]>
  setArchived(id: string, isArchived: boolean): Promise<Project>
  isFavorite(projectId: string, userId: string): Promise<boolean>
  setFavorite(projectId: string, userId: string): Promise<void>
  unsetFavorite(projectId: string, userId: string): Promise<void>
  listProjectMembers(projectId: string): Promise<ProjectMemberRow[]>
  findProjectMember(projectId: string, userId: string): Promise<ProjectMember | null>
  addProjectMember(projectId: string, userId: string, roleId?: string): Promise<void>
  removeProjectMember(projectId: string, userId: string): Promise<void>
  listProjectActivity(projectId: string, take?: number): Promise<ProjectActivityRow[]>
  recordActivity(data: {
    orgId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Prisma.InputJsonValue
  }): Promise<void>
}

export class PrismaProjectsRepository implements ProjectsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createProject(
    data: {
      orgId: string
      createdById: string
      name: string
      key: string
      description: string
      color: string
      icon: string | null
    },
    metadata?: { ipAddress?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data })
      if (metadata?.ipAddress) {
        await tx.activityLog.create({
          data: {
            orgId: data.orgId,
            actorId: data.createdById,
            action: 'project.created',
            entityType: 'PROJECT',
            entityId: project.id,
            ipAddress: metadata.ipAddress,
          },
        })
      }
      return project
    })
  }

  findById(id: string) {
    return this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    })
  }

  findByOrgAndKey(orgId: string, key: string) {
    return this.prisma.project.findFirst({
      where: { orgId, key },
    })
  }

  updateProject(
    id: string,
    data: {
      name?: string
      key?: string
      description?: string | null
      color?: string
      icon?: string | null
    },
  ) {
    return this.prisma.project.update({ where: { id }, data })
  }

  async softDeleteProject(id: string): Promise<void> {
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true },
    })
  }

  listProjects(orgId: string, userId: string, archived: boolean | null) {
    return this.prisma.project
      .findMany({
        where: { orgId, deletedAt: null, ...(archived === null ? {} : { isArchived: archived }) },
        include: {
          _count: { select: { members: true } },
          favorites: { where: { userId }, select: { id: true } },
        },
        orderBy: [{ isArchived: 'asc' }, { createdAt: 'desc' }],
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          memberCount: row._count.members,
          isFavorite: row.favorites.length > 0,
          favorites: undefined,
          _count: undefined,
        })),
      )
  }

  setArchived(id: string, isArchived: boolean) {
    return this.prisma.project.update({ where: { id }, data: { isArchived } })
  }

  async isFavorite(projectId: string, userId: string): Promise<boolean> {
    const favorite = await this.prisma.projectFavorite.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    })
    return favorite !== null
  }

  async setFavorite(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectFavorite.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId },
      update: {},
    })
  }

  async unsetFavorite(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectFavorite.deleteMany({ where: { projectId, userId } })
  }

  listProjectMembers(projectId: string) {
    return this.prisma.projectMember
      .findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, email: true, fullName: true, avatarKey: true } },
          role: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          userId: row.user.id,
          email: row.user.email,
          fullName: row.user.fullName,
          avatarKey: row.user.avatarKey,
          roleId: row.roleId,
          roleName: row.role?.name ?? null,
          addedAt: row.createdAt,
        })),
      )
  }

  findProjectMember(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })
  }

  async addProjectMember(projectId: string, userId: string, roleId?: string): Promise<void> {
    await this.prisma.projectMember.create({ data: { projectId, userId, roleId } })
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })
  }

  listProjectActivity(projectId: string, take = 50) {
    return this.prisma.activityLog
      .findMany({
        where: { entityType: 'PROJECT', entityId: projectId },
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          metadata: row.metadata,
          actorName: row.actor.fullName,
          createdAt: row.createdAt,
        })),
      )
  }

  async recordActivity(data: {
    orgId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Prisma.InputJsonValue
  }): Promise<void> {
    await this.prisma.activityLog.create({ data })
  }
}
