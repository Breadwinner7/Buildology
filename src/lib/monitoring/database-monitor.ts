import { createClient } from '@/lib/supabase/client'
import { capturePerformance, captureError } from './error-monitoring'

// Database performance monitoring for Supabase
export interface DatabaseMetrics {
  timestamp: Date
  connectionCount?: number
  queryCount: number
  slowQueryCount: number
  averageResponseTime: number
  errorRate: number
  cacheHitRate?: number
  activeQueries?: number
  connectionPoolUsage?: number
}

export interface QueryMetrics {
  query: string
  table: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC'
  duration: number
  timestamp: Date
  userId?: string
  success: boolean
  error?: string
  rowsAffected?: number
}

class DatabaseMonitor {
  private static instance: DatabaseMonitor
  private queryMetrics: QueryMetrics[] = []
  private isMonitoring = false
  private metricsHistory = 1000 // Keep last 1000 queries
  private slowQueryThreshold = 5000 // 5 seconds
  private performanceInterval?: NodeJS.Timeout

  private constructor() {
    this.initialize()
  }

  public static getInstance(): DatabaseMonitor {
    if (!this.instance) {
      this.instance = new DatabaseMonitor()
    }
    return this.instance
  }

  private initialize() {
    if (typeof window !== 'undefined') {
      this.startMonitoring()
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.interceptSupabaseQueries()
    this.startPerformanceCollection()

    console.log('🗃️  Database monitoring started')
  }

  stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval)
    }

    console.log('🗃️  Database monitoring stopped')
  }

  // Intercept Supabase queries for monitoring
  private interceptSupabaseQueries() {
    if (typeof window === 'undefined') return

    const supabase = createClient()
    
    // Store original methods
    const originalFrom = supabase.from.bind(supabase)
    const originalRpc = supabase.rpc.bind(supabase)

    // Intercept table operations
    supabase.from = (table: string) => {
      const builder = originalFrom(table)
      
      // Intercept common operations
      const originalSelect = builder.select.bind(builder)
      const originalInsert = builder.insert.bind(builder)
      const originalUpdate = builder.update.bind(builder)
      const originalDelete = builder.delete.bind(builder)

      builder.select = (...args: any[]) => {
        return this.wrapQuery(() => originalSelect(...args), table, 'SELECT')
      }

      builder.insert = (...args: any[]) => {
        return this.wrapQuery(() => originalInsert(...args), table, 'INSERT')
      }

      builder.update = (...args: any[]) => {
        return this.wrapQuery(() => originalUpdate(...args), table, 'UPDATE')
      }

      builder.delete = (...args: any[]) => {
        return this.wrapQuery(() => originalDelete(...args), table, 'DELETE')
      }

      return builder
    }

    // Intercept RPC calls
    supabase.rpc = (fnName: string, ...args: any[]) => {
      return this.wrapQuery(() => originalRpc(fnName, ...args), fnName, 'RPC')
    }
  }

  // Wrap queries with performance monitoring
  private wrapQuery(queryFn: Function, table: string, operation: QueryMetrics['operation']) {
    const startTime = Date.now()
    
    // Create a proxy to intercept the final query execution
    const builder = queryFn()
    
    // Common final methods that execute queries
    const finalMethods = ['then', 'single', 'maybeSingle', 'csv', 'explain']
    
    finalMethods.forEach(method => {
      if (builder[method]) {
        const originalMethod = builder[method].bind(builder)
        builder[method] = (...args: any[]) => {
          return this.executeMonitoredQuery(
            () => originalMethod(...args),
            table,
            operation,
            startTime
          )
        }
      }
    })

    return builder
  }

  // Execute query with monitoring
  private async executeMonitoredQuery(
    queryFn: Function, 
    table: string, 
    operation: QueryMetrics['operation'], 
    startTime: number
  ) {
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime

      const metrics: QueryMetrics = {
        query: this.generateQuerySignature(table, operation),
        table,
        operation,
        duration,
        timestamp: new Date(),
        success: true,
        rowsAffected: this.extractRowCount(result)
      }

      this.recordQueryMetrics(metrics)
      
      // Alert on slow queries
      if (duration > this.slowQueryThreshold) {
        this.handleSlowQuery(metrics)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      const metrics: QueryMetrics = {
        query: this.generateQuerySignature(table, operation),
        table,
        operation,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      this.recordQueryMetrics(metrics)
      this.handleQueryError(metrics, error as Error)
      
      throw error
    }
  }

  // Record query metrics
  private recordQueryMetrics(metrics: QueryMetrics) {
    this.queryMetrics.push(metrics)
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.metricsHistory) {
      this.queryMetrics.shift()
    }

    // Send to monitoring service
    capturePerformance({
      name: `db_query_${metrics.operation.toLowerCase()}`,
      value: metrics.duration,
      unit: 'ms',
      timestamp: metrics.timestamp,
      context: {
        table: metrics.table,
        operation: metrics.operation,
        success: metrics.success,
        rowsAffected: metrics.rowsAffected
      }
    })
  }

  // Handle slow queries
  private handleSlowQuery(metrics: QueryMetrics) {
    console.warn('🐌 Slow database query detected:', {
      table: metrics.table,
      operation: metrics.operation,
      duration: `${metrics.duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`
    })

    captureError(new Error(`Slow query detected: ${metrics.query}`), {
      severity: 'medium',
      component: 'database',
      action: 'slow_query',
      metadata: {
        table: metrics.table,
        operation: metrics.operation,
        duration: metrics.duration,
        threshold: this.slowQueryThreshold
      }
    })
  }

  // Handle query errors
  private handleQueryError(metrics: QueryMetrics, error: Error) {
    console.error('❌ Database query error:', {
      table: metrics.table,
      operation: metrics.operation,
      duration: `${metrics.duration}ms`,
      error: error.message
    })

    captureError(error, {
      severity: 'high',
      component: 'database',
      action: 'query_error',
      metadata: {
        table: metrics.table,
        operation: metrics.operation,
        duration: metrics.duration,
        query: metrics.query
      }
    })
  }

  // Start collecting performance metrics
  private startPerformanceCollection() {
    this.performanceInterval = setInterval(() => {
      this.collectPerformanceMetrics()
    }, 60000) // Every minute
  }

  // Collect database performance metrics
  private collectPerformanceMetrics() {
    const now = new Date()
    const lastMinute = new Date(now.getTime() - 60000)
    
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= lastMinute)
    
    if (recentQueries.length === 0) return

    const successfulQueries = recentQueries.filter(q => q.success)
    const errorQueries = recentQueries.filter(q => !q.success)
    const slowQueries = recentQueries.filter(q => q.duration > this.slowQueryThreshold)

    const totalResponseTime = recentQueries.reduce((sum, q) => sum + q.duration, 0)
    const averageResponseTime = totalResponseTime / recentQueries.length

    const metrics: DatabaseMetrics = {
      timestamp: now,
      queryCount: recentQueries.length,
      slowQueryCount: slowQueries.length,
      averageResponseTime,
      errorRate: (errorQueries.length / recentQueries.length) * 100
    }

    console.log('🗃️  Database Performance:', {
      queries: metrics.queryCount,
      avgTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
      slowQueries: metrics.slowQueryCount,
      errorRate: `${metrics.errorRate.toFixed(2)}%`
    })

    // Send aggregated metrics
    capturePerformance({
      name: 'db_performance_summary',
      value: averageResponseTime,
      unit: 'ms',
      timestamp: now,
      context: {
        queryCount: metrics.queryCount,
        slowQueryCount: metrics.slowQueryCount,
        errorRate: metrics.errorRate
      }
    })

    // Alert on high error rate
    if (metrics.errorRate > 10) {
      captureError(new Error(`High database error rate: ${metrics.errorRate.toFixed(2)}%`), {
        severity: 'high',
        component: 'database',
        action: 'high_error_rate',
        metadata: metrics
      })
    }

    // Alert on too many slow queries
    if (metrics.slowQueryCount > metrics.queryCount * 0.2) { // More than 20% slow
      captureError(new Error(`High slow query rate: ${metrics.slowQueryCount}/${metrics.queryCount}`), {
        severity: 'medium',
        component: 'database',
        action: 'high_slow_query_rate',
        metadata: metrics
      })
    }
  }

  // Helper methods
  private generateQuerySignature(table: string, operation: string): string {
    return `${operation} ${table}`
  }

  private extractRowCount(result: any): number | undefined {
    if (result && typeof result === 'object') {
      if ('count' in result) return result.count
      if ('data' in result && Array.isArray(result.data)) return result.data.length
    }
    return undefined
  }

  // Public API methods
  getQueryMetrics(count = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-count)
  }

  getSlowQueries(threshold = this.slowQueryThreshold): QueryMetrics[] {
    return this.queryMetrics.filter(q => q.duration > threshold)
  }

  getErrorQueries(): QueryMetrics[] {
    return this.queryMetrics.filter(q => !q.success)
  }

  getTableMetrics(table: string): {
    totalQueries: number
    averageTime: number
    errorRate: number
    slowQueries: number
  } {
    const tableQueries = this.queryMetrics.filter(q => q.table === table)
    
    if (tableQueries.length === 0) {
      return { totalQueries: 0, averageTime: 0, errorRate: 0, slowQueries: 0 }
    }

    const totalTime = tableQueries.reduce((sum, q) => sum + q.duration, 0)
    const errors = tableQueries.filter(q => !q.success).length
    const slowQueries = tableQueries.filter(q => q.duration > this.slowQueryThreshold).length

    return {
      totalQueries: tableQueries.length,
      averageTime: totalTime / tableQueries.length,
      errorRate: (errors / tableQueries.length) * 100,
      slowQueries
    }
  }

  getCurrentPerformance(): DatabaseMetrics | null {
    const now = new Date()
    const last5Minutes = new Date(now.getTime() - 300000) // 5 minutes
    
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= last5Minutes)
    
    if (recentQueries.length === 0) return null

    const successfulQueries = recentQueries.filter(q => q.success)
    const errorQueries = recentQueries.filter(q => !q.success)
    const slowQueries = recentQueries.filter(q => q.duration > this.slowQueryThreshold)

    const totalResponseTime = successfulQueries.reduce((sum, q) => sum + q.duration, 0)
    const averageResponseTime = successfulQueries.length > 0 ? 
      totalResponseTime / successfulQueries.length : 0

    return {
      timestamp: now,
      queryCount: recentQueries.length,
      slowQueryCount: slowQueries.length,
      averageResponseTime,
      errorRate: (errorQueries.length / recentQueries.length) * 100
    }
  }

  // Clear metrics
  clearMetrics() {
    this.queryMetrics = []
    console.log('🗃️  Database metrics cleared')
  }

  // Update slow query threshold
  setSlowQueryThreshold(threshold: number) {
    this.slowQueryThreshold = threshold
    console.log(`🗃️  Slow query threshold updated to ${threshold}ms`)
  }
}

