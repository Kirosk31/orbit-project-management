import { describe, expect, it, vi } from 'vitest'
import type {
  NotificationRow,
  NotificationsRepository,
} from '../src/modules/notifications/notifications.repository.js'
import { NotificationsService } from '../src/modules/notifications/notifications.service.js'
import type { RealtimeService } from '../src/modules/realtime/realtime.service.js'

function createFakeRepository(overrides: Partial<NotificationsRepository> = {}) {
  const repository = {
    listForUser: vi.fn(
      async (_userId: string, _options: { skip: number; take: number; unreadOnly: boolean }) => ({
        rows: [],
        total: 0,
      }),
    ),
    countUnread: vi.fn(async (_userId: string) => 0),
    findById: vi.fn(async (_id: string) => null),
    markRead: vi.fn(async (_id: string, _userId: string) => null),
    markAllRead: vi.fn(async (_userId: string) => 0),
    createMany: vi.fn(async (_inputs: unknown[]) => undefined),
    ...overrides,
  }
  return repository
}

function buildService(
  overrides: {
    repository?: Partial<NotificationsRepository>
    realtime?: Partial<RealtimeService>
  } = {},
) {
  const repository = createFakeRepository(overrides.repository)
  const service = new NotificationsService({
    repository,
    realtime: overrides.realtime as RealtimeService,
  })
  return { repository, service }
}

describe('NotificationsService', () => {
  it('lists notifications with pagination', async () => {
    const { repository, service } = buildService({
      repository: {
        listForUser: vi.fn(
          async (
            _userId: string,
            _options: { skip: number; take: number; unreadOnly: boolean },
          ) => ({
            rows: [
              {
                id: 'n1',
                userId: 'user-1',
                orgId: 'org-1',
                orgName: null,
                isRead: false,
                createdAt: new Date(),
                type: 'TASK_ASSIGNED',
                title: 'T',
                body: null,
                linkUrl: null,
                metadata: null,
                readAt: null,
              } as NotificationRow,
            ],
            total: 1,
          }),
        ),
      },
    })

    const result = await service.list('user-1', { page: 1, pageSize: 10, unreadOnly: false })
    expect(repository.listForUser).toHaveBeenCalled()
    expect(result.total).toBe(1)
    expect(result.rows[0]!.id).toBe('n1')
  })

  it('returns unread count', async () => {
    const { repository, service } = buildService({
      repository: { countUnread: vi.fn(async () => 5) },
    })
    const count = await service.unreadCount('user-2')
    expect(repository.countUnread).toHaveBeenCalledWith('user-2')
    expect(count).toBe(5)
  })

  it('markRead returns the existing notification when no database update occurs', async () => {
    const row = {
      id: 'n1',
      userId: 'user-1',
      orgId: 'org-1',
      orgName: null,
      type: 'TASK_ASSIGNED',
      title: 'Assigned',
      body: null,
      linkUrl: null,
      metadata: null,
      isRead: false,
      readAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    } as NotificationRow
    const { service } = buildService({
      repository: {
        findById: vi.fn(async (_id: string) => row),
        markRead: vi.fn(async (_id: string, _userId: string) => null),
      },
    })

    const res = await service.markRead('n1', 'user-1')
    expect(res).toEqual({
      id: 'n1',
      type: 'TASK_ASSIGNED',
      title: 'Assigned',
      body: null,
      linkUrl: null,
      metadata: null,
      isRead: false,
      readAt: null,
      createdAt: row.createdAt.toISOString(),
    })
  })

  it('markRead returns iso readAt when updated', async () => {
    const now = new Date()
    const row = {
      id: 'n1',
      userId: 'user-1',
      orgId: 'org-1',
      orgName: null,
      type: 'TASK_ASSIGNED',
      title: 'Assigned',
      body: null,
      linkUrl: null,
      metadata: null,
      isRead: false,
      readAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    } as NotificationRow
    const { service } = buildService({
      repository: {
        findById: vi.fn(async (_id: string) => row),
        markRead: vi.fn(async (_id: string, _userId: string) => ({ isRead: true, readAt: now })),
      },
    })

    const res = await service.markRead('n1', 'user-1')
    expect(res).toEqual({
      id: 'n1',
      type: 'TASK_ASSIGNED',
      title: 'Assigned',
      body: null,
      linkUrl: null,
      metadata: null,
      isRead: true,
      readAt: now.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })
  })

  it('markAllRead delegates and returns updated count', async () => {
    const { service } = buildService({
      repository: { markAllRead: vi.fn(async (_userId: string) => 3) },
    })
    const result = await service.markAllRead('user-1')
    expect(result).toEqual({ marked: 3 })
  })

  it('notifies task assignment through the repository', async () => {
    const { repository, service } = buildService()
    await service.taskAssigned({
      userId: 'u',
      orgId: 'org-1',
      taskId: 'task-1',
      taskTitle: 'Assigned',
    })
    expect(repository.createMany).toHaveBeenCalled()
  })

  it('emits realtime notification updates when a notification is created', async () => {
    const emitToUser = vi.fn()
    const { service } = buildService({ realtime: { emitToUser } })
    await service.taskAssigned({
      userId: 'u',
      orgId: 'org-1',
      taskId: 'task-1',
      taskTitle: 'Assigned',
    })
    expect(emitToUser).toHaveBeenCalledWith('u', 'notifications.updated', expect.any(Object))
  })
})
