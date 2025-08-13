import { QueryClient } from '@tanstack/react-query'
import type { PERFORMANCE_CONFIG } from '@/lib/constants/performance'

// Cache keys factory for consistency
export const cacheKeys = {
  // User data
  user: ['user'] as const,
  userProfile: (id: string) => ['user', 'profile', id] as const,
  userPermissions: (id: string) => ['user', 'permissions', id] as const,
  
  // Projects
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectTasks: (id: string) => ['projects', id, 'tasks'] as const,
  projectDocuments: (id: string) => ['projects', id, 'documents'] as const,
  projectReserves: (id: string) => ['projects', id, 'reserves'] as const,
  projectFinancials: (id: string) => ['projects', id, 'financials'] as const,
  
  // Documents
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  
  // Tasks
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  
  // Messages
  messages: ['messages'] as const,
  messageThread: (id: string) => ['messages', 'thread', id] as const,
  
  // Dashboard
  dashboardKpis: ['dashboard', 'kpis'] as const,
  dashboardRecentProjects: ['dashboard', 'recent-projects'] as const,
  dashboardTasks: ['dashboard', 'tasks'] as const,
  
  // Notifications
  notifications: ['notifications'] as const,
  unreadNotifications: ['notifications', 'unread'] as const,
  
  // Reports
  reports: ['reports'] as const,
  report: (id: string) => ['reports', id] as const,
} as const

// Cache configuration for different data types
export const cacheConfig = {
  // Fast-changing data (30 seconds stale, 2 minutes cache)
  realtime: {
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  },
  
  // Moderate-changing data (5 minutes stale, 15 minutes cache)
  dynamic: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  
  // Slow-changing data (30 minutes stale, 1 hour cache)
  stable: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  
  // Static data (1 hour stale, 24 hours cache)
  static: {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  },
  
  // User session data (until logout)
  session: {
    staleTime: Infinity,
    gcTime: Infinity,
  },
} as const

// Cache invalidation service
export class CacheInvalidationService {
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  // Project-related invalidations
  invalidateProject(projectId: string) {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.project(projectId) })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.projects })
  }

  invalidateProjectTasks(projectId: string) {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.projectTasks(projectId) })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.tasks })
  }

  invalidateProjectDocuments(projectId: string) {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.projectDocuments(projectId) })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.documents })
  }

  invalidateProjectReserves(projectId: string) {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.projectReserves(projectId) })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.projectFinancials(projectId) })
  }

  // Dashboard invalidations
  invalidateDashboard() {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.dashboardKpis })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.dashboardRecentProjects })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.dashboardTasks })
  }

  // User-related invalidations
  invalidateUserData(userId?: string) {
    if (userId) {
      this.queryClient.invalidateQueries({ queryKey: cacheKeys.userProfile(userId) })
      this.queryClient.invalidateQueries({ queryKey: cacheKeys.userPermissions(userId) })
    }
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.user })
  }

  // Notifications
  invalidateNotifications() {
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.notifications })
    this.queryClient.invalidateQueries({ queryKey: cacheKeys.unreadNotifications })
  }

  // Clear all cache
  clearAllCache() {
    this.queryClient.clear()
  }

  // Remove specific cache entries
  removeCacheEntry(queryKey: unknown[]) {
    this.queryClient.removeQueries({ queryKey })
  }

  // Prefetch data for better UX
  async prefetchProject(projectId: string, fetcher: () => Promise<any>) {
    await this.queryClient.prefetchQuery({
      queryKey: cacheKeys.project(projectId),
      queryFn: fetcher,
      ...cacheConfig.dynamic,
    })
  }

  async prefetchProjectTasks(projectId: string, fetcher: () => Promise<any>) {
    await this.queryClient.prefetchQuery({
      queryKey: cacheKeys.projectTasks(projectId),
      queryFn: fetcher,
      ...cacheConfig.dynamic,
    })
  }

  // Set cache data directly (useful for optimistic updates)
  setProjectData(projectId: string, data: any) {
    this.queryClient.setQueryData(cacheKeys.project(projectId), data)
  }

  setProjectsData(updater: (oldData: any) => any) {
    this.queryClient.setQueryData(cacheKeys.projects, updater)
  }

  // Get cached data
  getProjectData(projectId: string) {
    return this.queryClient.getQueryData(cacheKeys.project(projectId))
  }

  getProjectsData() {
    return this.queryClient.getQueryData(cacheKeys.projects)
  }
}

// Browser storage cache for offline functionality
export class BrowserCacheService {
  private storageKey = 'buildology_cache'
  private maxAge = 24 * 60 * 60 * 1000 // 24 hours

  // Store data with timestamp
  set(key: string, data: any, maxAge?: number) {
    if (typeof window === 'undefined') return

    try {
      const item = {
        data,
        timestamp: Date.now(),
        maxAge: maxAge || this.maxAge,
      }

      const cache = this.getCache()
      cache[key] = item
      localStorage.setItem(this.storageKey, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  // Get data if not expired
  get(key: string) {
    if (typeof window === 'undefined') return null

    try {
      const cache = this.getCache()
      const item = cache[key]

      if (!item) return null

      const isExpired = Date.now() - item.timestamp > item.maxAge
      if (isExpired) {
        this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error)
      return null
    }
  }

  // Remove specific cache entry
  remove(key: string) {
    if (typeof window === 'undefined') return

    try {
      const cache = this.getCache()
      delete cache[key]
      localStorage.setItem(this.storageKey, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to remove cached data:', error)
    }
  }

  // Clear all cache
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.storageKey)
  }

  // Clean expired entries
  cleanup() {
    if (typeof window === 'undefined') return

    try {
      const cache = this.getCache()
      const now = Date.now()
      let hasExpired = false

      for (const [key, item] of Object.entries(cache)) {
        if (now - item.timestamp > item.maxAge) {
          delete cache[key]
          hasExpired = true
        }
      }

      if (hasExpired) {
        localStorage.setItem(this.storageKey, JSON.stringify(cache))
      }
    } catch (error) {
      console.warn('Failed to cleanup cache:', error)
    }
  }

  private getCache(): Record<string, any> {
    if (typeof window === 'undefined') return {}

    try {
      const cache = localStorage.getItem(this.storageKey)
      return cache ? JSON.parse(cache) : {}
    } catch (error) {
      console.warn('Failed to parse cached data:', error)
      return {}
    }
  }

  // Get cache statistics
  getStats() {
    if (typeof window === 'undefined') return { size: 0, entries: 0 }

    try {
      const cache = this.getCache()
      const cacheString = JSON.stringify(cache)
      
      return {
        size: new Blob([cacheString]).size, // Size in bytes
        entries: Object.keys(cache).length,
        keys: Object.keys(cache),
      }
    } catch (error) {
      return { size: 0, entries: 0 }
    }
  }
}

// Singleton instances
export const browserCache = new BrowserCacheService()

// Auto cleanup on app start
if (typeof window !== 'undefined') {
  browserCache.cleanup()
  
  // Cleanup every hour
  setInterval(() => {
    browserCache.cleanup()
  }, 60 * 60 * 1000)
}