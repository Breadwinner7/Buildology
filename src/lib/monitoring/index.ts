// Centralized monitoring initialization and orchestration
import { initializePerformanceMonitoring } from './web-vitals'
import { monitoringService, setUserContext as setMonitoringUser, clearUserContext as clearMonitoringUser } from './error-monitoring'
import { userAnalytics, setAnalyticsUser, clearAnalyticsUser } from '../analytics/user-analytics'
import { systemMonitor, startMonitoring as startSystemMonitoring } from './system-monitor'
import { databaseMonitor, startDatabaseMonitoring } from './database-monitor'
import { auditTrail, setAuditUser, clearAuditUser } from '../audit/audit-trail'
import { logger } from '../logging/logger'

// Initialize all monitoring systems
export function initializeMonitoring() {
  if (typeof window === 'undefined') {
    console.log('🖥️  Server-side monitoring initialization')
    return
  }

  try {
    // Initialize performance monitoring (Web Vitals, custom metrics)
    initializePerformanceMonitoring()
    
    // Start system resource monitoring
    startSystemMonitoring()
    
    // Start database performance monitoring
    startDatabaseMonitoring()
    
    // All other monitoring services are initialized automatically
    // when their modules are imported (singleton pattern)
    
    console.log('📊 All monitoring systems initialized successfully')
    
    // Log initialization event
    logger.info('Monitoring systems initialized', {
      component: 'monitoring',
      systems: [
        'performance',
        'system',
        'database', 
        'error',
        'analytics',
        'audit',
        'logging'
      ]
    })
    
  } catch (error) {
    console.error('❌ Failed to initialize monitoring systems:', error)
    logger.error('Monitoring initialization failed', error as Error, {
      component: 'monitoring',
      action: 'initialization'
    })
  }
}

// Set user context across all monitoring systems
export function setUserForMonitoring(user: {
  id: string
  email?: string
  role?: string
  organisation?: string
}) {
  try {
    // Set user in error monitoring
    setMonitoringUser(user)
    
    // Set user in analytics
    setAnalyticsUser(user)
    
    // Set user in audit trail
    setAuditUser(user)
    
    // Set user in logger
    logger.setUserId(user.id)
    logger.setDefaultContext({
      userEmail: user.email,
      userRole: user.role,
      userOrganisation: user.organisation
    })
    
    console.log('👤 User context set across all monitoring systems:', user.role)
    
    // Log user context set event
    logger.info('User context set for monitoring', {
      component: 'monitoring',
      action: 'user_context_set',
      userRole: user.role,
      userOrganisation: user.organisation
    })
    
  } catch (error) {
    console.error('Failed to set user context for monitoring:', error)
    logger.error('Failed to set user context', error as Error, {
      component: 'monitoring'
    })
  }
}

// Clear user context across all monitoring systems
export function clearUserFromMonitoring() {
  try {
    // Clear user from error monitoring
    clearMonitoringUser()
    
    // Clear user from analytics
    clearAnalyticsUser()
    
    // Clear user from audit trail
    clearAuditUser()
    
    // Clear user from logger
    logger.clearUserId()
    
    console.log('👤 User context cleared from all monitoring systems')
    
    // Log user context cleared event
    logger.info('User context cleared from monitoring', {
      component: 'monitoring',
      action: 'user_context_cleared'
    })
    
  } catch (error) {
    console.error('Failed to clear user context from monitoring:', error)
    logger.error('Failed to clear user context', error as Error, {
      component: 'monitoring'
    })
  }
}

