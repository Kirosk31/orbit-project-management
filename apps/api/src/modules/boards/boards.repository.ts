import type { Board, Column, Prisma, PrismaClient, TaskStatus } from '@prisma/client'

export interface BoardRow extends Board {
  columnCount: number
}

export interface ColumnRow extends Column {
  statusName: string
  taskCount: number
}

export interface BoardsRepository {
  createBoard(projectId: string, data: { name: string; description: string }): Promise<Board>
  findBoardById(id: string): Promise<Board | null>
  updateBoard(id: string, data: { name?: string; description?: string | null }): Promise<Board>
  softDeleteBoard(id: string): Promise<void>
  setBoardArchived(id: string, isArchived: boolean): Promise<Board>
  listBoards(projectId: string, includeArchived: boolean): Promise<BoardRow[]>
  listColumns(boardId: string): Promise<ColumnRow[]>
  findColumnById(id: string): Promise<Column | null>
  createColumn(
    boardId: string,
    data: {
      name: string
      color: string | null
      wipLimit: number | null
      position: number
      statusId: string
    },
  ): Promise<Column>
  updateColumn(
    id: string,
    data: { name?: string; color?: string | null; wipLimit?: number | null },
  ): Promise<Column>
  deleteColumn(id: string): Promise<void>
  moveColumn(id: string, toPosition: number): Promise<void>
  findOrgStatusById(orgId: string, statusId: string): Promise<TaskStatus | null>
  findOrgStatusByName(orgId: string, name: string): Promise<TaskStatus | null>
  findDefaultStatus(orgId: string): Promise<TaskStatus | null>
  createOrgStatus(
    orgId: string,
    data: { name: string; color: string; position: number },
  ): Promise<TaskStatus>
  recordActivity(data: {
    orgId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Prisma.InputJsonValue
  }): Promise<void>
}

export class PrismaBoardsRepository implements BoardsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createBoard(projectId: string, data: { name: string; description: string }) {
    const last = await this.prisma.board.findFirst({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    return this.prisma.board.create({
      data: { ...data, projectId, position: (last?.position ?? -1) + 1 },
    })
  }

  findBoardById(id: string) {
    return this.prisma.board.findFirst({ where: { id, deletedAt: null } })
  }

  updateBoard(id: string, data: { name?: string; description?: string | null }) {
    return this.prisma.board.update({ where: { id }, data })
  }

  async softDeleteBoard(id: string): Promise<void> {
    await this.prisma.board.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true },
    })
  }

  setBoardArchived(id: string, isArchived: boolean) {
    return this.prisma.board.update({ where: { id }, data: { isArchived } })
  }

  listBoards(projectId: string, includeArchived: boolean) {
    return this.prisma.board
      .findMany({
        where: { projectId, deletedAt: null, ...(includeArchived ? {} : { isArchived: false }) },
        include: { _count: { select: { columns: true } } },
        orderBy: [{ isArchived: 'asc' }, { position: 'asc' }],
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          columnCount: row._count.columns,
          _count: undefined,
        })),
      )
  }

  listColumns(boardId: string) {
    return this.prisma.column
      .findMany({
        where: { boardId },
        include: {
          status: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { position: 'asc' },
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          statusName: row.status.name,
          taskCount: row._count.tasks,
          _count: undefined,
          status: undefined,
        })),
      )
  }

  findColumnById(id: string) {
    return this.prisma.column.findUnique({ where: { id } })
  }

  createColumn(
    boardId: string,
    data: {
      name: string
      color: string | null
      wipLimit: number | null
      position: number
      statusId: string
    },
  ) {
    return this.prisma.column.create({ data: { ...data, boardId } })
  }

  updateColumn(
    id: string,
    data: { name?: string; color?: string | null; wipLimit?: number | null },
  ) {
    return this.prisma.column.update({ where: { id }, data })
  }

  async deleteColumn(id: string): Promise<void> {
    await this.prisma.column.delete({ where: { id } })
  }

  async moveColumn(id: string, toPosition: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const column = await tx.column.findUnique({ where: { id } })
      if (!column) {
        return
      }
      const siblings = await tx.column.findMany({
        where: { boardId: column.boardId, id: { not: id } },
        orderBy: { position: 'asc' },
        select: { id: true },
      })
      const clamped = Math.max(0, Math.min(toPosition, siblings.length))
      const ordered = [
        ...siblings.slice(0, clamped).map((s) => s.id),
        id,
        ...siblings.slice(clamped).map((s) => s.id),
      ]
      for (let index = 0; index < ordered.length; index += 1) {
        await tx.column.update({ where: { id: ordered[index] }, data: { position: index } })
      }
    })
  }

  findOrgStatusById(orgId: string, statusId: string) {
    return this.prisma.taskStatus.findFirst({
      where: { id: statusId, orgId, deletedAt: null },
    })
  }

  findOrgStatusByName(orgId: string, name: string) {
    return this.prisma.taskStatus.findFirst({
      where: { orgId, name: { equals: name, mode: 'insensitive' }, deletedAt: null },
    })
  }

  findDefaultStatus(orgId: string) {
    return this.prisma.taskStatus.findFirst({
      where: { orgId, isDefault: true, deletedAt: null },
    })
  }

  async createOrgStatus(orgId: string, data: { name: string; color: string; position: number }) {
    return this.prisma.taskStatus.create({ data: { ...data, orgId, isSystem: false } })
  }

  async recordActivity(data: {
    orgId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Prisma.InputJsonValue
  }): Promise<void> {
    await this.prisma.activityLog.create({ data })
  }
}
