/**
 * Advanced caching and data synchronization system
 * Enterprise-grade caching with offline support and real-time sync
 */

import { QueryClient } from '@tanstack/react-query'

// Cache configuration interface
export interface CacheConfig {
  staleTime: number
  cacheTime: number
  refetchInterval?: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
  retry: number | boolean
  retryDelay: (attemptIndex: number) => number
}

// Default cache configurations for different data types
export const CacheConfigs: Record<string, CacheConfig> = {
  // Static/rarely changing data
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: () => 1000
  },

  // User data
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  },

  // Dynamic/frequently changing data
  dynamic: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  },

  // Real-time data
  realtime: {
    staleTime: 0, // Always stale
    cacheTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 15 * 1000, // 15 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000)
  },

  // Critical data
  critical: {
    staleTime: 10 * 1000, // 10 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 3000)
  }
}

// Advanced query client with optimized defaults
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...CacheConfigs.dynamic,
        networkMode: 'offlineFirst',
        // Exponential backoff with jitter
        retryDelay: (attemptIndex) => {
          const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000)
          const jitter = Math.random() * 0.1 * baseDelay
          return baseDelay + jitter
        }
      },
      mutations: {
        networkMode: 'offlineFirst',
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
      }
    }
  })
}

// Cache invalidation patterns
export const CachePatterns = {
  // Invalidate all user-related data
  invalidateUser: (queryClient: QueryClient, userId?: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user', userId] }),
      queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    ])
  },

  // Invalidate project-related data
  invalidateProject: (queryClient: QueryClient, projectId?: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] })
    ])
  },

  // Invalidate dashboard data
  invalidateDashboard: (queryClient: QueryClient) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    ])
  },

  // Invalidate all caches (use sparingly)
  invalidateAll: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries()
  }
}

// Offline storage utilities
export const OfflineStorage = {
  // Store data for offline access
  store: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      }))
    } catch (error) {
      console.warn('Failed to store offline data:', error)
    }
  },

  // Retrieve data from offline storage
  retrieve: <T>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(`offline_${key}`)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(`offline_${key}`)
        return null
      }

      return parsed.data
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error)
      return null
    }
  },

  // Clear offline data
  clear: (key?: string): void => {
    try {
      if (key) {
        localStorage.removeItem(`offline_${key}`)
      } else {
        // Clear all offline data
        const keys = Object.keys(localStorage).filter(k => k.startsWith('offline_'))
        keys.forEach(k => localStorage.removeItem(k))
      }
    } catch (error) {
      console.warn('Failed to clear offline data:', error)
    }
  },

  // Get storage usage info
  getUsageInfo: () => {
    try {
      const offlineKeys = Object.keys(localStorage).filter(k => k.startsWith('offline_'))
      const totalSize = offlineKeys.reduce((size, key) => {
        const item = localStorage.getItem(key)
        return size + (item ? item.length : 0)
      }, 0)

      return {
        keys: offlineKeys.length,
        sizeBytes: totalSize,
        sizeKB: Math.round(totalSize / 1024),
        sizeMB: Math.round(totalSize / (1024 * 1024))
      }
    } catch (error) {
      console.warn('Failed to get storage info:', error)
      return { keys: 0, sizeBytes: 0, sizeKB: 0, sizeMB: 0 }
    }
  }
}

// Cache warming utilities
export const CacheWarming = {
  // Warm critical data caches on app start
  warmCriticalCaches: async (queryClient: QueryClient) => {
    const criticalQueries = [
      'user',
      'user-profile',
      'dashboard-metrics',
      'notifications'
    ]

    await Promise.allSettled(
      criticalQueries.map(queryKey =>
        queryClient.prefetchQuery({
          queryKey: [queryKey],
          staleTime: CacheConfigs.critical.staleTime
        })
      )
    )
  },

  // Preload user-specific data
  preloadUserData: async (queryClient: QueryClient, userId: string) => {
    const userQueries = [
      ['user', userId],
      ['user-profile', userId],
      ['user-preferences', userId],
      ['recent-projects', userId]
    ]

    await Promise.allSettled(
      userQueries.map(queryKey =>
        queryClient.prefetchQuery({
          queryKey,
          staleTime: CacheConfigs.user.staleTime
        })
      )
    )
  },

  // Preload project data when navigating
  preloadProjectData: async (queryClient: QueryClient, projectId: string) => {
    const projectQueries = [
      ['project', projectId],
      ['project-tasks', projectId],
      ['project-messages', projectId],
      ['project-documents', projectId]
    ]

    await Promise.allSettled(
      projectQueries.map(queryKey =>
        queryClient.prefetchQuery({
          queryKey,
          staleTime: CacheConfigs.dynamic.staleTime
        })
      )
    )
  }
}

// Background sync utilities
export const BackgroundSync = {
  // Setup background sync for when app comes back online
  setupSync: (queryClient: QueryClient) => {
    // Listen for online/offline events
    const handleOnline = () => {
      console.log('App came online, refreshing critical data')
      queryClient.refetchQueries({ stale: true })
    }

    const handleOffline = () => {
      console.log('App went offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },

  // Periodic background refresh
  setupPeriodicRefresh: (queryClient: QueryClient, interval = 5 * 60 * 1000) => {
    const refreshCriticalData = () => {
      if (document.visibilityState === 'visible') {
        queryClient.refetchQueries({
          queryKey: ['dashboard'],
          stale: true
        })
        queryClient.refetchQueries({
          queryKey: ['notifications'],
          stale: true
        })
      }
    }

    const intervalId = setInterval(refreshCriticalData, interval)
    
    return () => clearInterval(intervalId)
  }
}

// Cache performance monitoring
export const CacheMonitoring = {
  // Log cache statistics
  logCacheStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length
    }

    console.log('Cache Statistics:', stats)
    return stats
  },

  // Monitor query performance
  monitorQueryPerformance: (queryKey: string, duration: number) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const actualDuration = endTime - startTime
      
      if (actualDuration > duration * 1.5) {
        console.warn(`Query ${queryKey} took ${actualDuration}ms (expected ${duration}ms)`)
      }
    }
  }
}

// Cache debugging utilities
export const CacheDebug = {
  // Get detailed cache information
  getCacheInfo: (queryClient: QueryClient, queryKey?: string) => {
    const cache = queryClient.getQueryCache()
    
    if (queryKey) {
      const query = cache.find({ queryKey: [queryKey] })
      return {
        queryKey,
        state: query?.state,
        isStale: query?.isStale(),
        isFetching: query?.isFetching(),
        lastUpdated: query?.state.dataUpdatedAt,
        error: query?.state.error
      }
    }

    return cache.getAll().map(query => ({
      queryKey: query.queryKey,
      state: query.state.status,
      isStale: query.isStale(),
      isFetching: query.isFetching(),
      lastUpdated: query.state.dataUpdatedAt
    }))
  },

  // Clear specific query cache
  clearQuery: (queryClient: QueryClient, queryKey: string) => {
    queryClient.removeQueries({ queryKey: [queryKey] })
  }
}

// Export utility functions for easy import
export const cacheUtils = {
  ...CachePatterns,
  ...OfflineStorage,
  ...CacheWarming,
  ...BackgroundSync,
  ...CacheMonitoring,
  ...CacheDebug
}