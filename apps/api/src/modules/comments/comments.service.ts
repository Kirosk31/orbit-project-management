import type {
  CommentDto,
  CreateCommentDto,
  ToggleReactionDto,
  UpdateCommentDto,
  ProjectRealtimeEvent,
} from '@orbit/shared'
import { badRequest, forbidden, notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { CommentRow, CommentsRepository } from './comments.repository.js'
import type { NotificationsService } from '../notifications/notifications.service.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export interface CommentsServiceDependencies {
  repository: CommentsRepository
  tasks: TasksRepository
  organizations: OrganizationsRepository
  notifications: NotificationsService
  realtime?: RealtimePublisher
}

export class CommentsService {
  constructor(private readonly deps: CommentsServiceDependencies) {}

  async createComment(taskId: string, actorId: string, dto: CreateCommentDto): Promise<CommentDto> {
    const task = await this.findTask(taskId)

    if (dto.parentId) {
      const parent = await this.deps.repository.findCommentById(dto.parentId)
      if (!parent || parent.taskId !== task.id) {
        throw badRequest('The parent comment does not belong to this task', { field: 'parentId' })
      }
      if (parent.parentId) {
        throw badRequest('Replies cannot be nested deeper than one level', { field: 'parentId' })
      }
    }

    if (dto.mentionIds.length > 0) {
      await this.verifyOrgMembers(task.orgId, dto.mentionIds)
    }

    const comment = await this.deps.repository.createComment({
      taskId: task.id,
      authorId: actorId,
      body: dto.body,
      parentId: dto.parentId ?? null,
      mentionIds: dto.mentionIds,
    })

    const savedComment = await this.findComment(comment.id)

    if (dto.mentionIds.length > 0) {
      await Promise.all(
        dto.mentionIds.map((userId) =>
          this.deps.notifications.taskMentioned({
            orgId: task.orgId,
            taskId: task.id,
            taskTitle: task.title,
            userId,
          }),
        ),
      )
    }

    const recipients = [
      ...new Set([task.createdById, ...task.assignees.map((assignee) => assignee.userId)]),
    ].filter((userId) => userId !== actorId && !dto.mentionIds.includes(userId))

    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((userId) =>
          this.deps.notifications.taskCommented({
            orgId: task.orgId,
            taskId: task.id,
            taskTitle: task.title,
            userId,
          }),
        ),
      )
    }

    const result = this.toCommentDto(savedComment, actorId)
    this.emitCommentEvent('comment.created', task.projectId, task.id, result.id, actorId)
    return result
  }

  async listComments(
    taskId: string,
    actorId: string,
    query: { page: number; pageSize: number },
  ): Promise<{ rows: CommentDto[]; total: number }> {
    await this.findTask(taskId)
    const skip = (query.page - 1) * query.pageSize
    const [rows, total] = await Promise.all([
      this.deps.repository.listComments(taskId, skip, query.pageSize),
      this.deps.repository.countComments(taskId),
    ])
    return {
      rows: rows.map((row) => this.toCommentDto(row, actorId)),
      total,
    }
  }

  async updateComment(
    commentId: string,
    actorId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const comment = await this.findComment(commentId)
    if (comment.author.id !== actorId) {
      throw forbidden('Only the author can edit a comment')
    }
    const updated = await this.deps.repository.updateComment(comment.id, dto.body)
    const result = this.toCommentDto(await this.findComment(updated.id), actorId)
    const task = await this.findTask(comment.taskId)
    this.emitCommentEvent('comment.updated', task.projectId, task.id, result.id, actorId)
    return result
  }

  async deleteComment(commentId: string, actorId: string, isModerator: boolean): Promise<void> {
    const comment = await this.findComment(commentId)
    if (comment.author.id !== actorId && !isModerator) {
      throw forbidden('Only the author or a moderator can delete a comment')
    }
    await this.deps.repository.softDeleteComment(comment.id)
    const task = await this.findTask(comment.taskId)
    this.emitCommentEvent('comment.deleted', task.projectId, task.id, comment.id, actorId)
  }

  async toggleReaction(
    commentId: string,
    actorId: string,
    dto: ToggleReactionDto,
  ): Promise<{ reacted: boolean; count: number; emoji: string }> {
    const comment = await this.findComment(commentId)
    const reacted = await this.deps.repository.toggleReaction(comment.id, actorId, dto.emoji)
    const count = await this.deps.repository.countReactions(comment.id, dto.emoji)
    const task = await this.findTask(comment.taskId)
    this.emitCommentEvent('comment.reaction_updated', task.projectId, task.id, comment.id, actorId)
    return { reacted, count, emoji: dto.emoji }
  }

  private async verifyOrgMembers(orgId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const membership = await this.deps.organizations.getMembership(orgId, userId)
      if (!membership || !membership.isActive) {
        throw badRequest('One or more mentioned users are not members of this organization', {
          field: 'mentionIds',
        })
      }
    }
  }

  private async findTask(taskId: string) {
    const task = await this.deps.tasks.findTaskById(taskId)
    if (!task) {
      throw notFound('Task not found')
    }
    return task
  }

  private async findComment(commentId: string): Promise<CommentRow> {
    const row = await this.deps.repository.findCommentById(commentId)
    if (!row) {
      throw notFound('Comment not found')
    }
    return row
  }

  private toCommentDto(comment: CommentRow, actorId: string): CommentDto {
    const reactionMap = new Map<string, { count: number; reactedByMe: boolean }>()
    for (const reaction of comment.reactions) {
      const entry = reactionMap.get(reaction.emoji) ?? { count: 0, reactedByMe: false }
      entry.count += 1
      if (reaction.userId === actorId) {
        entry.reactedByMe = true
      }
      reactionMap.set(reaction.emoji, entry)
    }
    return {
      id: comment.id,
      taskId: comment.taskId,
      author: {
        id: comment.author.id,
        fullName: comment.author.fullName,
        email: comment.author.email,
        avatarKey: comment.author.avatarKey,
      },
      body: comment.body,
      parentId: comment.parentId,
      replyCount: comment.replyCount,
      isEdited: comment.editedAt !== null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      mentions: comment.mentions,
      reactions: [...reactionMap.entries()].map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reactedByMe: data.reactedByMe,
      })),
    }
  }

  private emitCommentEvent(
    event: 'comment.created' | 'comment.updated' | 'comment.deleted' | 'comment.reaction_updated',
    projectId: string,
    taskId: string,
    commentId: string,
    actorId: string,
  ): void {
    const payload: ProjectRealtimeEvent = {
      projectId,
      taskId,
      actorId,
      entityId: commentId,
    }
    this.deps.realtime?.emitToProject(projectId, event, payload)
  }
}
