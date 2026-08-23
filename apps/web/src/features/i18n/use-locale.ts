import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/auth-store'
import { getUserPreferencesQueryKey, updatePreferencesRequest } from '@/features/users/user-api'
import { applyLocale, getCurrentLocale, type Locale } from '@/lib/i18n'

interface LocaleController {
  currentLocale: Locale
  isSaving: boolean
  changeLocale: (locale: Locale) => Promise<void>
}

/** Coordinates optimistic locale changes with the authenticated account preference. */
export function useLocale(): LocaleController {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const currentLocale = getCurrentLocale(i18n.resolvedLanguage ?? i18n.language)
  const preferenceMutation = useMutation({
    mutationFn: (locale: Locale) => updatePreferencesRequest({ locale }),
    onSuccess: (preferences) => {
      if (userId) {
        queryClient.setQueryData(getUserPreferencesQueryKey(userId), preferences)
      }
    },
  })

  const changeLocale = useCallback(
    async (locale: Locale): Promise<void> => {
      if (locale === currentLocale || preferenceMutation.isPending) return

      const previous = currentLocale
      await applyLocale(locale)
      if (!userId) return

      try {
        await preferenceMutation.mutateAsync(locale)
      } catch {
        await applyLocale(previous)
        toast.error(t('auth.genericError'))
      }
    },
    [currentLocale, preferenceMutation, t, userId],
  )

  return {
    currentLocale,
    isSaving: preferenceMutation.isPending,
    changeLocale,
  }
}
