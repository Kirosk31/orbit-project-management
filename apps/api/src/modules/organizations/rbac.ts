import type { NextFunction, Request, Response } from 'express'
import type { PermissionKey } from '@orbit/shared'
import { forbidden, notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from './organizations.repository.js'

export interface OrgLocals {
  org: {
    id: string
    slug: string
  }
  orgMembership: {
    id: string
    roleKey: string
    roleName: string
    permissions: Set<string>
  }
}

/**
 * Resolves `:slug` (or an organization id) to an organization the
 * authenticated user belongs to and attaches the org plus the user's
 * membership (with effective permissions) to `res.locals`. Non-members
 * receive 404 to avoid leaking org existence.
 */
export function requireOrgMember(repository: OrganizationsRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const slug = req.params.slug as string | undefined
    if (!slug) {
      next(notFound('Organization not found'))
      return
    }

    const org = (await repository.findBySlug(slug)) ?? (await repository.findById(slug))
    if (!org || org.deletedAt) {
      next(notFound('Organization not found'))
      return
    }

    const membership = await repository.getMembership(org.id, req.user!.id)
    if (!membership || !membership.isActive) {
      next(notFound('Organization not found'))
      return
    }

    res.locals.org = { id: org.id, slug: org.slug }
    res.locals.orgMembership = {
      id: membership.id,
      roleKey: membership.role.key,
      roleName: membership.role.name,
      permissions: new Set(membership.role.permissions.map((p) => p.permission.key)),
    }
    next()
  }
}

/** Requires a specific permission within the organization. Must follow `requireOrgMember`. */
export function requireOrgPermission(permissionKey: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const membership = res.locals.orgMembership as OrgLocals['orgMembership'] | undefined
    if (!membership || !membership.permissions.has(permissionKey)) {
      next(forbidden())
      return
    }
    next()
  }
}
