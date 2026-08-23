import { Prisma, type SavedFilter } from '@prisma/client'
import {
  savedTaskFilterValuesSchema,
  type CreateSavedFilterDto,
  type SavedFilterDto,
  type UpdateSavedFilterDto,
} from '@orbit/shared'
import { conflict, notFound } from '../../core/errors/index.js'
import type { TaskFiltersRepository } from './task-filters.repository.js'

export class TaskFiltersService {
  constructor(private readonly repository: TaskFiltersRepository) {}

  async list(boardId: string, userId: string): Promise<SavedFilterDto[]> {
    return (await this.repository.list(boardId, userId)).map((filter) => this.toDto(filter))
  }

  async create(
    boardId: string,
    orgId: string,
    userId: string,
    dto: CreateSavedFilterDto,
  ): Promise<SavedFilterDto> {
    try {
      return this.toDto(
        await this.repository.create({
          boardId,
          orgId,
          userId,
          name: dto.name,
          filters: dto.filters as Prisma.InputJsonValue,
        }),
      )
    } catch (error) {
      this.throwIfDuplicate(error)
      throw error
    }
  }

  async update(
    boardId: string,
    userId: string,
    filterId: string,
    dto: UpdateSavedFilterDto,
  ): Promise<SavedFilterDto> {
    await this.find(boardId, userId, filterId)
    try {
      return this.toDto(
        await this.repository.update(filterId, {
          ...(dto.name === undefined ? {} : { name: dto.name }),
          ...(dto.filters === undefined ? {} : { filters: dto.filters as Prisma.InputJsonValue }),
        }),
      )
    } catch (error) {
      this.throwIfDuplicate(error)
      throw error
    }
  }

  async remove(boardId: string, userId: string, filterId: string): Promise<void> {
    await this.find(boardId, userId, filterId)
    await this.repository.delete(filterId)
  }

  private async find(boardId: string, userId: string, filterId: string): Promise<SavedFilter> {
    const filter = await this.repository.find(boardId, userId, filterId)
    if (!filter) throw notFound('Saved filter not found')
    return filter
  }

  private throwIfDuplicate(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('A saved filter with this name already exists')
    }
  }

  private toDto(filter: SavedFilter): SavedFilterDto {
    return {
      id: filter.id,
      boardId: filter.boardId,
      name: filter.name,
      filters: savedTaskFilterValuesSchema.parse(filter.filters),
      createdAt: filter.createdAt.toISOString(),
      updatedAt: filter.updatedAt.toISOString(),
    }
  }
}
