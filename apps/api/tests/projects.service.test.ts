import { describe, expect, it, vi } from 'vitest'
import type { Project } from '@prisma/client'
import { isAppError } from '../src/core/errors/index.js'
import { ProjectsService } from '../src/modules/projects/projects.service.js'
import type { ProjectsRepository } from '../src/modules/projects/projects.repository.js'
import type { OrganizationsRepository } from '../src/modules/organizations/organizations.repository.js'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    orgId: 'org-1',
    name: 'Orbit Web',
    key: 'WEB',
    description: null,
    color: '#6366f1',
    icon: null,
    isArchived: false,
    createdById: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function createFakeRepository(overrides: Partial<ProjectsRepository> = {}) {
  const repository: ProjectsRepository = {
    createProject: vi.fn(async () => makeProject()),
    findById: vi.fn(async () => makeProject()),
    findByOrgAndKey: vi.fn(async () => null),
    updateProject: vi.fn(async (_id, data) => makeProject(data as Partial<Project>)),
    softDeleteProject: vi.fn(async () => undefined),
    listProjects: vi.fn(async () => []),
    setArchived: vi.fn(async (id, isArchived) => makeProject({ isArchived })),
    isFavorite: vi.fn(async () => false),
    setFavorite: vi.fn(async () => undefined),
    unsetFavorite: vi.fn(async () => undefined),
    listProjectMembers: vi.fn(async () => []),
    findProjectMember: vi.fn(async () => null),
    addProjectMember: vi.fn(async () => undefined),
    removeProjectMember: vi.fn(async () => undefined),
    listProjectActivity: vi.fn(async () => []),
    recordActivity: vi.fn(async () => undefined),
    ...overrides,
  }
  return repository
}

function createFakeOrganizationsRepository(overrides: Partial<OrganizationsRepository> = {}) {
  const repository: OrganizationsRepository = {
    createOrg: vi.fn(async () => ({ id: 'org-1' }) as never),
    createOrgWithOwner: vi.fn(async () => ({ id: 'org-1' }) as never),
    findBySlug: vi.fn(async () => null),
    findById: vi.fn(async () => null),
    updateOrg: vi.fn(async () => ({ id: 'org-1' }) as never),
    softDeleteOrg: vi.fn(async () => undefined),
    listOrgsForUser: vi.fn(async () => []),
    getMembership: vi.fn(async () => null),
    countMembers: vi.fn(async () => 0),
    listMembers: vi.fn(async () => []),
    findMember: vi.fn(async () => null),
    findMemberByEmail: vi.fn(async () => null),
    updateMemberRole: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    findRoleById: vi.fn(async () => null),
    findSystemRoleByKey: vi.fn(async () => null),
    listRolesForOrg: vi.fn(async () => []),
    listTeams: vi.fn(async () => []),
    findTeam: vi.fn(async () => null),
    findTeamByName: vi.fn(async () => null),
    createTeam: vi.fn(async () => ({ id: 'team-1' }) as never),
    updateTeam: vi.fn(async () => ({ id: 'team-1' }) as never),
    softDeleteTeam: vi.fn(async () => undefined),
    listTeamMembers: vi.fn(async () => []),
    findTeamMember: vi.fn(async () => null),
    addTeamMember: vi.fn(async () => undefined),
    removeTeamMember: vi.fn(async () => undefined),
    createInvitation: vi.fn(async () => ({ id: 'inv-1' }) as never),
    findInvitationById: vi.fn(async () => null),
    findInvitationByEmail: vi.fn(async () => null),
    findInvitationByTokenHash: vi.fn(async () => null),
    findInvitationUser: vi.fn(async () => null),
    listInvitations: vi.fn(async () => []),
    setInvitationStatus: vi.fn(async () => undefined),
    acceptInvitation: vi.fn(async () => false),
    ...overrides,
  }
  return repository
}

function buildService(
  overrides: {
    repository?: Partial<ProjectsRepository>
    organizations?: Partial<OrganizationsRepository>
  } = {},
) {
  const repository = createFakeRepository(overrides.repository)
  const organizationsRepository = createFakeOrganizationsRepository(overrides.organizations)
  const service = new ProjectsService({ repository, organizationsRepository })
  return { service, repository, organizationsRepository }
}

const CREATE_DTO = {
  name: 'Orbit Web',
  key: 'WEB',
  description: '',
  color: '#6366f1',
  icon: null,
}

