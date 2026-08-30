import type { NextFunction, Request, Response } from 'express'
import { notFound } from '../../core/errors/index.js'
import type { BoardsRepository } from './boards.repository.js'
import { createRequireProjectAccess } from '../projects/project-access.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { ProjectsRepository } from '../projects/projects.repository.js'

export interface BoardLocals {
  board: {
    id: string
    projectId: string
  }
}

/**
 * Resolves a board from `:id` (or its column from `:columnId`), then delegates
 * access to the project access middleware which attaches org membership.
 */
export function createRequireBoardMember(
  boards: BoardsRepository,
  projects: ProjectsRepository,
  organizations: OrganizationsRepository,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let boardId = req.params.id as string | undefined
    if (!boardId) {
      const column = await boards.findColumnById(req.params.columnId as string)
      if (!column) {
        next(notFound('Column not found'))
        return
      }
      boardId = column.boardId
    }

    const board = await boards.findBoardById(boardId)
    if (!board || board.deletedAt) {
      next(notFound('Board not found'))
      return
    }
    res.locals.board = { id: board.id, projectId: board.projectId }
    createRequireProjectAccess(projects, organizations, (_req, res) =>
      String((res.locals.board as BoardLocals['board']).projectId ?? ''),
    )(req, res, next)
  }
}
