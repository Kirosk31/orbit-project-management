import { z } from 'zod'

export const SEARCH_RESULT_TYPES = ['TASK', 'PROJECT', 'USER', 'COMMENT', 'LABEL'] as const
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number]

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  orgId: z.uuid().optional(),
  types: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value ? [...new Set(value.split(',').filter(Boolean))] : [...SEARCH_RESULT_TYPES],
    )
    .pipe(z.array(z.enum(SEARCH_RESULT_TYPES)).min(1).max(SEARCH_RESULT_TYPES.length)),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(10),
})

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>

export interface GlobalSearchResultDto {
  type: SearchResultType
  id: string
  orgId: string
  orgName: string
  title: string
  excerpt: string | null
  linkUrl: string
  updatedAt: string
}

export interface GlobalSearchResponseDto {
  rows: GlobalSearchResultDto[]
  total: number
}
