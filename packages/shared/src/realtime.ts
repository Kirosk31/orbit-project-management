export type ProjectRealtimeEventName =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.moved'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'comment.reaction_updated'
  | 'board.updated'

export interface ProjectRealtimeEvent {
  projectId: string
  actorId: string
  entityId: string
  taskId?: string
  reason?: string
}

export interface PresenceEvent {
  projectId: string
  userId: string
  state: 'online' | 'offline'
}

export interface ProjectSubscriptionResult {
  ok: boolean
  error?: 'INVALID_PAYLOAD' | 'FORBIDDEN' | 'SUBSCRIPTION_LIMIT' | 'RATE_LIMITED' | 'INTERNAL_ERROR'
  onlineUserIds?: string[]
}
