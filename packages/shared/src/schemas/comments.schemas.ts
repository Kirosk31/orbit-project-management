import { z } from 'zod'

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
  parentId: z.string().min(1).nullable().optional(),
  mentionIds: z.array(z.string().min(1)).max(50).optional().default([]),
})

export type CreateCommentDto = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z
  .object({
    body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateCommentDto = z.infer<typeof updateCommentSchema>

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
})

export type ToggleReactionDto = z.infer<typeof toggleReactionSchema>

export interface CommentAuthorDto {
  id: string
  fullName: string
  email: string
  avatarKey: string | null
}

export interface CommentMentionDto {
  id: string
  userId: string
  fullName: string
}

export interface CommentReactionDto {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface CommentDto {
  id: string
  taskId: string
  author: CommentAuthorDto
  body: string
  parentId: string | null
  replyCount: number
  isEdited: boolean
  createdAt: string
  updatedAt: string
  mentions: CommentMentionDto[]
  reactions: CommentReactionDto[]
}
