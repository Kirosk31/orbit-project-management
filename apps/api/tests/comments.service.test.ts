import { describe, expect, it, vi } from 'vitest'
import type { Comment } from '@prisma/client'
import type { OrganizationsRepository } from '../src/modules/organizations/organizations.repository.js'
import type { TaskRow, TasksRepository } from '../src/modules/tasks/tasks.repository.js'
import type { CommentsRepository } from '../src/modules/comments/comments.repository.js'
import type { NotificationsService } from '../src/modules/notifications/notifications.service.js'
import { CommentsService } from '../src/modules/comments/comments.service.js'
import { isAppError } from '../src/core/errors/index.js'

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    taskId: 'task-1',
    authorId: 'user-1',
    parentId: null,
    body: 'Hello',
    editedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeCommentRow(overrides: Partial<Comment> = {}) {
  const comment = makeComment(overrides)
  return {
    ...comment,
    author: {
      id: comment.authorId,
      fullName: 'Owner',
      email: 'owner@orbit.app',
      avatarKey: null,
    },
    mentions: [],
    reactions: [],
    replyCount: 0,
  }
}

function makeTaskRow(overrides: Partial<Comment> = {}) {
  return {
    id: 'task-1',
    orgId: 'org-1',
    projectId: 'project-1',
    columnId: 'column-1',
    statusId: 'status-1',
    title: 'Task',
    description: null,
    priority: 'MEDIUM',
    dueDate: null,
    archived: false,
    position: 0,
    statusName: 'To Do',
    assignees: [],
    labels: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function createFakeRepository(overrides: Partial<CommentsRepository> = {}): CommentsRepository {
  const repository: CommentsRepository = {
    createComment: vi.fn(async (_data) => makeComment()),
    listComments: vi.fn(async () => []),
    countComments: vi.fn(async () => 0),
    findCommentById: vi.fn(async () => makeCommentRow()),
    updateComment: vi.fn(async (_id, _body) => makeComment()),
    softDeleteComment: vi.fn(async () => undefined),
    toggleReaction: vi.fn(async () => true),
    countReactions: vi.fn(async () => 1),
    ...overrides,
  }
  return repository
}

function createFakeNotifications(
  overrides: Partial<NotificationsService> = {},
): NotificationsService {
  const notifications: NotificationsService = {
    taskAssigned: vi.fn(async () => undefined),
    taskStatusChanged: vi.fn(async () => undefined),
    taskMentioned: vi.fn(async () => undefined),
    taskCommented: vi.fn(async () => undefined),
    invitation: vi.fn(async () => undefined),
    list: vi.fn(async () => ({ rows: [], total: 0 })),
    unreadCount: vi.fn(async () => 0),
    markRead: vi.fn(async () => null as never),
    markAllRead: vi.fn(async () => ({ marked: 0 })),
    ...overrides,
  } as unknown as NotificationsService
  return notifications
}

function buildService(
  overrides: {
    repository?: Partial<CommentsRepository>
    tasks?: Partial<TasksRepository>
    organizations?: Partial<OrganizationsRepository>
    notifications?: Partial<NotificationsService>
  } = {},
) {
  const repository = createFakeRepository(overrides.repository)
  const tasks = {
    findTaskById: vi.fn(async () => makeTaskRow()),
    ...overrides.tasks,
  } as unknown as TasksRepository
  const organizations = {
    getMembership: vi.fn(async () => ({ isActive: true })),
    ...overrides.organizations,
  } as unknown as OrganizationsRepository
  const notifications = createFakeNotifications(overrides.notifications)
  return {
    repository,
    tasks,
    organizations,
    notifications,
    service: new CommentsService({ repository, tasks, organizations, notifications }),
  }
}

describe('CommentsService', () => {
  it('creates a comment and returns its DTO', async () => {
    const { repository, service } = buildService()

    const result = await service.createComment('task-1', 'user-1', {
      body: 'Hello',
      mentionIds: [],
    })

    expect(repository.createComment).toHaveBeenCalledWith({
      taskId: 'task-1',
      authorId: 'user-1',
      body: 'Hello',
      parentId: null,
      mentionIds: [],
    })
    expect(result.body).toBe('Hello')
    expect(result.reactions).toEqual([])
  })

  it('sends mention and comment notifications when commenting with mentions', async () => {
    const notifications = createFakeNotifications({
      taskMentioned: vi.fn(async () => undefined),
      taskCommented: vi.fn(async () => undefined),
    })
    const { service } = buildService({
      notifications,
      tasks: {
        findTaskById: vi.fn(
          async () =>
            ({
              ...makeTaskRow(),
              createdById: 'user-3',
              assignees: [
                {
                  id: 'assignee-1',
                  userId: 'user-4',
                  email: 'assignee@orbit.app',
                  fullName: 'Assignee',
                  avatarKey: null,
                },
              ],
            }) as unknown as TaskRow,
        ),
      },
      repository: {
        createComment: vi.fn(async () => makeComment()),
        findCommentById: vi.fn(async () => makeCommentRow()),
      },
    })

    await service.createComment('task-1', 'user-1', {
      body: 'Ping @assignee',
      mentionIds: ['user-2'],
    })

    expect(notifications.taskMentioned).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'Task',
        userId: 'user-2',
      }),
    )
    expect(notifications.taskCommented).toHaveBeenCalledTimes(2)
    expect(notifications.taskCommented).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'Task',
        userId: 'user-4',
      }),
    )
    expect(notifications.taskCommented).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'Task',
        userId: 'user-3',
      }),
    )
  })

  it('throws 404 when the task is missing', async () => {
    const { service } = buildService({
      tasks: { findTaskById: vi.fn(async () => null) },
    })

    const error = await service
      .createComment('nope', 'user-1', { body: 'x', mentionIds: [] })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('NOT_FOUND')
  })

  it('rejects a parent comment from another task', async () => {
    const { service } = buildService({
      repository: {
        findCommentById: vi.fn(async () => makeCommentRow({ id: 'other', taskId: 'task-9' })),
      },
    })

    const error = await service
      .createComment('task-1', 'user-1', { body: 'x', parentId: 'other', mentionIds: [] })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'parentId' })
  })

  it('rejects nesting replies deeper than one level', async () => {
    const { service } = buildService({
      repository: {
        findCommentById: vi.fn(async () =>
          makeCommentRow({ id: 'reply', parentId: 'top', taskId: 'task-1' }),
        ),
      },
    })

    const error = await service
      .createComment('task-1', 'user-1', { body: 'x', parentId: 'reply', mentionIds: [] })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'parentId' })
  })

  it('rejects mentions of non-members', async () => {
    const { service } = buildService({
      organizations: { getMembership: vi.fn(async () => null) },
    })

    const error = await service
      .createComment('task-1', 'user-1', { body: 'x', mentionIds: ['user-x'] })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'mentionIds' })
  })

  it('denies editing a comment by a non-author', async () => {
    const { service } = buildService({
      repository: {
        findCommentById: vi.fn(async () => makeCommentRow({ authorId: 'user-2' })),
      },
    })

    const error = await service
      .updateComment('comment-1', 'user-1', { body: 'hijack' })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('FORBIDDEN')
  })

  it('allows the author to edit', async () => {
    const { repository, service } = buildService()

    const result = await service.updateComment('comment-1', 'user-1', { body: 'new' })

    expect(repository.updateComment).toHaveBeenCalledWith('comment-1', 'new')
    expect(result.isEdited).toBe(false)
  })

  it('denies deletion to a non-author non-moderator', async () => {
    const { service } = buildService({
      repository: {
        findCommentById: vi.fn(async () => makeCommentRow({ authorId: 'user-2' })),
      },
    })

    const error = await service.deleteComment('comment-1', 'user-1', false).catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('FORBIDDEN')
  })

  it('allows moderators to delete any comment', async () => {
    const { repository, service } = buildService({
      repository: {
        findCommentById: vi.fn(async () => makeCommentRow({ authorId: 'user-2' })),
      },
    })

    await service.deleteComment('comment-1', 'user-1', true)

    expect(repository.softDeleteComment).toHaveBeenCalledWith('comment-1')
  })

  it('toggles a reaction and returns count', async () => {
    const { repository, service } = buildService({
      repository: {
        toggleReaction: vi.fn(async () => false),
        countReactions: vi.fn(async () => 2),
      },
    })

    const result = await service.toggleReaction('comment-1', 'user-1', { emoji: '🔥' })

    expect(repository.toggleReaction).toHaveBeenCalledWith('comment-1', 'user-1', '🔥')
    expect(result).toEqual({ reacted: false, count: 2, emoji: '🔥' })
  })
})
