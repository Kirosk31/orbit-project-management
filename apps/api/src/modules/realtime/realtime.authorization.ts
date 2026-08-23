import { Permission } from '@orbit/shared'

export interface RealtimeProjectReader {
  findById(projectId: string): Promise<{ orgId: string; deletedAt: Date | null } | null>
}

export interface RealtimeMembershipReader {
  getMembership(
    orgId: string,
    userId: string,
  ): Promise<{
    isActive: boolean
    role: { permissions: Array<{ permission: { key: string } }> }
  } | null>
}

export interface RealtimeAuthorizer {
  canSubscribeToProject(userId: string, projectId: string): Promise<boolean>
}

export class RealtimeAuthorizationService implements RealtimeAuthorizer {
  constructor(
    private readonly projects: RealtimeProjectReader,
    private readonly organizations: RealtimeMembershipReader,
  ) {}

  async canSubscribeToProject(userId: string, projectId: string): Promise<boolean> {
    const project = await this.projects.findById(projectId)
    if (!project || project.deletedAt) return false

    const membership = await this.organizations.getMembership(project.orgId, userId)
    if (!membership?.isActive) return false

    return membership.role.permissions.some(
      ({ permission }) => permission.key === Permission.PROJECT_VIEW,
    )
  }
}
