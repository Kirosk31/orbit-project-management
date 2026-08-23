import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { CalendarIcon, LogOutIcon, ShieldCheckIcon, ShieldXIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { z } from 'zod'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { hardLogout, useAuthStore } from '@/features/auth/auth-store'
import {
  logoutAllRequest,
  logoutRequest,
  resendVerificationRequest,
} from '@/features/auth/auth-api'
import { useThemeStore, type ThemePreference } from '@/features/theme/theme-store'
import { LOCALE_OPTIONS } from '@/features/i18n/locale-options'
import { applyLocale, getCurrentLocale, type Locale } from '@/lib/i18n'
import { ApiClientError } from '@/lib/api'
import { formatDate, initialsOf } from '@/lib/utils'
import {
  deleteAvatarRequest,
  getPreferencesRequest,
  getUserPreferencesQueryKey,
  updatePreferencesRequest,
  updateProfileRequest,
  uploadAvatarRequest,
} from '@/features/users/user-api'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ProfilePage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userId = user?.id ?? 'anonymous'
  const setUser = useAuthStore((state) => state.setUser)
  const setTheme = useThemeStore((state) => state.setTheme)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resending, setResending] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const form = useForm<
    z.input<typeof updateProfileSchema>,
    unknown,
    z.output<typeof updateProfileSchema>
  >({
    resolver: zodResolver(updateProfileSchema),
    values: user ? { fullName: user.fullName, bio: user.bio ?? '' } : { fullName: '', bio: '' },
  })

  const preferencesQuery = useQuery({
    queryKey: getUserPreferencesQueryKey(userId),
    queryFn: getPreferencesRequest,
    enabled: user !== null,
  })

  const profileMutation = useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: (updated) => {
      setUser(updated)
      toast.success(t('app.profileSaved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const avatarMutation = useMutation({
    mutationFn: uploadAvatarRequest,
    onSuccess: (updated) => {
      setUser(updated)
      toast.success(t('app.avatarUploaded'))
    },
    onError: (error: unknown) => {
      if (error instanceof ApiClientError && error.status === 413) {
        toast.error(t('app.avatarTooLarge'))
        return
      }
      toast.error(t('auth.genericError'))
    },
  })

  const removeAvatarMutation = useMutation({
    mutationFn: deleteAvatarRequest,
    onSuccess: (updated) => {
      setUser(updated)
      toast.success(t('app.avatarRemoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const preferencesMutation = useMutation({
    mutationFn: updatePreferencesRequest,
    onSuccess: (preferences) => {
      queryClient.setQueryData(getUserPreferencesQueryKey(userId), preferences)
      setTheme(preferences.theme)
      if (preferences.locale !== getCurrentLocale(i18n.resolvedLanguage ?? i18n.language)) {
        void applyLocale(preferences.locale)
      }
      toast.success(t('app.preferencesSaved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-56" />
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleLogout = async (): Promise<void> => {
    setLoggingOut(true)
    try {
      await logoutRequest()
    } catch {
      // Session may already be revoked server-side; clear locally regardless.
    } finally {
      hardLogout()
      navigate('/login')
    }
  }

  const handleLogoutAll = async (): Promise<void> => {
    try {
      await logoutAllRequest()
      toast.success(t('app.logoutAll'))
      hardLogout()
      navigate('/login')
    } catch {
      toast.error(t('auth.genericError'))
    }
  }

  const handleResendVerification = async (): Promise<void> => {
    setResending(true)
    try {
      await resendVerificationRequest({ email: user.email })
      toast.success(t('auth.verificationSent'))
    } catch {
      toast.error(t('auth.genericError'))
    } finally {
      setResending(false)
    }
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      toast.error(t('app.invalidAvatar'))
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t('app.avatarTooLarge'))
      return
    }

    avatarMutation.mutate(file)
  }

  const preferences = preferencesQuery.data

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('app.profile')}</h1>
          <p className="text-muted-foreground text-sm">{t('app.account')}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <SecureAvatarImage
                  userId={user.id}
                  avatarKey={user.avatarKey}
                  alt={user.fullName}
                />
                <AvatarFallback className="text-lg">{initialsOf(user.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="truncate">{user.fullName}</CardTitle>
                <CardDescription className="truncate">{user.email}</CardDescription>
              </div>
              <Badge
                variant={user.isEmailVerified ? 'success' : 'warning'}
                className="ml-auto shrink-0"
              >
                {user.isEmailVerified ? t('app.emailVerified') : t('app.emailNotVerified')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              <CalendarIcon className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">{t('app.memberSince')}</span>
              <span className="ml-auto font-medium">
                {formatDate(user.createdAt, i18n.language)}
              </span>
            </div>
            <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              {user.isEmailVerified ? (
                <ShieldCheckIcon className="text-success size-4" />
              ) : (
                <ShieldXIcon className="text-warning size-4" />
              )}
              <span className="text-muted-foreground">{t('app.sessionStatus')}</span>
              <Badge variant="success" className="ml-auto">
                {t('app.sessionActive')}
              </Badge>
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <Label>{t('app.avatar')}</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_MIME_TYPES.join(',')}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                >
                  {t('app.uploadAvatar')}
                </Button>
                {user.avatarKey && (
                  <Button
                    variant="ghost"
                    onClick={() => removeAvatarMutation.mutate()}
                    disabled={removeAvatarMutation.isPending}
                  >
                    {t('app.removeAvatar')}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{t('app.avatarHint')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('app.profileDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) => profileMutation.mutate(values))}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">{t('app.fullName')}</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  aria-invalid={form.formState.errors.fullName ? true : undefined}
                  {...form.register('fullName')}
                />
                {form.formState.errors.fullName && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">{t('app.bio')}</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder={t('app.bioPlaceholder')}
                  {...form.register('bio')}
                />
              </div>
              <Button type="submit" disabled={profileMutation.isPending} className="self-start">
                {profileMutation.isPending ? t('common.loading') : t('app.saveProfile')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('app.preferences')}</CardTitle>
            <CardDescription>{t('app.preferencesHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {preferences ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>{t('app.themePreference')}</Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(theme) => {
                        queryClient.setQueryData(getUserPreferencesQueryKey(userId), {
                          ...preferences,
                          theme: theme as ThemePreference,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t('common.lightMode')}</SelectItem>
                        <SelectItem value="dark">{t('common.darkMode')}</SelectItem>
                        <SelectItem value="system">{t('common.systemMode')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('app.languagePreference')}</Label>
                    <Select
                      value={preferences.locale}
                      onValueChange={(locale) => {
                        queryClient.setQueryData(getUserPreferencesQueryKey(userId), {
                          ...preferences,
                          locale: locale as Locale,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALE_OPTIONS.map((option) => (
                          <SelectItem key={option.code} value={option.code}>
                            <span lang={option.code}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(
                  [
                    ['digestSummaries', 'app.digestSummaries', 'app.digestSummariesHint'],
                    ['emailNotifications', 'app.emailNotifications', 'app.emailNotificationsHint'],
                    ['weeklyReport', 'app.weeklyReport', 'app.weeklyReportHint'],
                  ] as const
                ).map(([key, titleKey, hintKey]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{t(titleKey)}</p>
                      <p className="text-muted-foreground text-xs">{t(hintKey)}</p>
                    </div>
                    <Switch
                      checked={preferences[key]}
                      onCheckedChange={(checked) => {
                        queryClient.setQueryData(getUserPreferencesQueryKey(userId), {
                          ...preferences,
                          [key]: checked,
                        })
                      }}
                    />
                  </div>
                ))}

                <Button
                  onClick={() =>
                    preferencesMutation.mutate({
                      theme: preferences.theme,
                      locale: preferences.locale,
                      digestSummaries: preferences.digestSummaries,
                      emailNotifications: preferences.emailNotifications,
                      weeklyReport: preferences.weeklyReport,
                    })
                  }
                  disabled={preferencesMutation.isPending}
                  className="self-start"
                >
                  {preferencesMutation.isPending ? t('common.loading') : t('app.savePreferences')}
                </Button>
              </>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!user.isEmailVerified && (
            <Button
              variant="outline"
              onClick={() => void handleResendVerification()}
              disabled={resending}
            >
              {resending ? t('common.loading') : t('auth.resendVerification')}
            </Button>
          )}
          <Button variant="outline" onClick={() => void handleLogoutAll()}>
            <LogOutIcon />
            {t('app.logoutAll')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="sm:ml-auto"
          >
            <LogOutIcon />
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    </div>
  )
}
