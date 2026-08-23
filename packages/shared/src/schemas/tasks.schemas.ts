import { z } from 'zod'
import { TASK_PRIORITIES, type TaskPriority } from '../enums.js'
import { projectColorSchema } from './projects.schemas.js'

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().trim().max(10_000).optional().default(''),
  priority: z.enum(TASK_PRIORITIES).optional().default('NONE'),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().min(0).max(10_000).nullable().optional(),
  columnId: z.string().min(1).optional(),
  statusId: z.string().min(1).optional(),
  assigneeIds: z.array(z.string().min(1)).max(50).optional().default([]),
  labelIds: z.array(z.string().min(1)).max(50).optional().default([]),
})

export type CreateTaskDto = z.infer<typeof createTaskSchema>

export const createSubtaskSchema = createTaskSchema.omit({
  columnId: true,
  statusId: true,
})

export type CreateSubtaskDto = z.infer<typeof createSubtaskSchema>

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Task title is required').max(200).optional(),
    description: z.string().trim().max(10_000).nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    estimatedHours: z.number().min(0).max(10_000).nullable().optional(),
    isCompleted: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>

export const moveTaskSchema = z.object({
  columnId: z.string().min(1).optional(),
  statusId: z.string().min(1).optional(),
  toPosition: z.number().int().min(0).optional(),
})

export type MoveTaskDto = z.infer<typeof moveTaskSchema>

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  statusId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  search: z.string().trim().max(200).optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? false : value === 'true')),
})

export type TaskQuery = z.infer<typeof taskQuerySchema>

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Label name is required').max(40),
  color: projectColorSchema.optional().default('#94a3b8'),
})

export type CreateLabelDto = z.infer<typeof createLabelSchema>

export const updateLabelSchema = z
  .object({
    name: z.string().trim().min(1, 'Label name is required').max(40).optional(),
    color: projectColorSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateLabelDto = z.infer<typeof updateLabelSchema>

export interface TaskAssigneeDto {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
}

export interface TaskLabelDto {
  id: string
  labelId: string
  name: string
  color: string
}

export interface TaskDto {
  id: string
  orgId: string
  projectId: string
  boardId: string | null
  columnId: string | null
  statusId: string
  statusName: string
  parentId: string | null
  createdById: string
  title: string
  description: string | null
  priority: TaskPriority
  dueDate: string | null
  estimatedHours: string | null
  trackedSeconds: number
  subtaskCount: number
  completedSubtaskCount: number
  isArchived: boolean
  isCompleted: boolean
  completedAt: string | null
  position: number
  assignees: TaskAssigneeDto[]
  labels: TaskLabelDto[]
  createdAt: string
  updatedAt: string
}

export interface LabelDto {
  id: string
  orgId: string
  name: string
  color: string
  taskCount: number
  createdAt: string
}

export interface TaskActivityDto {
  id: string
  action: string
  entityType: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  metadata: Record<string, unknown> | null
  actorName: string
  createdAt: string
}

export const createChecklistSchema = z.object({
  title: z.string().trim().min(1, 'Checklist title is required').max(100),
})

export type CreateChecklistDto = z.infer<typeof createChecklistSchema>

export const updateChecklistSchema = createChecklistSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateChecklistDto = z.infer<typeof updateChecklistSchema>

export const createChecklistItemSchema = z.object({
  title: z.string().trim().min(1, 'Checklist item title is required').max(300),
})

export type CreateChecklistItemDto = z.infer<typeof createChecklistItemSchema>

export const updateChecklistItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Checklist item title is required').max(300).optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateChecklistItemDto = z.infer<typeof updateChecklistItemSchema>

export const moveChecklistItemSchema = z.object({
  toPosition: z.number().int().min(0),
})

export type MoveChecklistItemDto = z.infer<typeof moveChecklistItemSchema>

export interface ChecklistItemDto {
  id: string
  checklistId: string
  title: string
  isCompleted: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface ChecklistDto {
  id: string
  taskId: string
  title: string
  position: number
  items: ChecklistItemDto[]
  completedItems: number
  totalItems: number
  createdAt: string
  updatedAt: string
}

export const logTimeEntrySchema = z.object({
  durationMinutes: z.number().int().min(1).max(1_440),
  startedAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

export type LogTimeEntryDto = z.infer<typeof logTimeEntrySchema>

export const startTaskTimerSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
})

export type StartTaskTimerDto = z.infer<typeof startTaskTimerSchema>

export const updateTimeEntrySchema = z
  .object({
    durationMinutes: z.number().int().min(1).max(1_440).optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateTimeEntryDto = z.infer<typeof updateTimeEntrySchema>

export interface TimeEntryDto {
  id: string
  taskId: string
  userId: string
  userName: string
  userAvatarKey: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  note: string | null
  isRunning: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeEntryListDto {
  rows: TimeEntryDto[]
  total: number
}

export interface AttachmentDto {
  id: string
  taskId: string
  uploaderId: string
  uploaderName: string
  uploaderAvatarKey: string | null
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export const savedTaskFilterValuesSchema = z
  .object({
    statusId: z.string().min(1).optional(),
    assigneeId: z.string().min(1).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    search: z.string().trim().max(200).optional(),
    archived: z.boolean().default(false),
  })
  .strict()

export type SavedTaskFilterValues = z.infer<typeof savedTaskFilterValuesSchema>

export const createSavedFilterSchema = z
  .object({
    name: z.string().trim().min(1, 'Filter name is required').max(80),
    filters: savedTaskFilterValuesSchema,
  })
  .strict()

export type CreateSavedFilterDto = z.infer<typeof createSavedFilterSchema>

export const updateSavedFilterSchema = z
  .object({
    name: z.string().trim().min(1, 'Filter name is required').max(80).optional(),
    filters: savedTaskFilterValuesSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')

export type UpdateSavedFilterDto = z.infer<typeof updateSavedFilterSchema>

export interface SavedFilterDto {
  id: string
  boardId: string
  name: string
  filters: SavedTaskFilterValues
  createdAt: string
  updatedAt: string
}