describe('ProjectsService', () => {
  it('creates a project, adding the creator as a member', async () => {
    const { service, repository } = buildService()

    const result = await service.createProject('org-1', 'user-1', CREATE_DTO)

    expect(repository.createProject).toHaveBeenCalledWith(
      {
        orgId: 'org-1',
        createdById: 'user-1',
        name: 'Orbit Web',
        key: 'WEB',
        description: '',
        color: '#6366f1',
        icon: null,
      },
      { ipAddress: undefined },
    )
    expect(repository.addProjectMember).toHaveBeenCalledWith('project-1', 'user-1')
    expect(result).toMatchObject({ key: 'WEB', isFavorite: true, memberCount: 0 })
  })

  it('rejects a duplicate key on create', async () => {
    const { service } = buildService({
      repository: { findByOrgAndKey: vi.fn(async () => makeProject()) },
    })

    const error = await service.createProject('org-1', 'user-1', CREATE_DTO).catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('CONFLICT')
    expect(error.details).toEqual({ field: 'key' })
  })

  it('rejects a duplicate key on update', async () => {
    const { service } = buildService({
      repository: {
        findById: vi.fn(async () => makeProject({ key: 'OLD' })),
        findByOrgAndKey: vi.fn(async () => makeProject({ id: 'project-2', key: 'WEB' })),
      },
    })

    const error = await service.updateProject('project-1', 'user-1', { key: 'WEB' }).catch((e) => e)
    expect(error.code).toBe('CONFLICT')
  })

  it('records activity on update and delete', async () => {
    const { service, repository } = buildService()

    await service.updateProject('project-1', 'user-1', { name: 'Renamed' })
    expect(repository.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'project.updated', metadata: { changed: ['name'] } }),
    )

    await service.deleteProject('project-1', 'user-1')
    expect(repository.softDeleteProject).toHaveBeenCalledWith('project-1')
    expect(repository.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'project.deleted' }),
    )
  })

  it('throws NOT_FOUND for missing projects', async () => {
    const { service } = buildService({
      repository: { findById: vi.fn(async () => null) },
    })

    const error = await service.getProject('nope', 'user-1').catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('NOT_FOUND')
  })

  it('adds only org members to a project', async () => {
    const { service, repository } = buildService({
      organizations: {
        findMember: vi.fn(async () => null),
      },
    })

    const error = await service
      .addMember('project-1', 'user-1', { userId: 'user-9' })
      .catch((e) => e)
    expect(error.code).toBe('BAD_REQUEST')
    expect(repository.addProjectMember).not.toHaveBeenCalled()
  })

  it('rejects duplicate project members', async () => {
    const { service } = buildService({
      organizations: {
        findMember: vi.fn(async () => ({ id: 'member-1' }) as never),
      },
      repository: {
        findProjectMember: vi.fn(async () => ({ id: 'pm-1' }) as never),
      },
    })

    const error = await service
      .addMember('project-1', 'user-1', { userId: 'user-2' })
      .catch((e) => e)
    expect(error.code).toBe('CONFLICT')
  })

  it('returns a typed member after adding', async () => {
    const member = {
      id: 'pm-2',
      userId: 'user-2',
      email: 'user2@orbit.app',
      fullName: 'User Two',
      avatarKey: null,
      roleId: null,
      roleName: null,
      addedAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    const { service } = buildService({
      organizations: {
        findMember: vi.fn(async () => ({ id: 'member-2' }) as never),
      },
      repository: {
        listProjectMembers: vi.fn(async () => [member]),
      },
    })

    const result = await service.addMember('project-1', 'user-1', { userId: 'user-2' })
    expect(result).toMatchObject({
      userId: 'user-2',
      email: 'user2@orbit.app',
      addedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('lists activity with actor names', async () => {
    const { service } = buildService({
      repository: {
        listProjectActivity: vi.fn(async () => [
          {
            id: 'a-1',
            action: 'project.updated',
            entityType: 'PROJECT',
            entityId: 'project-1',
            metadata: null,
            actorName: 'Grace Hopper',
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    })

    const activity = await service.listActivity('project-1')
    expect(activity).toEqual([
      {
        id: 'a-1',
        action: 'project.updated',
        entityType: 'PROJECT',
        entityId: 'project-1',
        metadata: null,
        actorName: 'Grace Hopper',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ])
  })
})
