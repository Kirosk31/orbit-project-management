import type { Prisma, PrismaClient } from '@prisma/client'

export interface AuditContext {
  actorId?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditEvent extends AuditContext {
  orgId?: string
  action: string
  resourceType: string
  resourceId?: string
  changes?: Prisma.InputJsonValue
}

export interface AuditService {
  record(event: AuditEvent): Promise<void>
}

export class PrismaAuditService implements AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        orgId: event.orgId,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        changes: event.changes,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    })
  }
}

export function auditContextFromRequest(request: {
  user?: { id: string }
  ip?: string
  header(name: string): string | undefined
}): AuditContext {
  return {
    actorId: request.user?.id,
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
  }
}
