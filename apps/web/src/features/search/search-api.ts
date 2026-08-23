import type { GlobalSearchResponseDto } from '@orbit/shared'

import { api } from '@/lib/api'

export function globalSearchRequest(query: string): Promise<GlobalSearchResponseDto> {
  return api.get<GlobalSearchResponseDto>('/search', {
    params: { q: query, pageSize: 10 },
  })
}
