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
      callback({ task: { findUnique, findMany, update } }),
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
