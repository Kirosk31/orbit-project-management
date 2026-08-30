import type { NextFunction, Request, Response } from 'express'
import { Permission } from '@orbit/shared'
import { notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { ProjectsRepository } from './projects.repository.js'

/**
 * Resolves a project id and applies the current organization-wide project
 * access policy. ProjectMember is an assignment record, not an access-control
 * boundary. Non-members and roles without project.view receive 404 so project
 * existence is not disclosed.
 */
export function createRequireProjectAccess(
  projects: ProjectsRepository,
  organizations: OrganizationsRepository,
  resolveId: (req: Request, res: Response) => string = (req) => req.params.id as string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const project = await projects.findById(resolveId(req, res))
    if (!project || project.deletedAt) {
      next(notFound('Project not found'))
      return
    }

    const membership = await organizations.getMembership(project.orgId, req.user!.id)
    if (!membership || !membership.isActive) {
      next(notFound('Project not found'))
      return
    }

    const permissions = new Set(membership.role.permissions.map((p) => p.permission.key))
    if (!permissions.has(Permission.PROJECT_VIEW)) {
      next(notFound('Project not found'))
      return
    }

    res.locals.project = {
      id: project.id,
      orgId: project.orgId,
      key: project.key,
      name: project.name,
    }
    res.locals.org = { id: project.orgId, slug: '' }
    res.locals.orgMembership = {
      id: membership.id,
      roleKey: membership.role.key,
      roleName: membership.role.name,
      permissions,
    }
    next()
  }
}
