import type {
  PresenceEvent,
  ProjectRealtimeEvent,
  ProjectRealtimeEventName,
  ProjectSubscriptionResult,
} from '@orbit/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/auth-store'
import { connectRealtime } from './realtime-client'

const TASK_EVENTS: readonly ProjectRealtimeEventName[] = [
  'task.created',
  'task.updated',
  'task.deleted',
  'task.moved',
]
const COMMENT_EVENTS: readonly ProjectRealtimeEventName[] = [
  'comment.created',
  'comment.updated',
  'comment.deleted',
  'comment.reaction_updated',
]

export function useProjectRealtime(projectId: string): string[] {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])

  useEffect(() => {
    if (!projectId || !accessToken) {
      setOnlineUserIds([])
      return
    }

    const socket = connectRealtime(accessToken)
    const subscribe = (): void => {
      socket.emit('subscribe', { projectId }, (result: ProjectSubscriptionResult) => {
        if (result.ok) setOnlineUserIds(result.onlineUserIds ?? [])
      })
    }
    const onPresence = (event: PresenceEvent): void => {
      if (event.projectId !== projectId) return
      setOnlineUserIds((current) => {
        const users = new Set(current)
        if (event.state === 'online') users.add(event.userId)
        else users.delete(event.userId)
        return [...users]
      })
    }
    const onTaskEvent = (event: ProjectRealtimeEvent): void => {
      if (event.projectId !== projectId) return
      void queryClient.invalidateQueries({ queryKey: ['board-tasks'] })
      if (event.taskId) {
        void queryClient.invalidateQueries({ queryKey: ['task', event.taskId] })
        void queryClient.invalidateQueries({ queryKey: ['task-subtasks', event.taskId] })
        void queryClient.invalidateQueries({ queryKey: ['task-activity', event.taskId] })
        void queryClient.invalidateQueries({ queryKey: ['task-checklists', event.taskId] })
        void queryClient.invalidateQueries({ queryKey: ['task-time-entries', event.taskId] })
        void queryClient.invalidateQueries({ queryKey: ['task-attachments', event.taskId] })
      }
    }
    const onCommentEvent = (event: ProjectRealtimeEvent): void => {
      if (event.projectId !== projectId || !event.taskId) return
      void queryClient.invalidateQueries({ queryKey: ['task-comments', event.taskId] })
      void queryClient.invalidateQueries({ queryKey: ['task-activity', event.taskId] })
    }
    const onBoardEvent = (event: ProjectRealtimeEvent): void => {
      if (event.projectId !== projectId) return
      void queryClient.invalidateQueries({ queryKey: ['board'] })
      void queryClient.invalidateQueries({ queryKey: ['board-columns'] })
      void queryClient.invalidateQueries({ queryKey: ['project-boards', projectId] })
    }

    socket.on('connect', subscribe)
    socket.on('presence.updated', onPresence)
    for (const event of TASK_EVENTS) socket.on(event, onTaskEvent)
    for (const event of COMMENT_EVENTS) socket.on(event, onCommentEvent)
    socket.on('board.updated', onBoardEvent)
    if (socket.connected) subscribe()

    return () => {
      socket.emit('unsubscribe', { projectId })
      socket.off('connect', subscribe)
      socket.off('presence.updated', onPresence)
      for (const event of TASK_EVENTS) socket.off(event, onTaskEvent)
      for (const event of COMMENT_EVENTS) socket.off(event, onCommentEvent)
      socket.off('board.updated', onBoardEvent)
      setOnlineUserIds([])
    }
  }, [accessToken, projectId, queryClient])

  return onlineUserIds
}
