import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CompassIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function NotFoundPage(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-muted-foreground/20 relative">
        <CompassIcon className="size-24" strokeWidth={1} />
        <span className="absolute inset-0 flex items-center justify-center text-4xl">404</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('common.notFoundTitle')}</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          {t('common.notFoundDescription')}
        </p>
      </div>
      <Button asChild>
        <Link to="/">{t('common.backHome')}</Link>
      </Button>
    </div>
  )
}
