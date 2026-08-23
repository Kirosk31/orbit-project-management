import type { Project } from '@prisma/client'
import type {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectActivityDto,
  ProjectDto,
  ProjectMemberDto,
  ProjectQuery,
  UpdateProjectDto,
} from '@orbit/shared'
import { badRequest, conflict, notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { ProjectsRepository } from './projects.repository.js'

export interface ProjectsServiceDependencies {
  repository: ProjectsRepository
  organizationsRepository: OrganizationsRepository
}

export class ProjectsService {
  constructor(private readonly deps: ProjectsServiceDependencies) {}

  async createProject(
    orgId: string,
    userId: string,
    dto: CreateProjectDto,
    ipAddress?: string,
  ): Promise<ProjectDto> {
    const existing = await this.deps.repository.findByOrgAndKey(orgId, dto.key)
    if (existing) {
      throw conflict(`A project with key "${dto.key}" already exists`, { field: 'key' })
    }

    const project = await this.deps.repository.createProject(
      {
        orgId,
        createdById: userId,
        name: dto.name,
        key: dto.key,
        description: dto.description,
        color: dto.color,
        icon: dto.icon ?? null,
      },
      { ipAddress },
    )
    await this.deps.repository.addProjectMember(project.id, userId)
    const memberCount = await this.countMembers(project.id)
    return this.toDto(project, true, memberCount)
  }

  async listProjects(orgId: string, userId: string, query: ProjectQuery): Promise<ProjectDto[]> {
    const rows = await this.deps.repository.listProjects(orgId, userId, query.archived)
    return rows.map((row) => this.toDto(row, row.isFavorite, row.memberCount))
  }

  async getProject(projectId: string, userId: string): Promise<ProjectDto> {
    const project = await this.findProject(projectId)
    const isFavorite = await this.deps.repository.isFavorite(project.id, userId)
    const memberCount = await this.countMembers(project.id)
    return this.toDto(project, isFavorite, memberCount)
  }

  async updateProject(
    projectId: string,
    actorId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.findProject(projectId)
    if (dto.key !== undefined && dto.key !== project.key) {
      const existing = await this.deps.repository.findByOrgAndKey(project.orgId, dto.key)
      if (existing) {
        throw conflict(`A project with key "${dto.key}" already exists`, { field: 'key' })
      }
    }

    const updated = await this.deps.repository.updateProject(project.id, dto)
    await this.deps.repository.recordActivity({
      orgId: project.orgId,
      actorId,
      action: 'project.updated',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { changed: Object.keys(dto) },
    })
    const isFavorite = await this.deps.repository.isFavorite(project.id, actorId)
    const memberCount = await this.countMembers(project.id)
    return this.toDto(updated, isFavorite, memberCount)
  }

  async deleteProject(projectId: string, actorId: string): Promise<void> {
    const project = await this.findProject(projectId)
    await this.deps.repository.softDeleteProject(project.id)
    await this.deps.repository.recordActivity({
      orgId: project.orgId,
      actorId,
      action: 'project.deleted',
      entityType: 'PROJECT',
      entityId: project.id,
    })
  }

  async setArchived(projectId: string, actorId: string, isArchived: boolean): Promise<ProjectDto> {
    const project = await this.findProject(projectId)
    const updated = await this.deps.repository.setArchived(project.id, isArchived)
    await this.deps.repository.recordActivity({
      orgId: project.orgId,
      actorId,
      action: isArchived ? 'project.archived' : 'project.restored',
      entityType: 'PROJECT',
      entityId: project.id,
    })
    const isFavorite = await this.deps.repository.isFavorite(project.id, actorId)
    const memberCount = await this.countMembers(project.id)
    return this.toDto(updated, isFavorite, memberCount)
  }

  async setFavorite(projectId: string, userId: string, isFavorite: boolean): Promise<void> {
    const project = await this.findProject(projectId)
    if (isFavorite) {
      await this.deps.repository.setFavorite(project.id, userId)
    } else {
      await this.deps.repository.unsetFavorite(project.id, userId)
    }
  }

  async listMembers(projectId: string): Promise<ProjectMemberDto[]> {
    const project = await this.findProject(projectId)
    const rows = await this.deps.repository.listProjectMembers(project.id)
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.email,
      fullName: row.fullName,
      avatarKey: row.avatarKey,
      roleId: row.roleId,
      roleName: row.roleName,
      addedAt: row.addedAt.toISOString(),
    }))
  }

  async addMember(
    projectId: string,
    actorId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMemberDto> {
    const project = await this.findProject(projectId)
    const orgMember = await this.deps.organizationsRepository.findMember(project.orgId, dto.userId)
    if (!orgMember) {
      throw badRequest('The user is not a member of this organization', { field: 'userId' })
    }

    const existing = await this.deps.repository.findProjectMember(project.id, dto.userId)
    if (existing) {
      throw conflict('The user is already a member of this project', { field: 'userId' })
    }

    await this.deps.repository.addProjectMember(project.id, dto.userId, dto.roleId)
    await this.deps.repository.recordActivity({
      orgId: project.orgId,
      actorId,
      action: 'project.member_added',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { userId: dto.userId },
    })

    const member = (await this.deps.repository.listProjectMembers(project.id)).find(
      (row) => row.userId === dto.userId,
    )
    if (!member) {
      throw new Error('Project member could not be loaded after creation')
    }
    return {
      id: member.id,
      userId: member.userId,
      email: member.email,
      fullName: member.fullName,
      avatarKey: member.avatarKey,
      roleId: member.roleId,
      roleName: member.roleName,
      addedAt: member.addedAt.toISOString(),
    }
  }

  async removeMember(projectId: string, actorId: string, userId: string): Promise<void> {
    const project = await this.findProject(projectId)
    const existing = await this.deps.repository.findProjectMember(project.id, userId)
    if (!existing) {
      throw notFound('Project member not found')
    }

    await this.deps.repository.removeProjectMember(project.id, userId)
    await this.deps.repository.recordActivity({
      orgId: project.orgId,
      actorId,
      action: 'project.member_removed',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { userId },
    })
  }

  async listActivity(projectId: string): Promise<ProjectActivityDto[]> {
    const project = await this.findProject(projectId)
    const rows = await this.deps.repository.listProjectActivity(project.id)
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata as Record<string, unknown> | null,
      actorName: row.actorName,
      createdAt: row.createdAt.toISOString(),
    }))
  }

  private async findProject(projectId: string): Promise<Project> {
    const project = await this.deps.repository.findById(projectId)
    if (!project) {
      throw notFound('Project not found')
    }
    return project
  }

  private async countMembers(projectId: string): Promise<number> {
    const members = await this.deps.repository.listProjectMembers(projectId)
    return members.length
  }

  private toDto(project: Project, isFavorite: boolean, memberCount: number): ProjectDto {
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      key: project.key,
      description: project.description,
      color: project.color,
      icon: project.icon,
      isArchived: project.isArchived,
      isFavorite,
      memberCount,
      createdAt: project.createdAt.toISOString(),
    }
  }
}
