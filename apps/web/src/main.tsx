import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/archivo/wdth.css'
import '@/styles/globals.css'
import '@/lib/i18n'

import { AppErrorBoundary } from '@/app/error-boundary'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
)

// Real-user Web Vitals, in production builds only. Loaded as its own chunk
// after the app so it never competes with the first render; web-vitals reads
// buffered performance entries, so starting late loses nothing.
if (import.meta.env.PROD) {
  void import('@/lib/rum').then(({ startRum }) => startRum())
}
