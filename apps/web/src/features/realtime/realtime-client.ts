import { io, type Socket } from 'socket.io-client'
import { env } from '@/lib/env'

let socket: Socket | null = null

export function connectRealtime(accessToken: string): Socket {
  if (socket) {
    socket.auth = { token: accessToken }
    if (!socket.connected) socket.connect()
    return socket
  }

  const socketOrigin = env.VITE_API_URL.startsWith('http')
    ? new URL(env.VITE_API_URL).origin
    : window.location.origin
  socket = io(socketOrigin, {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: true,
  })

  return socket
}

export function disconnectRealtime(): void {
  socket?.disconnect()
  socket = null
}

export function getRealtimeSocket(): Socket | null {
  return socket
}
