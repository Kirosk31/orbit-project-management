import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordDto } from '@orbit/shared'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { KeyRoundIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AuthCard } from '@/features/auth/auth-card'
import { resetPasswordRequest } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiClientError } from '@/lib/api'

export function ResetPasswordPage(): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<Pick<ResetPasswordDto, 'password'>>({
    resolver: zodResolver(resetPasswordSchema.pick({ password: true })),
    defaultValues: { password: '' },
  })

  if (!token) {
    return <Navigate to="/forgot-password" replace />
  }

  if (success) {
    return <Navigate to="/login" replace />
  }

  const onSubmit = async (values: Pick<ResetPasswordDto, 'password'>): Promise<void> => {
    setServerError(null)
    try {
      await resetPasswordRequest({ token, password: values.password })
      toast.success(t('auth.verificationSuccess'))
      // All sessions were revoked server-side; sign in with the new password.
      setSuccess(true)
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message)
      } else {
        setServerError(t('auth.genericError'))
      }
    }
  }

  return (
    <AuthCard
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
      footer={
        <>
          <Link to="/login" className="text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('common.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordPlaceholder')}
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-destructive text-sm">{serverError}</p>}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          <KeyRoundIcon className="size-4" />
          {form.formState.isSubmitting ? t('common.loading') : t('auth.resetPassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
