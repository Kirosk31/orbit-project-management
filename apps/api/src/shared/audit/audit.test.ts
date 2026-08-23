import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { auditContextFromRequest, PrismaAuditService } from './audit.js'

describe('PrismaAuditService', () => {
  it('appends an allowlisted event without exposing mutation methods', async () => {
    const create = vi.fn(async () => ({ id: 'audit-1' }))
    const prisma = { auditLog: { create } } as unknown as PrismaClient
    const service = new PrismaAuditService(prisma)

    await service.record({
      orgId: 'org-1',
      actorId: 'user-1',
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: 'org-1',
      changes: { fields: ['name'] },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    })

    expect(create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        actorId: 'user-1',
        action: 'organization.updated',
        resourceType: 'organization',
        resourceId: 'org-1',
        changes: { fields: ['name'] },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    })
  })

  it('derives actor and network context without request bodies or credentials', () => {
    expect(
      auditContextFromRequest({
        user: { id: 'user-1' },
        ip: '127.0.0.1',
        header: (name) => (name === 'user-agent' ? 'test-agent' : undefined),
      }),
    ).toEqual({ actorId: 'user-1', ipAddress: '127.0.0.1', userAgent: 'test-agent' })
  })
})
