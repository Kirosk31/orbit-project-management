import { describe, expect, it, vi } from 'vitest'
import { Permission } from '@orbit/shared'

import { RealtimeAuthorizationService } from './realtime.authorization.js'
import { projectSubscriptionSchema } from './realtime.service.js'

function membership(permissionKeys: string[], isActive = true) {
  return {
    isActive,
    role: {
      permissions: permissionKeys.map((key) => ({ permission: { key } })),
    },
  }
}

describe('RealtimeAuthorizationService', () => {
  it('allows an active organization member with project.view', async () => {
    const projects = {
      findById: vi.fn().mockResolvedValue({ orgId: 'org-a', deletedAt: null }),
    }
    const organizations = {
      getMembership: vi.fn().mockResolvedValue(membership([Permission.PROJECT_VIEW])),
    }
    const service = new RealtimeAuthorizationService(projects, organizations)

    await expect(service.canSubscribeToProject('user-a', 'project-a')).resolves.toBe(true)
    expect(organizations.getMembership).toHaveBeenCalledWith('org-a', 'user-a')
  })

  it('rejects cross-tenant, inactive, unauthorized, missing, and deleted resources', async () => {
    const projects = {
      findById: vi.fn().mockResolvedValue({ orgId: 'org-b', deletedAt: null }),
    }
    const organizations = { getMembership: vi.fn().mockResolvedValue(null) }
    const service = new RealtimeAuthorizationService(projects, organizations)

    await expect(service.canSubscribeToProject('user-a', 'project-b')).resolves.toBe(false)

    organizations.getMembership.mockResolvedValue(membership([Permission.PROJECT_VIEW], false))
    await expect(service.canSubscribeToProject('user-a', 'project-b')).resolves.toBe(false)

    organizations.getMembership.mockResolvedValue(membership([]))
    await expect(service.canSubscribeToProject('user-a', 'project-b')).resolves.toBe(false)

    projects.findById.mockResolvedValue(null)
    await expect(service.canSubscribeToProject('user-a', 'missing')).resolves.toBe(false)

    projects.findById.mockResolvedValue({ orgId: 'org-b', deletedAt: new Date() })
    await expect(service.canSubscribeToProject('user-a', 'deleted')).resolves.toBe(false)
  })
})

describe('projectSubscriptionSchema', () => {
  it('accepts only a strict UUID project payload', () => {
    expect(
      projectSubscriptionSchema.safeParse({ projectId: '01991a7f-e0e1-7c82-a7c0-2f43ccf90c2a' })
        .success,
    ).toBe(true)
    expect(projectSubscriptionSchema.safeParse({ projectId: 'project-a' }).success).toBe(false)
    expect(
      projectSubscriptionSchema.safeParse({
        projectId: '01991a7f-e0e1-7c82-a7c0-2f43ccf90c2a',
        orgId: 'org-b',
      }).success,
    ).toBe(false)
  })
})
