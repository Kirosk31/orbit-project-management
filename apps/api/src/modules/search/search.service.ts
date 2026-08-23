import type { GlobalSearchQuery, GlobalSearchResponseDto } from '@orbit/shared'
import type { SearchRepository } from './search.repository.js'

export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async search(userId: string, query: GlobalSearchQuery): Promise<GlobalSearchResponseDto> {
    const rows = await this.repository.search(userId, query)
    return {
      rows: rows.map((row) => ({
        type: row.type,
        id: row.id,
        orgId: row.orgId,
        orgName: row.orgName,
        title: row.title,
        excerpt: row.excerpt,
        linkUrl: row.linkUrl,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total: Number(rows[0]?.total ?? 0),
    }
  }
}
