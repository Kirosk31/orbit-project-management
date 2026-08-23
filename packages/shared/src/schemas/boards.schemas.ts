import { z } from 'zod'
import { projectColorSchema } from './projects.schemas.js'

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, 'Board name is required').max(80),
  description: z.string().trim().max(500).optional().default(''),
})

export type CreateBoardDto = z.infer<typeof createBoardSchema>

export const updateBoardSchema = z
  .object({
    name: z.string().trim().min(1, 'Board name is required').max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateBoardDto = z.infer<typeof updateBoardSchema>

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, 'Column name is required').max(60),
  color: projectColorSchema.optional(),
  wipLimit: z.number().int().min(0).max(50).nullable().optional(),
  statusId: z.string().min(1).optional(),
})

export type CreateColumnDto = z.infer<typeof createColumnSchema>

export const updateColumnSchema = z
  .object({
    name: z.string().trim().min(1, 'Column name is required').max(60).optional(),
    color: projectColorSchema.nullable().optional(),
    wipLimit: z.number().int().min(0).max(50).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateColumnDto = z.infer<typeof updateColumnSchema>

export const moveColumnSchema = z.object({
  toPosition: z.number().int().min(0),
})

export type MoveColumnDto = z.infer<typeof moveColumnSchema>

export interface BoardDto {
  id: string
  projectId: string
  name: string
  description: string | null
  position: number
  isArchived: boolean
  columnCount: number
  createdAt: string
}

export interface ColumnDto {
  id: string
  boardId: string
  statusId: string
  statusName: string
  name: string
  color: string | null
  position: number
  wipLimit: number | null
  taskCount: number
}
