import { describe, expect, it, vi } from 'vitest'
import type { Invitation, Organization, Team } from '@prisma/client'
import { isAppError } from '../src/core/errors/index.js'
import { createLogger } from '../src/core/logger/logger.js'
import type { MailService } from '../src/shared/mail/mail.js'
import {
  hashToken,
  slugify,
  OrganizationsService,
} from '../src/modules/organizations/organizations.service.js'
import type { OrganizationsRepository } from '../src/modules/organizations/organizations.repository.js'

const logger = createLogger({ level: 'silent', isProduction: false })

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Acme Inc.',
    slug: 'acme',
    description: null,
    logoKey: null,
    ownerId: 'user-1',
    isPersonal: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 'inv-1',
    orgId: 'org-1',
    inviterId: 'user-1',
    email: 'grace@orbit.app',
    roleId: 'role-viewer',
    tokenHash: hashToken('secret-token'),
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 86_400_000),
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    orgId: 'org-1',
    name: 'Platform',
    description: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

const OWNER_ROLE = {
  id: 'role-owner',
  orgId: null,
  key: 'OWNER',
  name: 'Owner',
  isSystem: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}
const ADMIN_ROLE = {
  id: 'role-admin',
  orgId: null,
  key: 'ADMIN',
  name: 'Admin',
  isSystem: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}
