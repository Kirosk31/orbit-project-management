import type { Request, Response } from 'express'
import { badRequest } from '../../core/errors/index.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'
import { respond } from '../../shared/http/index.js'
import type { TaskAttachmentsService } from './task-attachments.service.js'

function contentDisposition(originalName: string): string {
  const fallback = originalName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment'
  const encoded = encodeURIComponent(originalName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export class TaskAttachmentsController {
  constructor(
    private readonly service: TaskAttachmentsService,
    private readonly auditService: AuditService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    respond(res, await this.service.list(req.params.id as string))
  }

  upload = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw badRequest('An attachment file is required')
    const attachment = await this.service.upload(req.params.id as string, req.user!.id, {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    })
    await this.recordAudit(req, res, 'task.attachment_uploaded', attachment.id, {
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })
    respond(res, attachment, { status: 201 })
  }

  download = async (req: Request, res: Response): Promise<void> => {
    const attachment = await this.service.download(
      req.params.id as string,
      req.params.attachmentId as string,
    )
    res
      .status(200)
      .set({
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentDisposition(attachment.originalName),
        'Content-Length': String(attachment.buffer.byteLength),
        'Content-Type': attachment.mimeType,
        'X-Content-Type-Options': 'nosniff',
      })
      .send(attachment.buffer)
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const attachmentId = req.params.attachmentId as string
    await this.service.remove(req.params.id as string, attachmentId, req.user!.id)
    await this.recordAudit(req, res, 'task.attachment_deleted', attachmentId)
    respond(res, { deleted: true })
  }

  private recordAudit(
    req: Request,
    res: Response,
    action: string,
    resourceId: string,
    changes?: { mimeType: string; sizeBytes: number },
  ): Promise<void> {
    return this.auditService.record({
      ...auditContextFromRequest(req),
      orgId: (res.locals.project as { orgId: string }).orgId,
      action,
      resourceType: 'attachment',
      resourceId,
      changes,
    })
  }
}
