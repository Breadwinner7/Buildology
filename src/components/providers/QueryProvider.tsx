'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors except 408, 429
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
              return false
            }
          }
          return failureCount < 3
        }
      },
      mutations: {
        retry: (failureCount, error) => {
          // Don't retry mutations on client errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number
            if (status >= 400 && status < 500) {
              return false
            }
          }
          return failureCount < 2
        }
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}