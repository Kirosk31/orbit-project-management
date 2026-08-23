import type { CommentDto, CreateCommentDto, UpdateCommentDto } from '@orbit/shared'

import { api } from '@/lib/api'

export interface CommentListResult {
  rows: CommentDto[]
  total: number
}

export interface ReactionToggleResult {
  reacted: boolean
  count: number
  emoji: string
}

export function listCommentsRequest(taskId: string): Promise<CommentListResult> {
  return api.get<CommentListResult>(`/tasks/${taskId}/comments?page=1&pageSize=100`)
}

export function createCommentRequest(taskId: string, input: CreateCommentDto): Promise<CommentDto> {
  return api.post<CommentDto>(`/tasks/${taskId}/comments`, { body: input })
}

export function updateCommentRequest(
  commentId: string,
  input: UpdateCommentDto,
): Promise<CommentDto> {
  return api.patch<CommentDto>(`/comments/${commentId}`, { body: input })
}

export function deleteCommentRequest(commentId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/comments/${commentId}`)
}

export function toggleReactionRequest(
  commentId: string,
  emoji: string,
): Promise<ReactionToggleResult> {
  return api.post<ReactionToggleResult>(`/comments/${commentId}/reactions`, { body: { emoji } })
}
