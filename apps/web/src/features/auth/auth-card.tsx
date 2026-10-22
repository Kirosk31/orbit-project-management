import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface AuthCardProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthCardProps): ReactNode {
  return (
    <div className={cn('w-full max-w-sm', className)}>
      <div className="mb-7 space-y-1.5">
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.015em]">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-4">
        {children}
        {footer && <p className="mt-3 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  )
}
