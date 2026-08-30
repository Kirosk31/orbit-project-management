import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { Permission } from '@orbit/shared'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { ProjectsRepository } from './projects.repository.js'
import { createRequireProjectAccess } from './project-access.js'

function requestFor(userId: string): Request {
  return {
    params: { id: 'project-a' },
    user: { id: userId, sessionId: 'session-a' },
  } as unknown as Request
}

function responseWithLocals(): Response {
  return { locals: {} } as Response
}

function membership(permissionKeys: string[]) {
  return {
    id: 'membership-a',
    isActive: true,
    role: {
      key: 'CUSTOM',
      name: 'Custom',
      permissions: permissionKeys.map((key) => ({ permission: { key } })),
    },
  }
}

describe('createRequireProjectAccess', () => {
  it('hides a project from an organization role without project.view', async () => {
    const projects = {
      findById: vi.fn(async () => ({
        id: 'project-a',
        orgId: 'org-a',
        key: 'ORB',
        name: 'Orbit',
        deletedAt: null,
      })),
    } as unknown as ProjectsRepository
    const organizations = {
      getMembership: vi.fn(async () => membership([])),
    } as unknown as OrganizationsRepository
    const middleware = createRequireProjectAccess(projects, organizations)
    const next = vi.fn()

    await middleware(requestFor('user-a'), responseWithLocals(), next as unknown as NextFunction)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
  })

  it('attaches project and effective permissions for an authorized organization member', async () => {
    const projects = {
      findById: vi.fn(async () => ({
        id: 'project-a',
        orgId: 'org-a',
        key: 'ORB',
        name: 'Orbit',
        deletedAt: null,
      })),
    } as unknown as ProjectsRepository
    const organizations = {
      getMembership: vi.fn(async () => membership([Permission.PROJECT_VIEW])),
    } as unknown as OrganizationsRepository
    const middleware = createRequireProjectAccess(projects, organizations)
    const request = requestFor('user-a')
    const response = responseWithLocals()
    const next = vi.fn()

    await middleware(request, response, next as unknown as NextFunction)

    expect(next).toHaveBeenCalledWith()
    expect(response.locals.project).toMatchObject({ id: 'project-a', orgId: 'org-a' })
    expect(response.locals.orgMembership.permissions.has(Permission.PROJECT_VIEW)).toBe(true)
  })
})