// Export singleton
export const databaseMonitor = DatabaseMonitor.getInstance()

// Convenience functions
export const startDatabaseMonitoring = () => databaseMonitor.startMonitoring()
export const stopDatabaseMonitoring = () => databaseMonitor.stopMonitoring()
export const getDatabaseMetrics = (count?: number) => databaseMonitor.getQueryMetrics(count)
export const getSlowQueries = (threshold?: number) => databaseMonitor.getSlowQueries(threshold)
export const getDatabaseErrors = () => databaseMonitor.getErrorQueries()
export const getTablePerformance = (table: string) => databaseMonitor.getTableMetrics(table)
export const getCurrentDatabasePerformance = () => databaseMonitor.getCurrentPerformance()

// React hook for database monitoring
export function useDatabaseMonitor() {
  return {
    startMonitoring: startDatabaseMonitoring,
    stopMonitoring: stopDatabaseMonitoring,
    getMetrics: getDatabaseMetrics,
    getSlowQueries,
    getErrors: getDatabaseErrors,
    getTablePerformance,
    getCurrentPerformance: getCurrentDatabasePerformance,
    clearMetrics: () => databaseMonitor.clearMetrics(),
    setSlowQueryThreshold: (threshold: number) => databaseMonitor.setSlowQueryThreshold(threshold)
  }
}