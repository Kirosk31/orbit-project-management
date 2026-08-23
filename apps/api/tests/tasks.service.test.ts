import { describe, expect, it, vi } from 'vitest'
import type { Column, Label, Task, TaskStatus } from '@prisma/client'
import type {
  OrganizationsRepository,
  OrgMembership,
} from '../src/modules/organizations/organizations.repository.js'
import type { BoardsRepository } from '../src/modules/boards/boards.repository.js'
import type { TasksRepository } from '../src/modules/tasks/tasks.repository.js'
import type { NotificationsService } from '../src/modules/notifications/notifications.service.js'
import { TasksService } from '../src/modules/tasks/tasks.service.js'
import { isAppError } from '../src/core/errors/index.js'
import type { RealtimePublisher } from '../src/modules/realtime/realtime.publisher.js'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    orgId: 'org-1',
    projectId: 'project-1',
    boardId: 'board-1',
    columnId: 'column-1',
    statusId: 'status-1',
    parentId: null,
    createdById: 'user-1',
    title: 'A task',
    description: null,
    priority: 'NONE',
    dueDate: null,
    estimatedHours: null,
    trackedSeconds: 0,
    position: 0,
    isArchived: false,
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeTaskRow(overrides: Partial<Task> = {}) {
  const task = makeTask(overrides)
  return {
    ...task,
    statusName: 'To Do',
    assignees: [],
    labels: [],
    subtasks: [],
  }
}

function makeColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: 'column-1',
    boardId: 'board-1',
    statusId: 'status-1',
    name: 'To Do',
    color: '#0ea5e9',
    position: 0,
    wipLimit: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function makeStatus(overrides: Partial<TaskStatus> = {}): TaskStatus {
  return {
    id: 'status-1',
    orgId: 'org-1',
    name: 'To Do',
    color: '#0ea5e9',
    position: 0,
    isSystem: true,
    isDefault: true,
    isClosed: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'label-1',
    orgId: 'org-1',
    name: 'Bug',
    color: '#ef4444',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

function createFakeRepository(overrides: Partial<TasksRepository> = {}): TasksRepository {
  const repository: TasksRepository = {
    createTask: vi.fn(async (data) => makeTask(data as Partial<Task>)),
    findTaskById: vi.fn(async () => makeTaskRow()),
    listSubtasks: vi.fn(async () => []),
    countSubtasks: vi.fn(async () => 0),
    updateTask: vi.fn(async (_id, data) => makeTask(data as Partial<Task>)),
    softDeleteTask: vi.fn(async () => undefined),
    listTasks: vi.fn(async () => ({ rows: [], total: 0 })),
    countTasksInColumn: vi.fn(async () => 0),
    countTasksInProject: vi.fn(async () => 0),
    moveTask: vi.fn(async () => makeTask()),
    addAssignee: vi.fn(async () => undefined),
    removeAssignee: vi.fn(async () => undefined),
    addLabel: vi.fn(async () => undefined),
    removeLabel: vi.fn(async () => undefined),
    listLabels: vi.fn(async () => []),
    findLabelById: vi.fn(async () => makeLabel()),
    createLabel: vi.fn(async (_orgId, data) => makeLabel(data as Partial<Label>)),
    updateLabel: vi.fn(async (_id, data) => makeLabel(data as Partial<Label>)),
    softDeleteLabel: vi.fn(async () => undefined),
    listTaskActivity: vi.fn(async () => []),
    recordTaskActivity: vi.fn(async () => undefined),
    ...overrides,
  }
  return repository
}

function createFakeBoards(overrides: Partial<BoardsRepository> = {}): BoardsRepository {
  const boards: BoardsRepository = {
    createBoard: vi.fn(async () => null as never),
    findBoardById: vi.fn(async () => ({ id: 'board-1', projectId: 'project-1' }) as never),
    updateBoard: vi.fn(async () => null as never),
    softDeleteBoard: vi.fn(async () => undefined),
    setBoardArchived: vi.fn(async () => null as never),
    listBoards: vi.fn(async () => []),
    listColumns: vi.fn(async () => []),
    findColumnById: vi.fn(async () => makeColumn()),
    createColumn: vi.fn(async () => null as never),
    updateColumn: vi.fn(async () => null as never),
    deleteColumn: vi.fn(async () => undefined),
    moveColumn: vi.fn(async () => undefined),
    findOrgStatusById: vi.fn(async () => makeStatus()),
    findOrgStatusByName: vi.fn(async () => null),
    findDefaultStatus: vi.fn(async () => null),
    createOrgStatus: vi.fn(async () => makeStatus()),
    recordActivity: vi.fn(async () => undefined),
    ...overrides,
  }
  return boards
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
    repository?: Partial<TasksRepository>
    boards?: Partial<BoardsRepository>
    organizations?: Partial<OrganizationsRepository>
    notifications?: Partial<NotificationsService>
    realtime?: Partial<RealtimePublisher>
  } = {},
) {
  const repository = createFakeRepository(overrides.repository)
  const boards = createFakeBoards(overrides.boards)
  const organizations = {
    getMembership: vi.fn(async () => null),
    ...overrides.organizations,
  } as unknown as OrganizationsRepository
  const notifications = createFakeNotifications(overrides.notifications)
  const realtime = {
    emitToUser: vi.fn(),
    emitToProject: vi.fn(),
    ...overrides.realtime,
  } satisfies RealtimePublisher
  return {
    repository,
    boards,
    organizations,
    notifications,
    realtime,
    service: new TasksService({ repository, boards, organizations, notifications, realtime }),
  }
}

describe('TasksService', () => {
  it('creates a task with resolved status and position from its column', async () => {
    const { repository, boards, service } = buildService({
      boards: { findColumnById: vi.fn(async () => makeColumn()) },
      repository: { countTasksInColumn: vi.fn(async () => 3) },
    })

    const result = await service.createTask('project-1', 'org-1', 'user-1', {
      title: 'New task',
      description: '',
      priority: 'HIGH',
      assigneeIds: [],
      labelIds: [],
      columnId: 'column-1',
    })

    expect(boards.findColumnById).toHaveBeenCalledWith('column-1')
    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'column-1', statusId: 'status-1', position: 3 }),
      [],
      [],
    )
    expect(result.title).toBe('A task')
    expect(result.statusName).toBe('To Do')
  })

  it('publishes task changes only to the task project room', async () => {
    const emitToProject = vi.fn()
    const { service } = buildService({ realtime: { emitToProject } })

    await service.updateTask('task-1', 'org-1', 'user-1', { title: 'Realtime title' })

    expect(emitToProject).toHaveBeenCalledWith(
      'project-1',
      'task.updated',
      expect.objectContaining({
        projectId: 'project-1',
        actorId: 'user-1',
        taskId: 'task-1',
      }),
    )
  })

  it('sends assignment notifications when creating a task with assignees', async () => {
    const notifications = createFakeNotifications({
      taskAssigned: vi.fn(async () => undefined),
    })
    const { service } = buildService({
      repository: { countTasksInColumn: vi.fn(async () => 0) },
      organizations: {
        getMembership: vi.fn(
          async (): Promise<OrgMembership | null> =>
            ({
              id: 'membership-1',
              orgId: 'org-1',
              userId: 'user-1',
              roleId: 'role-1',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              role: {
                key: 'ADMIN',
                name: 'Admin',
                isSystem: true,
                permissions: [],
              },
            }) as OrgMembership,
        ),
      },
      notifications,
    })

    await service.createTask('project-1', 'org-1', 'user-1', {
      title: 'Assigned task',
      description: '',
      priority: 'NONE',
      assigneeIds: ['user-2'],
      labelIds: [],
      columnId: 'column-1',
    })

    expect(notifications.taskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'Assigned task',
        userId: 'user-2',
      }),
    )
  })

  it('sends an assignment notification when adding an assignee', async () => {
    const notifications = createFakeNotifications({
      taskAssigned: vi.fn(async () => undefined),
    })
    const { service } = buildService({
      organizations: {
        getMembership: vi.fn(
          async (): Promise<OrgMembership | null> =>
            ({
              id: 'membership-1',
              orgId: 'org-1',
              userId: 'user-1',
              roleId: 'role-1',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              role: {
                key: 'ADMIN',
                name: 'Admin',
                isSystem: true,
                permissions: [],
              },
            }) as OrgMembership,
        ),
      },
      notifications,
      repository: { findTaskById: vi.fn(async () => makeTaskRow()) },
    })

    await service.addAssignee('task-1', 'user-2', 'user-1')

    expect(notifications.taskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'A task',
        userId: 'user-2',
      }),
    )
  })

  it('notifies assignees when a task status changes', async () => {
    const notifications = createFakeNotifications({
      taskStatusChanged: vi.fn(async () => undefined),
    })
    const { service } = buildService({
      notifications,
      repository: {
        findTaskById: vi.fn(async () => ({
          ...makeTaskRow(),
          assignees: [
            {
              id: 'task-assignee-1',
              userId: 'user-2',
              email: 'assignee@orbit.app',
              fullName: 'Assignee',
              avatarKey: null,
            },
          ],
        })),
      },
      boards: { findOrgStatusById: vi.fn(async () => ({ ...makeStatus(), name: 'In Progress' })) },
    })

    await service.moveTask('task-1', 'org-1', 'user-1', { statusId: 'status-2' })

    expect(notifications.taskStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        taskId: 'task-1',
        taskTitle: 'A task',
        statusName: 'In Progress',
        userId: 'user-2',
      }),
    )
  })

  it('scopes a board task list to the requested board', async () => {
    const { repository, service } = buildService()

    await service.listBoardTasks('board-1', { page: 1, pageSize: 50, archived: false })

    expect(repository.listTasks).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ boardId: 'board-1' }),
      0,
      50,
    )
  })

  it('creates a one-level subtask that inherits tenant, project and status', async () => {
    const { repository, service } = buildService({
      repository: { countSubtasks: vi.fn(async () => 2) },
    })

    await service.createSubtask('task-1', 'user-1', {
      title: 'Child task',
      description: '',
      priority: 'MEDIUM',
      assigneeIds: [],
      labelIds: [],
    })

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        projectId: 'project-1',
        parentId: 'task-1',
        boardId: null,
        columnId: null,
        statusId: 'status-1',
        position: 2,
      }),
      [],
      [],
    )
  })

  it('rejects nested subtasks', async () => {
    const { service } = buildService({
      repository: { findTaskById: vi.fn(async () => makeTaskRow({ parentId: 'task-parent' })) },
    })

    await expect(
      service.createSubtask('task-child', 'user-1', {
        title: 'Nested task',
        description: '',
        priority: 'NONE',
        assigneeIds: [],
        labelIds: [],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rejects moving a subtask onto a board', async () => {
    const { service } = buildService({
      repository: { findTaskById: vi.fn(async () => makeTaskRow({ parentId: 'task-parent' })) },
    })

    await expect(
      service.moveTask('task-child', 'org-1', 'user-1', { columnId: 'column-1' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('clears board and column ownership when moving to an unplaced status', async () => {
    const { repository, service } = buildService({
      boards: { findOrgStatusById: vi.fn(async () => makeStatus({ id: 'status-2' })) },
    })

    await service.moveTask('task-1', 'org-1', 'user-1', { statusId: 'status-2' })

    expect(repository.moveTask).toHaveBeenCalledWith(
      'task-1',
      { boardId: null, columnId: null, statusId: 'status-2' },
      undefined,
    )
  })

  it('falls back to the default status when no column is given', async () => {
    const { boards, service } = buildService({
      boards: { findDefaultStatus: vi.fn(async () => makeStatus()) },
    })

    await service.createTask('project-1', 'org-1', 'user-1', {
      title: 'No column',
      description: '',
      priority: 'NONE',
      assigneeIds: [],
      labelIds: [],
    })

    expect(boards.findDefaultStatus).toHaveBeenCalledWith('org-1')
  })

  it('rejects a column from another project', async () => {
    const { service } = buildService({
      boards: {
        findColumnById: vi.fn(async () => makeColumn()),
        findBoardById: vi.fn(async () => ({ id: 'board-x', projectId: 'project-2' }) as never),
      },
    })

    const promise = service.createTask('project-1', 'org-1', 'user-1', {
      title: 'Bad column',
      description: '',
      priority: 'NONE',
      assigneeIds: [],
      labelIds: [],
      columnId: 'column-1',
    })

    const error = await promise.catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'columnId' })
  })

  it('throws 404 when the task does not exist', async () => {
    const { service } = buildService({
      repository: { findTaskById: vi.fn(async () => null) },
    })

    const error = await service.getTask('missing').catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('NOT_FOUND')
  })

  it('rejects a status from another organization', async () => {
    const { service } = buildService({
      boards: { findOrgStatusById: vi.fn(async () => null) },
    })

    const promise = service.createTask('project-1', 'org-1', 'user-1', {
      title: 'Bad status',
      description: '',
      priority: 'NONE',
      assigneeIds: [],
      labelIds: [],
      statusId: 'status-x',
    })

    const error = await promise.catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'statusId' })
  })

  it('rejects creating a duplicate label name case-insensitively', async () => {
    const { service } = buildService({
      repository: { listLabels: vi.fn(async () => [{ ...makeLabel(), taskCount: 0 }]) },
    })

    const error = await service
      .createLabel('org-1', { name: 'bug', color: '#ef4444' })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('CONFLICT')
    expect(error.details).toMatchObject({ field: 'name' })
  })

  it('rejects assignees that are not org members', async () => {
    const { service } = buildService({
      boards: { findDefaultStatus: vi.fn(async () => makeStatus()) },
      organizations: { getMembership: vi.fn(async () => null) },
    })

    const promise = service.createTask('project-1', 'org-1', 'user-1', {
      title: 'Bad assignee',
      description: '',
      priority: 'NONE',
      assigneeIds: ['user-x'],
      labelIds: [],
    })

    const error = await promise.catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'assigneeIds' })
  })

  it('rejects a move to a column of another project', async () => {
    const { service } = buildService({
      boards: {
        findColumnById: vi.fn(async () => makeColumn()),
        findBoardById: vi.fn(async () => ({ id: 'board-x', projectId: 'project-2' }) as never),
      },
    })

    const promise = service.moveTask('task-1', 'org-1', 'user-1', {
      columnId: 'column-1',
    })

    const error = await promise.catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'columnId' })
  })

  it('rejects assigning a user who is not an org member', async () => {
    const { service } = buildService({
      organizations: { getMembership: vi.fn(async () => null) },
    })

    const error = await service.addAssignee('task-1', 'user-x', 'user-1').catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toMatchObject({ field: 'userId' })
  })
})