const VIEWER_ROLE = {
  id: 'role-viewer',
  orgId: null,
  key: 'VIEWER',
  name: 'Viewer',
  isSystem: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function createFakeRepository(overrides: Partial<OrganizationsRepository> = {}) {
  const repository: OrganizationsRepository = {
    createOrg: vi.fn(async () => makeOrg()),
    createOrgWithOwner: vi.fn(async () => makeOrg()),
    findBySlug: vi.fn(async () => null),
    findById: vi.fn(async () => makeOrg()),
    updateOrg: vi.fn(async () => makeOrg({ name: 'Renamed' })),
    softDeleteOrg: vi.fn(async () => undefined),
    listOrgsForUser: vi.fn(async () => [{ ...makeOrg(), roleKey: 'OWNER', memberCount: 3 }]),
    getMembership: vi.fn(async () => null),
    countMembers: vi.fn(async () => 1),
    listMembers: vi.fn(async () => [
      {
        id: 'member-1',
        userId: 'user-1',
        email: 'ada@orbit.app',
        fullName: 'Ada Lovelace',
        avatarKey: null,
        roleId: 'role-owner',
        roleKey: 'OWNER',
        roleName: 'Owner',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
    findMember: vi.fn(async () => null),
    findMemberByEmail: vi.fn(async () => null),
    updateMemberRole: vi.fn(async () => undefined),
    transferOwnership: vi.fn(async () => true),
    removeMember: vi.fn(async () => undefined),
    findRoleById: vi.fn(async (roleId) => {
      if (roleId === OWNER_ROLE.id) return OWNER_ROLE
      if (roleId === ADMIN_ROLE.id) return ADMIN_ROLE
      if (roleId === VIEWER_ROLE.id) return VIEWER_ROLE
      return null
    }),
    findSystemRoleByKey: vi.fn(async (key) => {
      if (key === 'OWNER') return OWNER_ROLE
      if (key === 'ADMIN') return ADMIN_ROLE
      if (key === 'VIEWER') return VIEWER_ROLE
      return null
    }),
    listRolesForOrg: vi.fn(async () => [OWNER_ROLE, ADMIN_ROLE, VIEWER_ROLE]),
    listTeams: vi.fn(async () => [{ ...makeTeam(), memberCount: 0 }]),
    findTeam: vi.fn(async () => makeTeam()),
    findTeamByName: vi.fn(async () => null),
    createTeam: vi.fn(async () => makeTeam()),
    updateTeam: vi.fn(async () => makeTeam({ name: 'Renamed Team' })),
    softDeleteTeam: vi.fn(async () => undefined),
    listTeamMembers: vi.fn(async () => []),
    findTeamMember: vi.fn(async () => null),
    addTeamMember: vi.fn(async () => undefined),
    removeTeamMember: vi.fn(async () => undefined),
    createInvitation: vi.fn(async () => makeInvitation()),
    findInvitationById: vi.fn(async () => makeInvitation()),
    findInvitationByEmail: vi.fn(async () => null),
    findInvitationByTokenHash: vi.fn(async () => null),
    findInvitationUser: vi.fn(async () => ({
      email: 'grace@orbit.app',
      isActive: true,
      deletedAt: null,
    })),
    listInvitations: vi.fn(async () => []),
    setInvitationStatus: vi.fn(async () => undefined),
    acceptInvitation: vi.fn(async () => true),
    ...overrides,
  }
  return repository
}

function createService(
  repository: OrganizationsRepository,
  mailService: MailService = { sendMail: vi.fn(async () => undefined) },
  realtime?: { disconnectUser(userId: string): void },
): OrganizationsService {
  return new OrganizationsService({
    repository,
    logger,
    mailService,
    webAppUrl: 'http://localhost:5173',
    realtime,
  })
}

describe('slugify', () => {
  it('normalizes names into slugs', () => {
    expect(slugify('Orbit Test Workspace')).toBe('orbit-test-workspace')
    expect(slugify('  Únïcòde Café  ')).toBe('unicode-cafe')
    expect(slugify('!!!')).toBe('org')
    expect(slugify('A'.repeat(200))).toHaveLength(60)
  })
})

describe('OrganizationsService.createOrganization', () => {
  it('creates the org with a unique slug and the owner role', async () => {
    const repository = createFakeRepository({
      findBySlug: vi.fn(async (slug) => (slug === 'acme' ? makeOrg() : null)),
      createOrgWithOwner: vi.fn(async (data) => makeOrg({ slug: 'acme-2', name: data.name })),
    })
    const service = createService(repository)

    const org = await service.createOrganization('user-1', { name: 'Acme', description: 'Hi' })

    expect(repository.createOrgWithOwner).toHaveBeenCalledWith(
      { name: 'Acme', slug: 'acme-2', description: 'Hi' },
      'user-1',
      'role-owner',
    )
    expect(org).toMatchObject({ roleKey: 'OWNER', memberCount: 1 })
  })

  it('normalizes an empty description to null', async () => {
    const repository = createFakeRepository({
      createOrgWithOwner: vi.fn(async () => makeOrg()),
    })
    const service = createService(repository)

    await service.createOrganization('user-1', { name: 'Acme', description: '' })

    expect(repository.createOrgWithOwner).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
      'user-1',
      'role-owner',
    )
  })

  it('fails when the OWNER role is not seeded', async () => {
    const repository = createFakeRepository({
      findSystemRoleByKey: vi.fn(async () => null),
    })
    const service = createService(repository)

    await expect(
      service.createOrganization('user-1', { name: 'Acme', description: '' }),
    ).rejects.toThrow('OWNER role is not seeded')
  })
})

describe('OrganizationsService.inviteMember', () => {
  it('creates an invitation with a hashed token and 7-day expiry', async () => {
    const repository = createFakeRepository()
    const sendMail = vi.fn<MailService['sendMail']>(async () => undefined)
    const service = createService(repository, { sendMail })

    const invitation = await service.inviteMember('org-1', 'user-1', {
      email: 'Grace@Orbit.App',
      roleId: 'role-viewer',
    })

    expect(invitation).toMatchObject({
      email: 'grace@orbit.app',
      roleName: 'Viewer',
      status: 'PENDING',
    })
    expect(invitation).not.toHaveProperty('token')
    expect(sendMail).toHaveBeenCalledOnce()
    const sentHtml = sendMail.mock.calls[0]![0].html ?? ''
    const token = /invitationToken=([a-zA-Z0-9_-]+)/.exec(sentHtml)?.[1]
    expect(token).toBeTruthy()
    expect(repository.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'grace@orbit.app',
        roleId: 'role-viewer',
        tokenHash: hashToken(token!),
        expiresAt: expect.any(Date),
      }),
    )
    const expiry = (repository.createInvitation as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      .expiresAt as Date
    expect(expiry.getTime() - Date.now()).toBeGreaterThan(6 * 86_400_000)
  })

  it('rejects invites for existing members', async () => {
    const repository = createFakeRepository({
      findMemberByEmail: vi.fn(async () => ({
        id: 'member-1',
        userId: 'user-9',
        email: 'grace@orbit.app',
        fullName: 'Grace',
        avatarKey: null,
        roleId: 'role-viewer',
        roleKey: 'VIEWER',
        roleName: 'Viewer',
        joinedAt: new Date(),
      })),
    })
    const service = createService(repository)

    const result = await service
      .inviteMember('org-1', 'user-1', { email: 'grace@orbit.app', roleId: 'role-viewer' })
      .catch((error) => error)

    expect(isAppError(result)).toBe(true)
    expect(result).toMatchObject({ statusCode: 409 })
  })

  it('rejects duplicate pending invitations', async () => {
    const repository = createFakeRepository({
      findInvitationByEmail: vi.fn(async () => makeInvitation()),
    })
    const service = createService(repository)

    const result = await service
      .inviteMember('org-1', 'user-1', { email: 'grace@orbit.app', roleId: 'role-viewer' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
  })

  it('rejects roles that do not belong to the organization', async () => {
    const repository = createFakeRepository({
      findRoleById: vi.fn(async (roleId) => ({
        id: roleId,
        orgId: 'org-9',
        key: 'CUSTOM',
        name: 'Custom',
        isSystem: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
    })
    const service = createService(repository)

    const result = await service
      .inviteMember('org-1', 'user-1', { email: 'grace@orbit.app', roleId: 'role-other-org' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 400 })
  })

  it('rejects invitations that would assign the owner role', async () => {
    const repository = createFakeRepository()
    const service = createService(repository)

    const result = await service
      .inviteMember('org-1', 'user-1', {
        email: 'grace@orbit.app',
        roleId: OWNER_ROLE.id,
      })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 403 })
    expect(repository.createInvitation).not.toHaveBeenCalled()
  })
})

describe('OrganizationsService.acceptInvitation', () => {
  it('joins the organization and marks the invitation accepted', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () => makeInvitation()),
      findById: vi.fn(async () => makeOrg()),
    })
    const service = createService(repository)

    const org = await service.acceptInvitation('user-9', { token: 'secret-token' })

    expect(repository.acceptInvitation).toHaveBeenCalledWith({
      invitationId: 'inv-1',
      orgId: 'org-1',
      userId: 'user-9',
      roleId: 'role-viewer',
      acceptedAt: expect.any(Date),
    })
    expect(org).toMatchObject({ id: 'org-1', roleKey: 'VIEWER', memberCount: 1 })
  })

  it('returns 404 for unknown tokens', async () => {
    const service = createService(createFakeRepository())
    const result = await service
      .acceptInvitation('user-9', { token: 'nope' })
      .catch((error) => error)
    expect(result).toMatchObject({ statusCode: 404 })
  })

  it('revokes a legacy invitation that carries the owner role', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () => makeInvitation({ roleId: OWNER_ROLE.id })),
      findById: vi.fn(async () => makeOrg()),
    })
    const service = createService(repository)

    const result = await service
      .acceptInvitation('user-9', { token: 'legacy-owner-token' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 403 })
    expect(repository.setInvitationStatus).toHaveBeenCalledWith('inv-1', 'REVOKED')
    expect(repository.acceptInvitation).not.toHaveBeenCalled()
  })

  it('rejects non-pending invitations', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () => makeInvitation({ status: 'REVOKED' })),
    })
    const service = createService(repository)

    const result = await service
      .acceptInvitation('user-9', { token: 'secret-token' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
  })

  it('does not let a different account redeem an emailed invitation', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () => makeInvitation()),
      findInvitationUser: vi.fn(async () => ({
        email: 'attacker@orbit.app',
        isActive: true,
        deletedAt: null,
      })),
    })
    const service = createService(repository)

    await expect(
      service.acceptInvitation('attacker', { token: 'secret-token' }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.acceptInvitation).not.toHaveBeenCalled()
  })

  it('expires stale invitations', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () =>
        makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      ),
    })
    const service = createService(repository)

    const result = await service
      .acceptInvitation('user-9', { token: 'secret-token' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
    expect(repository.setInvitationStatus).toHaveBeenCalledWith('inv-1', 'EXPIRED')
  })

  it('rejects accept when the user is already a member', async () => {
    const repository = createFakeRepository({
      findInvitationByTokenHash: vi.fn(async () => makeInvitation()),
      findMember: vi.fn(async () => ({
        id: 'member-1',
        userId: 'user-9',
        email: 'grace@orbit.app',
        fullName: 'Grace',
        avatarKey: null,
        roleId: 'role-viewer',
        roleKey: 'VIEWER',
        roleName: 'Viewer',
        joinedAt: new Date(),
      })),
    })
    const service = createService(repository)

    const result = await service
      .acceptInvitation('user-9', { token: 'secret-token' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
    expect(repository.acceptInvitation).not.toHaveBeenCalled()
  })
})

