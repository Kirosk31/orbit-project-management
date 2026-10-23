import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrandProvider } from '@/features/theme/brand-provider'
import { ThemeProvider } from '@/features/theme/theme-provider'
import { LocalePreferenceSync } from '@/features/i18n/locale-preference-sync'
import { createQueryClient } from '@/lib/query-client'

export function AppProviders({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <LocalePreferenceSync />
      <ThemeProvider>
        <BrandProvider>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </BrandProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
