import type { Board, Column, TaskStatus } from '@prisma/client'
import type {
  BoardDto,
  ColumnDto,
  CreateBoardDto,
  CreateColumnDto,
  MoveColumnDto,
  ProjectRealtimeEvent,
  UpdateBoardDto,
  UpdateColumnDto,
} from '@orbit/shared'
import { badRequest, conflict, notFound } from '../../core/errors/index.js'
import type { BoardsRepository } from './boards.repository.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export interface BoardsServiceDependencies {
  repository: BoardsRepository
  realtime?: RealtimePublisher
}

const DEFAULT_STATUS_COLOR = '#94a3b8'

export class BoardsService {
  constructor(private readonly deps: BoardsServiceDependencies) {}

  async createBoard(
    projectId: string,
    orgId: string,
    actorId: string,
    dto: CreateBoardDto,
  ): Promise<BoardDto> {
    const board = await this.deps.repository.createBoard(projectId, {
      name: dto.name,
      description: dto.description,
    })
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.created',
      entityType: 'BOARD',
      entityId: board.id,
      metadata: { projectId },
    })
    this.emitBoardEvent(projectId, board.id, actorId, 'created')
    return this.toBoardDto(board, 0)
  }

  async listBoards(projectId: string, includeArchived: boolean): Promise<BoardDto[]> {
    const rows = await this.deps.repository.listBoards(projectId, includeArchived)
    return rows.map((row) => this.toBoardDto(row, row.columnCount))
  }

  async getBoard(boardId: string): Promise<BoardDto> {
    const board = await this.findBoard(boardId)
    const columns = await this.deps.repository.listColumns(board.id)
    return this.toBoardDto(board, columns.length)
  }

  async updateBoard(
    boardId: string,
    orgId: string,
    actorId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardDto> {
    const board = await this.findBoard(boardId)
    const updated = await this.deps.repository.updateBoard(board.id, dto)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.updated',
      entityType: 'BOARD',
      entityId: board.id,
      metadata: { changed: Object.keys(dto) },
    })
    const columns = await this.deps.repository.listColumns(board.id)
    this.emitBoardEvent(board.projectId, board.id, actorId, 'updated')
    return this.toBoardDto(updated, columns.length)
  }

  async deleteBoard(boardId: string, orgId: string, actorId: string): Promise<void> {
    const board = await this.findBoard(boardId)
    await this.deps.repository.softDeleteBoard(board.id)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.deleted',
      entityType: 'BOARD',
      entityId: board.id,
    })
    this.emitBoardEvent(board.projectId, board.id, actorId, 'deleted')
  }

  async setArchived(
    boardId: string,
    orgId: string,
    actorId: string,
    isArchived: boolean,
  ): Promise<BoardDto> {
    const board = await this.findBoard(boardId)
    const updated = await this.deps.repository.setBoardArchived(board.id, isArchived)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: isArchived ? 'board.archived' : 'board.restored',
      entityType: 'BOARD',
      entityId: board.id,
    })
    const columns = await this.deps.repository.listColumns(board.id)
    this.emitBoardEvent(board.projectId, board.id, actorId, isArchived ? 'archived' : 'restored')
    return this.toBoardDto(updated, columns.length)
  }

  async listColumns(boardId: string): Promise<ColumnDto[]> {
    const board = await this.findBoard(boardId)
    const rows = await this.deps.repository.listColumns(board.id)
    return rows.map((row) => this.toColumnDto(row))
  }

  async createColumn(
    boardId: string,
    orgId: string,
    actorId: string,
    dto: CreateColumnDto,
  ): Promise<ColumnDto> {
    const board = await this.findBoard(boardId)
    const status = await this.resolveStatus(board, orgId, dto)

    const existing = await this.deps.repository.listColumns(board.id)
    if (existing.some((column) => column.statusId === status.id)) {
      throw conflict('A column with this status already exists on the board', { field: 'statusId' })
    }

    const column = await this.deps.repository.createColumn(board.id, {
      name: dto.name,
      color: dto.color ?? status.color ?? null,
      wipLimit: dto.wipLimit ?? null,
      position: existing.length,
      statusId: status.id,
    })
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.column_added',
      entityType: 'BOARD',
      entityId: board.id,
      metadata: { columnId: column.id, name: column.name },
    })
    this.emitBoardEvent(board.projectId, board.id, actorId, 'column-created')
    return this.toColumnDto({
      ...column,
      statusName: status.name,
      taskCount: 0,
    })
  }

  async updateColumn(
    columnId: string,
    orgId: string,
    actorId: string,
    dto: UpdateColumnDto,
  ): Promise<ColumnDto> {
    const column = await this.findColumn(columnId)
    await this.deps.repository.updateColumn(column.id, dto)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.column_updated',
      entityType: 'BOARD',
      entityId: column.boardId,
      metadata: { columnId: column.id, changed: Object.keys(dto) },
    })
    const rows = await this.deps.repository.listColumns(column.boardId)
    const row = rows.find((item) => item.id === column.id)
    if (!row) {
      throw new Error('Column could not be loaded after update')
    }
    const board = await this.findBoard(column.boardId)
    this.emitBoardEvent(board.projectId, board.id, actorId, 'column-updated')
    return this.toColumnDto(row)
  }

  async deleteColumn(columnId: string, orgId: string, actorId: string): Promise<void> {
    const column = await this.findColumn(columnId)
    await this.deps.repository.deleteColumn(column.id)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.column_deleted',
      entityType: 'BOARD',
      entityId: column.boardId,
      metadata: { columnId: column.id },
    })
    const board = await this.findBoard(column.boardId)
    this.emitBoardEvent(board.projectId, board.id, actorId, 'column-deleted')
  }

  async moveColumn(
    columnId: string,
    orgId: string,
    actorId: string,
    dto: MoveColumnDto,
  ): Promise<void> {
    const column = await this.findColumn(columnId)
    await this.deps.repository.moveColumn(column.id, dto.toPosition)
    await this.deps.repository.recordActivity({
      orgId,
      actorId,
      action: 'board.column_moved',
      entityType: 'BOARD',
      entityId: column.boardId,
      metadata: { columnId: column.id, toPosition: dto.toPosition },
    })
    const board = await this.findBoard(column.boardId)
    this.emitBoardEvent(board.projectId, board.id, actorId, 'column-moved')
  }

  private async resolveStatus(
    board: Board,
    orgId: string,
    dto: CreateColumnDto,
  ): Promise<TaskStatus> {
    if (dto.statusId) {
      const status = await this.deps.repository.findOrgStatusById(orgId, dto.statusId)
      if (!status) {
        throw badRequest('The selected status does not belong to this organization', {
          field: 'statusId',
        })
      }
      return status
    }

    const byName = await this.deps.repository.findOrgStatusByName(orgId, dto.name)
    if (byName) {
      return byName
    }

    const fallback = await this.deps.repository.findDefaultStatus(orgId)
    if (fallback) {
      return fallback
    }

    const created = await this.deps.repository.createOrgStatus(orgId, {
      name: dto.name,
      color: dto.color ?? DEFAULT_STATUS_COLOR,
      position: 0,
    })
    return created
  }

  private async findBoard(boardId: string): Promise<Board> {
    const board = await this.deps.repository.findBoardById(boardId)
    if (!board) {
      throw notFound('Board not found')
    }
    return board
  }

  private async findColumn(columnId: string): Promise<Column> {
    const column = await this.deps.repository.findColumnById(columnId)
    if (!column) {
      throw notFound('Column not found')
    }
    return column
  }

  private toBoardDto(board: Board, columnCount: number): BoardDto {
    return {
      id: board.id,
      projectId: board.projectId,
      name: board.name,
      description: board.description,
      position: board.position,
      isArchived: board.isArchived,
      columnCount,
      createdAt: board.createdAt.toISOString(),
    }
  }

  private toColumnDto(column: ColumnRowLike): ColumnDto {
    return {
      id: column.id,
      boardId: column.boardId,
      statusId: column.statusId,
      statusName: column.statusName,
      name: column.name,
      color: column.color,
      position: column.position,
      wipLimit: column.wipLimit,
      taskCount: column.taskCount,
    }
  }

  private emitBoardEvent(
    projectId: string,
    boardId: string,
    actorId: string,
    reason: string,
  ): void {
    const payload: ProjectRealtimeEvent = {
      projectId,
      actorId,
      entityId: boardId,
      reason,
    }
    this.deps.realtime?.emitToProject(projectId, 'board.updated', payload)
  }
}

interface ColumnRowLike extends Column {
  statusName: string
  taskCount: number
}
