export interface RealtimePublisher {
  emitToUser(userId: string, event: string, payload: unknown): void
  emitToProject(projectId: string, event: string, payload: unknown): void
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
}
