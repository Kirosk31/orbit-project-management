import { describe, expect, it, vi } from 'vitest'
import type { Board, Column, TaskStatus } from '@prisma/client'
import { isAppError } from '../src/core/errors/index.js'
import { BoardsService } from '../src/modules/boards/boards.service.js'
import type { BoardsRepository } from '../src/modules/boards/boards.repository.js'

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'board-1',
    projectId: 'project-1',
    name: 'Sprint Board',
    description: null,
    position: 0,
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
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
    wipLimit: 3,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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
    isClosed: false,
    isDefault: false,
    isSystem: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function createFakeRepository(overrides: Partial<BoardsRepository> = {}) {
  const repository: BoardsRepository = {
    createBoard: vi.fn(async (_projectId, data) => makeBoard(data as Partial<Board>)),
    findBoardById: vi.fn(async () => makeBoard()),
    updateBoard: vi.fn(async (_id, data) => makeBoard(data as Partial<Board>)),
    softDeleteBoard: vi.fn(async () => undefined),
    setBoardArchived: vi.fn(async (id, isArchived) => makeBoard({ isArchived })),
    listBoards: vi.fn(async () => []),
    listColumns: vi.fn(async () => []),
    findColumnById: vi.fn(async () => makeColumn()),
    createColumn: vi.fn(async (_boardId, data) => makeColumn(data as Partial<Column>)),
    updateColumn: vi.fn(async (_id, data) => makeColumn(data as Partial<Column>)),
    deleteColumn: vi.fn(async () => undefined),
    moveColumn: vi.fn(async () => undefined),
    findOrgStatusById: vi.fn(async () => null),
    findOrgStatusByName: vi.fn(async () => null),
    findDefaultStatus: vi.fn(async () => null),
    createOrgStatus: vi.fn(async () => makeStatus()),
    recordActivity: vi.fn(async () => undefined),
    ...overrides,
  }
  return repository
}

function buildService(overrides: Partial<BoardsRepository> = {}) {
  const repository = createFakeRepository(overrides)
  const service = new BoardsService({ repository })
  return { service, repository }
}

describe('BoardsService', () => {
  it('creates a board and records activity', async () => {
    const { service, repository } = buildService()

    const board = await service.createBoard('project-1', 'org-1', 'user-1', {
      name: 'Sprint',
      description: '',
    })

    expect(repository.createBoard).toHaveBeenCalledWith('project-1', {
      name: 'Sprint',
      description: '',
    })
    expect(repository.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'board.created' }),
    )
    expect(board).toMatchObject({ name: 'Sprint', columnCount: 0 })
  })

  it('throws NOT_FOUND for missing boards', async () => {
    const { service } = buildService({ findBoardById: vi.fn(async () => null) })

    const error = await service.getBoard('nope').catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('NOT_FOUND')
  })

  it('creates a status when none exists for the column', async () => {
    const { service, repository } = buildService()

    await service.createColumn('board-1', 'org-1', 'user-1', {
      name: 'Backlog',
      wipLimit: 5,
    })

    expect(repository.createOrgStatus).toHaveBeenCalledWith('org-1', {
      name: 'Backlog',
      color: '#94a3b8',
      position: 0,
    })
    expect(repository.createColumn).toHaveBeenCalledWith(
      'board-1',
      expect.objectContaining({
        name: 'Backlog',
        wipLimit: 5,
        position: 0,
        statusId: 'status-1',
      }),
    )
  })

  it('prefers an existing status by name', async () => {
    const status = makeStatus({ id: 'status-existing', name: 'Backlog' })
    const { service, repository } = buildService({
      findOrgStatusByName: vi.fn(async () => status),
    })

    await service.createColumn('board-1', 'org-1', 'user-1', { name: 'Backlog' })

    expect(repository.createOrgStatus).not.toHaveBeenCalled()
    expect(repository.createColumn).toHaveBeenCalledWith(
      'board-1',
      expect.objectContaining({ statusId: 'status-existing' }),
    )
  })

  it('rejects a status already used by another column on the board', async () => {
    const status = makeStatus()
    const { service } = buildService({
      findOrgStatusById: vi.fn(async () => status),
      listColumns: vi.fn(async () => [
        {
          ...makeColumn(),
          statusName: 'To Do',
          taskCount: 0,
        },
      ]),
    })

    const error = await service
      .createColumn('board-1', 'org-1', 'user-1', { name: 'To Do', statusId: 'status-1' })
      .catch((e) => e)
    expect(isAppError(error)).toBe(true)
    expect(error.code).toBe('CONFLICT')
  })

  it('rejects a status from another organization', async () => {
    const { service } = buildService({ findOrgStatusById: vi.fn(async () => null) })

    const error = await service
      .createColumn('board-1', 'org-1', 'user-1', { name: 'X', statusId: 'foreign' })
      .catch((e) => e)
    expect(error.code).toBe('BAD_REQUEST')
  })

  it('moves a column and records activity', async () => {
    const { service, repository } = buildService()

    await service.moveColumn('column-1', 'org-1', 'user-1', { toPosition: 2 })

    expect(repository.moveColumn).toHaveBeenCalledWith('column-1', 2)
    expect(repository.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'board.column_moved' }),
    )
  })

  it('returns board and column DTOs with ISO dates', async () => {
    const { service } = buildService()

    const board = await service.getBoard('board-1')
    expect(board.createdAt).toBe('2026-01-01T00:00:00.000Z')

    const columns = await service.listColumns('board-1')
    expect(columns).toEqual([])
  })
})