describe('OrganizationsService member management', () => {
  it('does not expose owner as an assignable role', async () => {
    const service = createService(createFakeRepository())

    await expect(service.listRoles('org-1')).resolves.toEqual([
      expect.objectContaining({ key: 'ADMIN' }),
      expect.objectContaining({ key: 'VIEWER' }),
    ])
  })

  it('protects the owner from role changes and removal', async () => {
    const ownerRow = {
      id: 'member-owner',
      userId: 'user-1',
      email: 'ada@orbit.app',
      fullName: 'Ada',
      avatarKey: null,
      roleId: 'role-owner',
      roleKey: 'OWNER',
      roleName: 'Owner',
      joinedAt: new Date(),
    }
    const repository = createFakeRepository({
      findMember: vi.fn(async () => ownerRow),
    })
    const service = createService(repository)

    const roleChange = await service
      .updateMemberRole('org-1', 'user-1', { roleId: 'role-viewer' })
      .catch((error) => error)
    expect(roleChange).toMatchObject({ statusCode: 403 })

    const removal = await service.removeMember('org-1', 'user-1').catch((error) => error)
    expect(removal).toMatchObject({ statusCode: 403 })
  })

  it('allows non-owner role changes that do not transfer ownership', async () => {
    const memberRow = {
      id: 'member-2',
      userId: 'user-2',
      email: 'grace@orbit.app',
      fullName: 'Grace',
      avatarKey: null,
      roleId: 'role-viewer',
      roleKey: 'VIEWER',
      roleName: 'Viewer',
      joinedAt: new Date(),
    }
    const repository = createFakeRepository({
      findMember: vi.fn(async () => memberRow),
    })
    const service = createService(repository)

    const updated = await service.updateMemberRole('org-1', 'user-2', {
      roleId: 'role-admin',
    })

    expect(repository.updateMemberRole).toHaveBeenCalledWith('member-2', 'role-admin')
    expect(updated).toMatchObject({ roleKey: 'ADMIN' })
  })

  it('rejects promoting a member to owner through the generic role endpoint', async () => {
    const memberRow = {
      id: 'member-2',
      userId: 'user-2',
      email: 'grace@orbit.app',
      fullName: 'Grace',
      avatarKey: null,
      roleId: 'role-admin',
      roleKey: 'ADMIN',
      roleName: 'Admin',
      joinedAt: new Date(),
    }
    const repository = createFakeRepository({
      findMember: vi.fn(async () => memberRow),
    })
    const service = createService(repository)

    const result = await service
      .updateMemberRole('org-1', 'user-2', { roleId: OWNER_ROLE.id })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 403 })
    expect(repository.updateMemberRole).not.toHaveBeenCalled()
  })

  it('transfers ownership atomically to an active member and disconnects both identities', async () => {
    const target = {
      id: 'member-2',
      userId: 'user-2',
      email: 'grace@orbit.app',
      fullName: 'Grace',
      avatarKey: null,
      roleId: ADMIN_ROLE.id,
      roleKey: 'ADMIN',
      roleName: 'Admin',
      joinedAt: new Date(),
    }
    const repository = createFakeRepository({
      findById: vi.fn(async () => makeOrg({ ownerId: 'user-1' })),
      findMember: vi.fn(async () => target),
    })
    const realtime = { disconnectUser: vi.fn() }
    const service = createService(repository, undefined, realtime)

    await service.transferOwnership('org-1', 'user-1', { userId: 'user-2' })

    expect(repository.transferOwnership).toHaveBeenCalledWith({
      orgId: 'org-1',
      currentOwnerId: 'user-1',
      targetUserId: 'user-2',
      ownerRoleId: OWNER_ROLE.id,
      previousOwnerRoleId: ADMIN_ROLE.id,
    })
    expect(realtime.disconnectUser).toHaveBeenCalledWith('user-1')
    expect(realtime.disconnectUser).toHaveBeenCalledWith('user-2')
  })

  it('rejects ownership transfer by anyone other than the current owner', async () => {
    const repository = createFakeRepository({
      findById: vi.fn(async () => makeOrg({ ownerId: 'user-1' })),
    })
    const service = createService(repository)

    const result = await service
      .transferOwnership('org-1', 'user-admin', { userId: 'user-2' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 403 })
    expect(repository.transferOwnership).not.toHaveBeenCalled()
  })

  it('rejects roles outside the organization', async () => {
    const repository = createFakeRepository({
      findMember: vi.fn(async () => ({
        id: 'member-2',
        userId: 'user-2',
        email: 'grace@orbit.app',
        fullName: 'Grace',
        avatarKey: null,
        roleId: 'role-viewer',
        roleKey: 'VIEWER',
        roleName: 'Viewer',
        joinedAt: new Date(),
      })),
      findRoleById: vi.fn(async () => null),
    })
    const service = createService(repository)

    const result = await service
      .updateMemberRole('org-1', 'user-2', { roleId: 'role-missing' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 400 })
  })
})

