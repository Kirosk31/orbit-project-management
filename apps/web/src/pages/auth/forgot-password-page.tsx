import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordDto } from '@orbit/shared'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { MailCheckIcon, SendIcon } from 'lucide-react'

import { AuthCard } from '@/features/auth/auth-card'
import { forgotPasswordRequest } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage(): ReactNode {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordDto): Promise<void> => {
    setError(null)
    try {
      await forgotPasswordRequest(values)
      setSent(true)
    } catch {
      // The endpoint always returns 200 to avoid account enumeration;
      // a failure here is an infrastructure problem, not a bad email.
      setSent(true)
    }
  }

  return (
    <AuthCard
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <>
          <Link to="/login" className="text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
            <MailCheckIcon className="size-6" />
          </div>
          <h3 className="font-semibold">{t('auth.emailSent')}</h3>
          <p className="text-muted-foreground text-sm">{t('auth.emailSentDescription')}</p>
        </div>
      ) : (
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

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            <SendIcon className="size-4" />
            {form.formState.isSubmitting ? t('auth.sendingLink') : t('auth.sendResetLink')}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
