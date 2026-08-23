import type { Prisma, PrismaClient, SavedFilter } from '@prisma/client'

export interface TaskFiltersRepository {
  list(boardId: string, userId: string): Promise<SavedFilter[]>
  find(boardId: string, userId: string, filterId: string): Promise<SavedFilter | null>
  create(data: {
    boardId: string
    orgId: string
    userId: string
    name: string
    filters: Prisma.InputJsonValue
  }): Promise<SavedFilter>
  update(
    filterId: string,
    data: { name?: string; filters?: Prisma.InputJsonValue },
  ): Promise<SavedFilter>
  delete(filterId: string): Promise<void>
}

export class PrismaTaskFiltersRepository implements TaskFiltersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(boardId: string, userId: string): Promise<SavedFilter[]> {
    return this.prisma.savedFilter.findMany({
      where: { boardId, userId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    })
  }

  find(boardId: string, userId: string, filterId: string): Promise<SavedFilter | null> {
    return this.prisma.savedFilter.findFirst({ where: { id: filterId, boardId, userId } })
  }

  create(data: {
    boardId: string
    orgId: string
    userId: string
    name: string
    filters: Prisma.InputJsonValue
  }): Promise<SavedFilter> {
    return this.prisma.savedFilter.create({ data })
  }

  update(
    filterId: string,
    data: { name?: string; filters?: Prisma.InputJsonValue },
  ): Promise<SavedFilter> {
    return this.prisma.savedFilter.update({ where: { id: filterId }, data })
  }

  async delete(filterId: string): Promise<void> {
    await this.prisma.savedFilter.delete({ where: { id: filterId } })
  }
}
