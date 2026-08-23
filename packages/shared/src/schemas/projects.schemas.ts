import { z } from 'zod'
import { paginationQuerySchema } from './pagination.schemas.js'

export const projectColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #6366f1')

export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,8}$/, 'Key must be 2-8 letters or digits')

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(80),
  key: projectKeySchema,
  description: z.string().trim().max(500).optional().default(''),
  color: projectColorSchema.optional().default('#6366f1'),
  icon: z.string().trim().max(40).nullable().optional(),
})

export type CreateProjectDto = z.infer<typeof createProjectSchema>

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Project name is required').max(80).optional(),
    key: projectKeySchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    color: projectColorSchema.optional(),
    icon: z.string().trim().max(40).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>

export const projectQuerySchema = paginationQuerySchema.extend({
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? null : value === 'true')),
})

export type ProjectQuery = z.infer<typeof projectQuerySchema>

export interface ProjectDto {
  id: string
  orgId: string
  name: string
  key: string
  description: string | null
  color: string
  icon: string | null
  isArchived: boolean
  isFavorite: boolean
  memberCount: number
  createdAt: string
}

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, 'A user is required'),
  roleId: z.string().min(1).optional(),
})

export type AddProjectMemberDto = z.infer<typeof addProjectMemberSchema>

export interface ProjectMemberDto {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  roleId: string | null
  roleName: string | null
  addedAt: string
}

export interface ProjectActivityDto {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  actorName: string
  createdAt: string
}
