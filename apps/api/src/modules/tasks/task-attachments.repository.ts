import type { Attachment, Prisma, PrismaClient } from '@prisma/client'

const ATTACHMENT_INCLUDE = {
  uploader: { select: { id: true, fullName: true, avatarKey: true } },
} satisfies Prisma.AttachmentInclude

export type AttachmentRow = Prisma.AttachmentGetPayload<{ include: typeof ATTACHMENT_INCLUDE }>

export interface TaskAttachmentsRepository {
  list(taskId: string): Promise<AttachmentRow[]>
  find(taskId: string, attachmentId: string): Promise<AttachmentRow | null>
  create(data: {
    taskId: string
    uploaderId: string
    storageKey: string
    originalName: string
    mimeType: string
    sizeBytes: number
  }): Promise<Attachment>
  softDelete(attachmentId: string): Promise<void>
}

export class PrismaTaskAttachmentsRepository implements TaskAttachmentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(taskId: string): Promise<AttachmentRow[]> {
    return this.prisma.attachment.findMany({
      where: { taskId, deletedAt: null },
      include: ATTACHMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  find(taskId: string, attachmentId: string): Promise<AttachmentRow | null> {
    return this.prisma.attachment.findFirst({
      where: { id: attachmentId, taskId, deletedAt: null },
      include: ATTACHMENT_INCLUDE,
    })
  }

  create(data: {
    taskId: string
    uploaderId: string
    storageKey: string
    originalName: string
    mimeType: string
    sizeBytes: number
  }): Promise<Attachment> {
    return this.prisma.attachment.create({ data })
  }

  async softDelete(attachmentId: string): Promise<void> {
    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    })
  }
}
