import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import type { AttachmentDto, ProjectRealtimeEvent } from '@orbit/shared'
import { badRequest, notFound } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/logger.js'
import type { StorageService } from '../../shared/storage/storage.js'
import type { TasksRepository } from './tasks.repository.js'
import type { AttachmentRow, TaskAttachmentsRepository } from './task-attachments.repository.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
] as const

type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number]

const EXTENSIONS: Record<AttachmentMimeType, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt', '.md'],
  'text/csv': ['.csv'],
}

export interface AttachmentFile {
  buffer: Buffer
  mimeType: string
  originalName: string
}

export interface AttachmentDownload {
  buffer: Buffer
  mimeType: string
  originalName: string
}

export interface TaskAttachmentsServiceDependencies {
  repository: TaskAttachmentsRepository
  tasks: TasksRepository
  storage: StorageService
  logger: Logger
  realtime?: RealtimePublisher
}

export class TaskAttachmentsService {
  constructor(private readonly deps: TaskAttachmentsServiceDependencies) {}

  async list(taskId: string): Promise<AttachmentDto[]> {
    return (await this.deps.repository.list(taskId)).map((row) => this.toDto(row))
  }

  async upload(taskId: string, actorId: string, file: AttachmentFile): Promise<AttachmentDto> {
    if (file.buffer.byteLength === 0 || file.buffer.byteLength > ATTACHMENT_MAX_BYTES) {
      throw badRequest('Attachment must be between 1 byte and 10 MB')
    }

    const mimeType = this.requireMimeType(file.mimeType)
    const originalName = this.normalizeOriginalName(file.originalName)
    const extension = path.extname(originalName).toLowerCase()
    if (!EXTENSIONS[mimeType].includes(extension)) {
      throw badRequest('Attachment extension does not match its declared media type')
    }
    await this.validateContent(file.buffer, mimeType)

    const storageExtension = EXTENSIONS[mimeType][0]!
    const storageKey = `attachments/${taskId}/${randomUUID()}${storageExtension}`
    await this.deps.storage.put(storageKey, file.buffer, { mimeType })

    let attachment
    try {
      attachment = await this.deps.repository.create({
        taskId,
        uploaderId: actorId,
        storageKey,
        originalName,
        mimeType,
        sizeBytes: file.buffer.byteLength,
      })
    } catch (error) {
      await this.deps.storage.delete(storageKey).catch(() => undefined)
      throw error
    }

    await this.deps.tasks.recordTaskActivity({
      taskId,
      actorId,
      action: 'task.attachment_uploaded',
      entityType: 'ATTACHMENT',
      entityId: attachment.id,
      metadata: { mimeType, sizeBytes: file.buffer.byteLength },
    })
    this.deps.logger.info(
      { taskId, attachmentId: attachment.id, actorId, mimeType, sizeBytes: file.buffer.byteLength },
      'task attachment uploaded',
    )
    await this.emitTaskChanged(taskId, actorId, 'attachment-uploaded')
    return this.toDto((await this.deps.repository.find(taskId, attachment.id))!)
  }

  async download(taskId: string, attachmentId: string): Promise<AttachmentDownload> {
    const attachment = await this.find(taskId, attachmentId)
    return {
      buffer: await this.deps.storage.get(attachment.storageKey),
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
    }
  }

  async remove(taskId: string, attachmentId: string, actorId: string): Promise<void> {
    const attachment = await this.find(taskId, attachmentId)
    await this.deps.storage.delete(attachment.storageKey)
    await this.deps.repository.softDelete(attachmentId)
    await this.deps.tasks.recordTaskActivity({
      taskId,
      actorId,
      action: 'task.attachment_deleted',
      entityType: 'ATTACHMENT',
      entityId: attachmentId,
    })
    this.deps.logger.info({ taskId, attachmentId, actorId }, 'task attachment deleted')
    await this.emitTaskChanged(taskId, actorId, 'attachment-deleted')
  }

  private async find(taskId: string, attachmentId: string): Promise<AttachmentRow> {
    const attachment = await this.deps.repository.find(taskId, attachmentId)
    if (!attachment) throw notFound('Attachment not found')
    return attachment
  }

  private requireMimeType(value: string): AttachmentMimeType {
    if (!ATTACHMENT_MIME_TYPES.includes(value as AttachmentMimeType)) {
      throw badRequest('Unsupported attachment media type')
    }
    return value as AttachmentMimeType
  }

  private normalizeOriginalName(value: string): string {
    const normalized = path
      .basename(value)
      .replace(/\p{Cc}/gu, '')
      .trim()
    if (!normalized || normalized.length > 255) {
      throw badRequest('Attachment filename must be between 1 and 255 characters')
    }
    return normalized
  }

  private async validateContent(buffer: Buffer, mimeType: AttachmentMimeType): Promise<void> {
    if (mimeType.startsWith('image/')) {
      try {
        const metadata = await sharp(buffer, {
          animated: false,
          limitInputPixels: 40_000_000,
        }).metadata()
        const detected =
          metadata.format === 'jpeg'
            ? 'image/jpeg'
            : metadata.format === 'png'
              ? 'image/png'
              : metadata.format === 'webp'
                ? 'image/webp'
                : null
        if (detected !== mimeType || (metadata.pages ?? 1) !== 1) throw new Error('mismatch')
      } catch {
        throw badRequest('Attachment content must be a valid non-animated image')
      }
      return
    }

    if (mimeType === 'application/pdf') {
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw badRequest('Attachment content must be a valid PDF document')
      }
      return
    }

    try {
      if (buffer.includes(0)) throw new Error('binary')
      new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
      throw badRequest('Text attachments must contain valid UTF-8 text')
    }
  }

  private toDto(attachment: AttachmentRow): AttachmentDto {
    return {
      id: attachment.id,
      taskId: attachment.taskId,
      uploaderId: attachment.uploaderId,
      uploaderName: attachment.uploader.fullName,
      uploaderAvatarKey: attachment.uploader.avatarKey,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt.toISOString(),
    }
  }

  private async emitTaskChanged(taskId: string, actorId: string, reason: string): Promise<void> {
    const task = await this.deps.tasks.findTaskById(taskId)
    if (!task) return
    const payload: ProjectRealtimeEvent = {
      projectId: task.projectId,
      taskId,
      actorId,
      entityId: taskId,
      reason,
    }
    this.deps.realtime?.emitToProject(task.projectId, 'task.updated', payload)
  }
}
