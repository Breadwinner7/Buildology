'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { cacheConfig, CacheInvalidationService, browserCache } from '@/lib/caching/cache-service'
import { captureException } from '@/lib/error-handling/error-service'

// Enhanced query client with sophisticated error handling and caching
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Use stable cache configuration for most queries
        ...cacheConfig.stable,
        
        // Enhanced retry logic
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.response?.status) {
            const status = error.response.status
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
              return false
            }
          }
          
          // Don't retry on auth errors
          if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
            return false
          }
          
          // Maximum 3 retries with exponential backoff
          return failureCount < 3
        },
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Global error handling
        onError: (error: any) => {
          // Capture error for monitoring
          captureException(error, {
            context: 'TanStack Query',
            type: 'query_error',
          })

          console.error('Query Error:', error)
        },

        // Network mode configuration
        networkMode: 'online',
        
        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      
      mutations: {
        // Retry mutations only on network errors
        retry: (failureCount, error: any) => {
          // Don't retry on client errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false
          }
          
          return failureCount < 2
        },
        
        // Global mutation error handling
        onError: (error: any) => {
          captureException(error, {
            context: 'TanStack Query',
            type: 'mutation_error',
          })

          console.error('Mutation Error:', error)
        },

        // Network mode for mutations
        networkMode: 'online',
      },
    },
    
    // Query cache configuration
    queryCache: new QueryCache({
      onError: (error: any, query: any) => {
        console.error(`Query failed: ${query.queryKey}`, error)
        
        // Store failed query info for debugging
        if (process.env.NODE_ENV === 'development') {
          browserCache.set(
            `failed_query_${Date.now()}`,
            {
              queryKey: query.queryKey,
              error: error.message,
              timestamp: new Date().toISOString(),
            },
            5 * 60 * 1000 // 5 minutes
          )
        }
      },
      
      onSuccess: (data: any, query: any) => {
        // Cache successful queries to browser storage for offline access
        if (query.queryKey[0] === 'user' || query.queryKey[0] === 'dashboard') {
          browserCache.set(
            `query_${query.queryKey.join('_')}`,
            data,
            cacheConfig.stable.staleTime
          )
        }
      },
    }),
    
    // Mutation cache configuration  
    mutationCache: new MutationCache({
      onError: (error: any, _variables: any, _context: any, mutation: any) => {
        console.error('Mutation failed:', mutation, error)
      },
      
      onSuccess: (data: any, _variables: any, _context: any, mutation: any) => {
        console.log('Mutation succeeded:', mutation, data)
      },
    }),
  })
}

// Enhanced Query Provider with cache invalidation service
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const [cacheService] = useState(() => new CacheInvalidationService(queryClient))

  // Setup global cache invalidation patterns
  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 Connection restored - invalidating stale queries')
      queryClient.invalidateQueries()
    }

    const handleOffline = () => {
      console.log('📴 Connection lost - using cached data')
    }

    // Listen for visibility change to invalidate on tab focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab focused - refreshing critical data')
        // Only invalidate critical real-time data
        cacheService.invalidateDashboard()
        cacheService.invalidateNotifications()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queryClient, cacheService])

  // Provide cache service to components
  useEffect(() => {
    // Make cache service available globally for debugging
    if (process.env.NODE_ENV === 'development') {
      ;(window as any).__cacheService = cacheService
      ;(window as any).__queryClient = queryClient
    }
  }, [cacheService, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: `scale(.7)`,
              transformOrigin: 'bottom right',
            },
          }}
        />
      )}
    </QueryClientProvider>
  )
}

// Custom hook to access cache invalidation service
export function useCacheInvalidation() {
  return new CacheInvalidationService((window as any).__queryClient)
}