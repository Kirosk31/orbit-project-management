import type { OrganizationAnalyticsDto } from '@orbit/shared'

import { api } from '@/lib/api'

export function organizationAnalyticsRequest(
  organizationSlug: string,
  days = 30,
): Promise<OrganizationAnalyticsDto> {
  return api.get<OrganizationAnalyticsDto>(`/organizations/${organizationSlug}/analytics`, {
    params: { days },
  })
}
