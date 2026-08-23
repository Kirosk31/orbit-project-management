import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginDto } from '@orbit/shared'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { LogInIcon } from 'lucide-react'

import { AuthCard } from '@/features/auth/auth-card'
import { loginRequest } from '@/features/auth/auth-api'
import { getSafeAuthReturnPath } from '@/features/auth/auth-return-path'
import { useAuthStore } from '@/features/auth/auth-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiClientError } from '@/lib/api'

type LoginFormValues = z.input<typeof loginSchema>

export function LoginPage(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginFormValues, unknown, LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const from = getSafeAuthReturnPath((location.state as { from?: unknown } | null)?.from)

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: LoginDto): Promise<void> => {
    setServerError(null)
    try {
      const session = await loginRequest(values)
      useAuthStore.getState().setSession(session)
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setServerError(t('auth.invalidCredentials'))
      } else {
        setServerError(t('auth.genericError'))
      }
    }
  }

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" state={{ from }} className="text-primary hover:underline">
            {t('auth.signUpNow')}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('common.password')}</Label>
            <Link to="/forgot-password" className="text-primary hover:underline text-xs">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={form.watch('rememberMe')}
            onCheckedChange={(checked) => form.setValue('rememberMe', checked === true)}
          />
          <Label htmlFor="remember-me" className="font-normal">
            {t('auth.rememberMe')}
          </Label>
        </div>

        {serverError && <p className="text-destructive text-sm">{serverError}</p>}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          <LogInIcon className="size-4" />
          {form.formState.isSubmitting ? t('auth.loggingIn') : t('auth.logInNow')}
        </Button>
      </form>
    </AuthCard>
  )
}
