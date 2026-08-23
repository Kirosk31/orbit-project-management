import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterDto } from '@orbit/shared'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AuthCard } from '@/features/auth/auth-card'
import { registerRequest } from '@/features/auth/auth-api'
import { getSafeAuthReturnPath } from '@/features/auth/auth-return-path'
import { useAuthStore } from '@/features/auth/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiClientError } from '@/lib/api'

export function RegisterPage(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  })

  const from = getSafeAuthReturnPath((location.state as { from?: unknown } | null)?.from)

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: RegisterDto): Promise<void> => {
    setServerError(null)
    try {
      const session = await registerRequest(values)
      useAuthStore.getState().setSession(session)
      toast.info(t('auth.verificationSent'))
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setServerError(t('auth.emailTaken'))
      } else {
        setServerError(t('auth.genericError'))
      }
    }
  }

  return (
    <AuthCard
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" state={{ from }} className="text-primary hover:underline">
            {t('auth.logInNow')}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="full-name">{t('auth.fullName')}</Label>
          <Input
            id="full-name"
            type="text"
            autoComplete="name"
            placeholder={t('auth.fullNamePlaceholder')}
            aria-invalid={form.formState.errors.fullName ? true : undefined}
            {...form.register('fullName')}
          />
          {form.formState.errors.fullName && (
            <p className="text-destructive text-xs">{form.formState.errors.fullName.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('common.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
          )}
        </div>

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
          <UserPlusIcon className="size-4" />
          {form.formState.isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
        </Button>
      </form>
    </AuthCard>
  )
}
