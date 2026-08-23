import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className={cn('w-full max-w-sm shadow-lg', className)}>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {children}
        {footer && <p className="text-muted-foreground mt-2 text-center text-sm">{footer}</p>}
      </CardContent>
    </Card>
  )
}
