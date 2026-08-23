import { useQuery } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { getPreferencesRequest, getUserPreferencesQueryKey } from '@/features/users/user-api'
import { applyLocale, getCurrentLocale } from '@/lib/i18n'

/** Applies the authenticated user's server preference on every device and session. */
export function LocalePreferenceSync(): ReactNode {
  const userId = useAuthStore((state) => state.user?.id)
  const status = useAuthStore((state) => state.status)
  const preferencesQuery = useQuery({
    queryKey: getUserPreferencesQueryKey(userId ?? 'anonymous'),
    queryFn: getPreferencesRequest,
    enabled: status === 'authenticated' && Boolean(userId),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const locale = preferencesQuery.data?.locale
    if (locale && locale !== getCurrentLocale()) {
      void applyLocale(locale)
    }
  }, [preferencesQuery.data?.locale])

  return null
}
