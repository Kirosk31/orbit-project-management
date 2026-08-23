import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/auth-store'
import { connectRealtime, disconnectRealtime } from './realtime-client'

export function useRealtime(): void {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const authStatus = useAuthStore((state) => state.status)

  useEffect(() => {
    if (authStatus !== 'authenticated' || !accessToken) {
      disconnectRealtime()
      return
    }

    const socket = connectRealtime(accessToken)

    const handleNotificationsUpdated = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('notifications.updated', handleNotificationsUpdated)

    return () => {
      socket.off('notifications.updated', handleNotificationsUpdated)
      disconnectRealtime()
    }
  }, [accessToken, authStatus, queryClient])
}
