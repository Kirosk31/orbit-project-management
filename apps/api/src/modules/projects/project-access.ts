import type { NextFunction, Request, Response } from 'express'
import { notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { ProjectsRepository } from './projects.repository.js'

/**
 * Resolves a project id to the project, verifying the caller belongs to its
 * organization. Attaches `res.locals.project` plus the org membership so
 * `requireOrgPermission` can gate the route afterwards. Non-members receive
 * 404 to avoid leaking project existence.
 */
export function createRequireProjectMember(
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
      permissions: new Set(membership.role.permissions.map((p) => p.permission.key)),
    }
    next()
  }
}
