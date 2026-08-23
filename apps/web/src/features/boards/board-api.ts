import type {
  BoardDto,
  ColumnDto,
  CreateBoardDto,
  CreateColumnDto,
  MoveColumnDto,
  UpdateBoardDto,
  UpdateColumnDto,
} from '@orbit/shared'

import { api } from '@/lib/api'

export function listBoardsRequest(projectId: string, archived?: boolean): Promise<BoardDto[]> {
  const query = archived === undefined ? '' : `?archived=${archived}`
  return api.get<BoardDto[]>(`/projects/${projectId}/boards${query}`)
}

export function createBoardRequest(projectId: string, input: CreateBoardDto): Promise<BoardDto> {
  return api.post<BoardDto>(`/projects/${projectId}/boards`, { body: input })
}

export function getBoardRequest(id: string): Promise<BoardDto> {
  return api.get<BoardDto>(`/boards/${id}`)
}

export function updateBoardRequest(id: string, input: UpdateBoardDto): Promise<BoardDto> {
  return api.patch<BoardDto>(`/boards/${id}`, { body: input })
}

export function deleteBoardRequest(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/boards/${id}`)
}

export function archiveBoardRequest(id: string): Promise<BoardDto> {
  return api.post<BoardDto>(`/boards/${id}/archive`)
}

export function unarchiveBoardRequest(id: string): Promise<BoardDto> {
  return api.post<BoardDto>(`/boards/${id}/unarchive`)
}

export function listColumnsRequest(boardId: string): Promise<ColumnDto[]> {
  return api.get<ColumnDto[]>(`/boards/${boardId}/columns`)
}

export function createColumnRequest(boardId: string, input: CreateColumnDto): Promise<ColumnDto> {
  return api.post<ColumnDto>(`/boards/${boardId}/columns`, { body: input })
}

export function updateColumnRequest(columnId: string, input: UpdateColumnDto): Promise<ColumnDto> {
  return api.patch<ColumnDto>(`/columns/${columnId}`, { body: input })
}

export function deleteColumnRequest(columnId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/columns/${columnId}`)
}

export function moveColumnRequest(
  columnId: string,
  toPosition: number,
): Promise<{ moved: boolean }> {
  return api.post<{ moved: boolean }>(`/columns/${columnId}/move`, {
    body: { toPosition } satisfies MoveColumnDto,
  })
}
