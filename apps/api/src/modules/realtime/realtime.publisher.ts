export interface RealtimePublisher {
  emitToUser(userId: string, event: string, payload: unknown): void
  emitToProject(projectId: string, event: string, payload: unknown): void
  disconnectUser(userId: string): void
  disconnectSession(sessionId: string): void
}

export class DeferredRealtimePublisher implements RealtimePublisher {
  private target?: RealtimePublisher

  bind(target: RealtimePublisher): void {
    this.target = target
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.target?.emitToUser(userId, event, payload)
  }

  emitToProject(projectId: string, event: string, payload: unknown): void {
    this.target?.emitToProject(projectId, event, payload)
  }

  disconnectUser(userId: string): void {
    this.target?.disconnectUser(userId)
  }

  disconnectSession(sessionId: string): void {
    this.target?.disconnectSession(sessionId)
  }
}
