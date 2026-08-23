import { z } from 'zod'

import { paginationQuerySchema } from './pagination.schemas.js'
import { DEFAULT_LOCALE, localeSchema } from '../locales.js'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(80),
  bio: z.string().trim().max(500).optional().default(''),
})

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  locale: localeSchema.default(DEFAULT_LOCALE),
  digestSummaries: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  weeklyReport: z.boolean().default(false),
})

export type UserPreferencesDto = z.infer<typeof userPreferencesSchema>

export const updatePreferencesSchema = userPreferencesSchema.partial()

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>

export const userSearchQuerySchema = paginationQuerySchema.extend({
  orgId: z.uuid(),
  q: z.string().trim().min(1, 'Search term is required').max(100),
})

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>
