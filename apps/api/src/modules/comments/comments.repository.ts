import type { Comment, Prisma, PrismaClient } from '@prisma/client'

export interface CommentRow extends Comment {
  author: {
    id: string
    fullName: string
    email: string
    avatarKey: string | null
  }
  mentions: Array<{
    id: string
    userId: string
    fullName: string
  }>
  reactions: Array<{
    userId: string
    emoji: string
  }>
  replyCount: number
}

export interface CommentsRepository {
  createComment(data: {
    taskId: string
    authorId: string
    body: string
    parentId: string | null
    mentionIds: string[]
  }): Promise<Comment>
  listComments(taskId: string, skip: number, take: number): Promise<CommentRow[]>
  countComments(taskId: string): Promise<number>
  findCommentById(id: string): Promise<CommentRow | null>
  updateComment(id: string, body: string): Promise<Comment>
  softDeleteComment(id: string): Promise<void>
  toggleReaction(commentId: string, userId: string, emoji: string): Promise<boolean>
  countReactions(commentId: string, emoji: string): Promise<number>
}

const COMMENT_INCLUDE = {
  author: { select: { id: true, fullName: true, email: true, avatarKey: true } },
  mentions: {
    include: { user: { select: { id: true, fullName: true } } },
  },
  reactions: { select: { userId: true, emoji: true } },
  _count: { select: { replies: true } },
} satisfies Prisma.CommentInclude

function toCommentRow(
  row: Prisma.CommentGetPayload<{ include: typeof COMMENT_INCLUDE }>,
): CommentRow {
  const { _count, ...rest } = row
  return {
    ...rest,
    author: row.author,
    mentions: row.mentions.map((m) => ({
      id: m.id,
      userId: m.user.id,
      fullName: m.user.fullName,
    })),
    reactions: row.reactions.map((r) => ({ userId: r.userId, emoji: r.emoji })),
    replyCount: _count.replies,
  }
}

export class PrismaCommentsRepository implements CommentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createComment(data: {
    taskId: string
    authorId: string
    body: string
    parentId: string | null
    mentionIds: string[]
  }) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId: data.taskId,
          authorId: data.authorId,
          body: data.body,
          parentId: data.parentId,
        },
      })
      if (data.mentionIds.length > 0) {
        await tx.commentMention.createMany({
          data: data.mentionIds.map((userId) => ({ commentId: comment.id, userId })),
        })
      }
      return comment
    })
  }

  async listComments(taskId: string, skip: number, take: number) {
    const rows = await this.prisma.comment.findMany({
      where: { taskId, deletedAt: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    })
    return rows.map(toCommentRow)
  }

  countComments(taskId: string) {
    return this.prisma.comment.count({ where: { taskId, deletedAt: null } })
  }

  async findCommentById(id: string): Promise<CommentRow | null> {
    const row = await this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: COMMENT_INCLUDE,
    })
    return row ? toCommentRow(row) : null
  }

  updateComment(id: string, body: string) {
    return this.prisma.comment.update({ where: { id }, data: { body, editedAt: new Date() } })
  }

  async softDeleteComment(id: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async toggleReaction(commentId: string, userId: string, emoji: string): Promise<boolean> {
    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
      select: { id: true },
    })
    if (existing) {
      await this.prisma.commentReaction.delete({ where: { id: existing.id } })
      return false
    }
    await this.prisma.commentReaction.create({ data: { commentId, userId, emoji } })
    return true
  }

  countReactions(commentId: string, emoji: string) {
    return this.prisma.commentReaction.count({ where: { commentId, emoji } })
  }
}
