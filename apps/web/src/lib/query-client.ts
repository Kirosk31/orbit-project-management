import { QueryClient } from '@tanstack/react-query'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof Error && error.name === 'AbortError') return false
          return failureCount < 1
        },
        refetchOnWindowFocus: 'always',
      },
      mutations: {
        retry: false,
      },
    },
  })
}
