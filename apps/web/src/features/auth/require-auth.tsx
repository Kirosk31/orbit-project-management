import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth/auth-store'

function AuthBootstrapFallback(): ReactNode {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-3 p-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

/**
 * Route guard: renders children only when a valid session exists.
 * While the session is booting it shows a skeleton; anonymous users are
 * redirected to /login (preserving the intended destination).
 */
export function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'booting') {
    return <AuthBootstrapFallback />
  }

  if (status === 'anonymous') {
    const destination = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" state={{ from: destination }} replace />
  }

  return children
}
