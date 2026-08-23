import { zodResolver } from '@hookform/resolvers/zod'
import { resendVerificationSchema, type ResendVerificationDto } from '@orbit/shared'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { BadgeCheckIcon, ShieldAlertIcon } from 'lucide-react'

import { AuthCard } from '@/features/auth/auth-card'
import { resendVerificationRequest, verifyEmailRequest } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type VerifyState = 'verifying' | 'success' | 'error'

export function VerifyEmailPage(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'error')
  const [resending, setResending] = useState(false)

  const resendForm = useForm<ResendVerificationDto>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (!token) return
    let cancelled = false

    void verifyEmailRequest({ token })
      .then(() => {
        if (!cancelled) setState('success')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async (values: ResendVerificationDto): Promise<void> => {
    setResending(true)
    try {
      await resendVerificationRequest(values)
      setState('success')
    } catch {
      // Swallow: unknown emails are never disclosed to avoid enumeration.
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.verifyEmailTitle')}
      subtitle={t('auth.verifyEmailSubtitle')}
      footer={
        <>
          <Link to="/login" className="text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </>
      }
    >
      {state === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
            <BadgeCheckIcon className="size-6" />
          </div>
          <h3 className="font-semibold">{t('auth.verificationSuccess')}</h3>
          <p className="text-muted-foreground text-sm">
            {t('auth.verificationSuccessDescription')}
          </p>
          <Button className="mt-2 w-full" onClick={() => navigate('/login')}>
            {t('auth.backToLogin')}
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
            <ShieldAlertIcon className="size-6" />
          </div>
          <h3 className="font-semibold">{t('auth.genericError')}</h3>
          <p className="text-muted-foreground text-sm">{t('auth.verificationSentDescription')}</p>
          <form
            onSubmit={resendForm.handleSubmit(handleResend)}
            className="mt-2 flex w-full flex-col gap-2"
          >
            <div className="flex flex-col gap-2 text-left">
              <Label htmlFor="resend-email">{t('common.email')}</Label>
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                {...resendForm.register('email')}
              />
              {resendForm.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {resendForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <Button type="submit" variant="outline" disabled={resending}>
              {resending ? t('common.loading') : t('auth.resendVerification')}
            </Button>
          </form>
        </div>
      )}
    </AuthCard>
  )
}