describe('OrganizationsService teams', () => {
  it('rejects duplicate team names', async () => {
    const repository = createFakeRepository({
      findTeamByName: vi.fn(async () => makeTeam()),
    })
    const service = createService(repository)

    const result = await service
      .createTeam('org-1', { name: 'Platform', description: '' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
    expect(repository.createTeam).not.toHaveBeenCalled()
  })

  it('creates teams with a null description when empty', async () => {
    const repository = createFakeRepository()
    const service = createService(repository)

    const team = await service.createTeam('org-1', { name: 'Platform', description: '' })

    expect(repository.createTeam).toHaveBeenCalledWith('org-1', {
      name: 'Platform',
      description: null,
    })
    expect(team).toMatchObject({ name: 'Platform', memberCount: 0 })
  })

  it('only allows organization members into teams', async () => {
    const repository = createFakeRepository({
      findTeam: vi.fn(async () => makeTeam()),
      findMember: vi.fn(async () => null),
    })
    const service = createService(repository)

    const result = await service
      .addTeamMember('org-1', 'team-1', { userId: 'user-9' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 400 })
    expect(repository.addTeamMember).not.toHaveBeenCalled()
  })

  it('rejects duplicate team members', async () => {
    const repository = createFakeRepository({
      findTeam: vi.fn(async () => makeTeam()),
      findMember: vi.fn(async () => ({
        id: 'member-2',
        userId: 'user-2',
        email: 'grace@orbit.app',
        fullName: 'Grace',
        avatarKey: null,
        roleId: 'role-viewer',
        roleKey: 'VIEWER',
        roleName: 'Viewer',
        joinedAt: new Date(),
      })),
      findTeamMember: vi.fn(async () => ({
        id: 'tm-1',
        teamId: 'team-1',
        userId: 'user-2',
        createdAt: new Date(),
      })),
    })
    const service = createService(repository)

    const result = await service
      .addTeamMember('org-1', 'team-1', { userId: 'user-2' })
      .catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
  })
})

describe('OrganizationsService revokeInvitation', () => {
  it('revokes pending invitations', async () => {
    const repository = createFakeRepository({
      findInvitationById: vi.fn(async () => makeInvitation()),
    })
    const service = createService(repository)

    await service.revokeInvitation('org-1', 'inv-1')

    expect(repository.setInvitationStatus).toHaveBeenCalledWith('inv-1', 'REVOKED')
  })

  it('rejects revoking non-pending invitations', async () => {
    const repository = createFakeRepository({
      findInvitationById: vi.fn(async () => makeInvitation({ status: 'ACCEPTED' })),
    })
    const service = createService(repository)

    const result = await service.revokeInvitation('org-1', 'inv-1').catch((error) => error)

    expect(result).toMatchObject({ statusCode: 409 })
  })

  it('returns 404 for unknown invitations', async () => {
    const repository = createFakeRepository({
      findInvitationById: vi.fn(async () => null),
    })
    const service = createService(repository)

    const result = await service.revokeInvitation('org-1', 'missing').catch((error) => error)

    expect(result).toMatchObject({ statusCode: 404 })
  })
})