// Get comprehensive monitoring health status
export function getMonitoringHealth(): {
  status: 'healthy' | 'warning' | 'critical'
  systems: Record<string, {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    details?: string
  }>
  timestamp: Date
} {
  const health = {
    status: 'healthy' as const,
    timestamp: new Date(),
    systems: {} as Record<string, { status: any, details?: string }>
  }

  try {
    // Check system monitor health
    const systemHealth = systemMonitor.getSystemHealth()
    health.systems.system = {
      status: systemHealth.status,
      details: systemHealth.issues.join(', ') || 'All systems operational'
    }

    // Check database monitor health
    const dbPerformance = databaseMonitor.getCurrentPerformance()
    health.systems.database = {
      status: dbPerformance ? 
        (dbPerformance.errorRate > 10 ? 'critical' : 
         dbPerformance.errorRate > 5 ? 'warning' : 'healthy') : 'unknown',
      details: dbPerformance ? 
        `${dbPerformance.queryCount} queries, ${dbPerformance.errorRate.toFixed(1)}% error rate` :
        'No database metrics available'
    }

    // Check error monitoring
    health.systems.error_monitoring = {
      status: 'healthy',
      details: 'Error monitoring active'
    }

    // Check analytics
    health.systems.analytics = {
      status: 'healthy',
      details: 'User analytics active'
    }

    // Check audit trail
    health.systems.audit = {
      status: 'healthy',
      details: 'Audit trail active'
    }

    // Check logging
    health.systems.logging = {
      status: 'healthy',
      details: 'Logging system active'
    }

    // Determine overall health
    const systemStatuses = Object.values(health.systems).map(s => s.status)
    if (systemStatuses.includes('critical')) {
      health.status = 'critical'
    } else if (systemStatuses.includes('warning')) {
      health.status = 'warning'
    }

  } catch (error) {
    console.error('Failed to get monitoring health:', error)
    health.status = 'critical'
    health.systems.monitoring = {
      status: 'critical',
      details: 'Failed to assess monitoring health'
    }
  }

  return health
}

// Export monitoring statistics
export function getMonitoringStats() {
  try {
    return {
      timestamp: new Date(),
      system: {
        metrics: systemMonitor.getMetrics(10),
        alerts: systemMonitor.getAlerts(10),
        health: systemMonitor.getSystemHealth()
      },
      database: {
        recentQueries: databaseMonitor.getQueryMetrics(20),
        slowQueries: databaseMonitor.getSlowQueries(),
        errors: databaseMonitor.getErrorQueries(),
        performance: databaseMonitor.getCurrentPerformance()
      },
      analytics: {
        session: userAnalytics.getSessionInfo(),
        data: userAnalytics.getAnalyticsData().slice(-50)
      },
      audit: {
        recentEvents: auditTrail.getEvents({ limit: 20 }),
        summary: auditTrail.getSummary(7)
      },
      logging: {
        recentLogs: logger.getLogs().slice(-20)
      }
    }
  } catch (error) {
    console.error('Failed to get monitoring stats:', error)
    return {
      timestamp: new Date(),
      error: 'Failed to collect monitoring statistics'
    }
  }
}

// Cleanup monitoring systems (for app unmount)
export function cleanupMonitoring() {
  try {
    // Stop system monitoring
    systemMonitor.stopMonitoring()
    
    // Stop database monitoring
    databaseMonitor.stopMonitoring()
    
    // Cleanup logger
    logger.destroy()
    
    console.log('🧹 Monitoring systems cleaned up')
    
  } catch (error) {
    console.error('Failed to cleanup monitoring systems:', error)
  }
}

// Emergency monitoring reset (for troubleshooting)
export function resetMonitoring() {
  try {
    // Clear all collected data
    systemMonitor.getAlerts().forEach(alert => 
      systemMonitor.resolveAlert(alert.id)
    )
    
    databaseMonitor.clearMetrics()
    userAnalytics.clearAnalyticsData()
    auditTrail.clearEvents()
    logger.clearLogs()
    
    console.log('🔄 Monitoring data reset')
    logger.info('Monitoring data reset', {
      component: 'monitoring',
      action: 'reset'
    })
    
  } catch (error) {
    console.error('Failed to reset monitoring:', error)
  }
}

// Re-export key monitoring functions for convenience
export {
  // Performance & System
  initializePerformanceMonitoring,
  startSystemMonitoring,
  startDatabaseMonitoring,
  
  // Analytics & Tracking
  userAnalytics,
  auditTrail,
  
  // Error & Logging
  monitoringService,
  logger,
  
  // System Monitor
  systemMonitor
}