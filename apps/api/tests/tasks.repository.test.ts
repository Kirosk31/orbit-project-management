import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient, Task } from '@prisma/client'
import { PrismaTasksRepository } from '../src/modules/tasks/tasks.repository.js'

describe('PrismaTasksRepository.moveTask', () => {
  it('scopes backlog reordering to the task organization and project', async () => {
    const task = {
      id: 'task-a',
      orgId: 'org-a',
      projectId: 'project-a',
      boardId: 'board-a',
      columnId: 'column-a',
      statusId: 'status-a',
    } as Task
    const findUnique = vi.fn(async () => task)
    const findMany = vi.fn(async () => [{ id: 'task-sibling' }])
    const update = vi.fn(async () => task)
    const transaction = vi.fn(async (callback: (tx: unknown) => Promise<Task>) =>
      callback({ task: { findUnique, findMany, update }, $executeRaw: vi.fn(async () => 2) }),
    )
    const prisma = { $transaction: transaction } as unknown as PrismaClient
    const repository = new PrismaTasksRepository(prisma)

    await repository.moveTask(task.id, { boardId: null, columnId: null, statusId: 'status-b' }, 0)

    expect(findMany).toHaveBeenCalledWith({
      where: {
        orgId: task.orgId,
        projectId: task.projectId,
        boardId: null,
        columnId: null,
        parentId: null,
        deletedAt: null,
        isArchived: false,
        id: { not: task.id },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    })
  })
})

describe('PrismaTasksRepository list queries', () => {
  function buildRepository() {
    const card = {
      id: 'task-a',
      title: 'Card',
      status: { name: 'To Do' },
      assignees: [
        {
          id: 'assignee-a',
          user: { id: 'user-a', email: 'a@example.com', fullName: 'A', avatarKey: null },
        },
      ],
      labels: [{ id: 'task-label-a', label: { id: 'label-a', name: 'Bug', color: '#f00' } }],
      subtasks: [{ isCompleted: true }],
    }
    const findMany = vi.fn(async () => [card])
    const count = vi.fn(async () => 1)
    const prisma = {
      task: { findMany, count },
      $transaction: vi.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries)),
    } as unknown as PrismaClient
    return { repository: new PrismaTasksRepository(prisma), findMany }
  }

  it('loads board and project lists without the description', async () => {
    const { repository, findMany } = buildRepository()

    const result = await repository.listTasks('project-a', { archived: false }, 0, 100)

    const query = (findMany.mock.calls[0] as unknown[])[0] as {
      select: Record<string, unknown>
    }
    expect(query.select).toMatchObject({ id: true, title: true, status: expect.anything() })
    expect(query.select).not.toHaveProperty('description')
    expect(query).not.toHaveProperty('include')
    expect(result.rows[0]).toMatchObject({
      statusName: 'To Do',
      assignees: [{ id: 'assignee-a', userId: 'user-a', fullName: 'A' }],
      labels: [{ id: 'task-label-a', labelId: 'label-a', name: 'Bug' }],
    })
  })

  it('loads my open tasks without the description', async () => {
    const { repository, findMany } = buildRepository()

    await repository.listAssignedOpenTasks('org-a', 'user-a', 20)

    const query = (findMany.mock.calls[0] as unknown[])[0] as {
      select: Record<string, unknown>
    }
    expect(query.select).not.toHaveProperty('description')
  })
})
