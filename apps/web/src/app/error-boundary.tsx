import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import i18n from '@/lib/i18n'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string | null
}

/**
 * Top-level error boundary: catches render errors that escape the router
 * and offers a recovery path instead of a blank screen.
 */
export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected error',
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Orbit crashed:', error, info.componentStack)
    }
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
            <AlertTriangleIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{i18n.t('common.fatalErrorTitle')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {i18n.t('common.fatalErrorDescription')}
            </p>
            {import.meta.env.DEV && this.state.message ? (
              <p className="text-muted-foreground mt-2 font-mono text-xs">{this.state.message}</p>
            ) : null}
          </div>
          <Button onClick={this.handleReload}>{i18n.t('common.reloadPage')}</Button>
        </div>
      </div>
    )
  }
}
