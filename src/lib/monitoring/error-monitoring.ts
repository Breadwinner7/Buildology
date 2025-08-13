import { captureException } from '@/lib/error-handling/error-service'

// Enhanced error monitoring for production insurance platform
export interface ErrorContext {
  // User context
  userId?: string
  userRole?: string
  userOrganisation?: string
  
  // Request context
  url?: string
  userAgent?: string
  ipAddress?: string
  sessionId?: string
  
  // Business context
  projectId?: string
  claimReference?: string
  documentId?: string
  transactionId?: string
  
  // Technical context
  component?: string
  action?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  
  // Additional metadata
  metadata?: Record<string, any>
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  timestamp: Date
  context?: Record<string, any>
}

export interface SecurityEvent {
  type: 'auth_failure' | 'unauthorized_access' | 'data_breach_attempt' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: string
  timestamp: Date
}

export interface BusinessEvent {
  type: 'claim_created' | 'payment_processed' | 'document_uploaded' | 'approval_granted'
  projectId?: string
  claimReference?: string
  amount?: number
  currency?: string
  userId: string
  timestamp: Date
  metadata?: Record<string, any>
}

class EnhancedMonitoringService {
  private static instance: EnhancedMonitoringService
  private sessionId: string
  private userId?: string
  private userContext?: Record<string, any>

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeMonitoring()
  }

  public static getInstance(): EnhancedMonitoringService {
    if (!this.instance) {
      this.instance = new EnhancedMonitoringService()
    }
    return this.instance
  }

  // Initialize monitoring
  private initializeMonitoring() {
    if (typeof window === 'undefined') return

    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        component: 'window',
        action: 'unhandled_error',
        severity: 'high',
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        component: 'window',
        action: 'unhandled_promise_rejection',
        severity: 'high',
        metadata: {
          reason: event.reason,
        },
      })
    })

    // Track performance issues
    this.monitorPerformance()
    
    // Track security events
    this.monitorSecurity()

    console.log('🔍 Enhanced monitoring initialized')
  }

  // Set user context for all subsequent events
  setUserContext(user: {
    id: string
    role: string
    organisation?: string
    email?: string
  }) {
    this.userId = user.id
    this.userContext = {
      role: user.role,
      organisation: user.organisation,
      email: user.email,
    }
    
    console.log('👤 User context set for monitoring:', user.role)
  }

  // Clear user context on logout
  clearUserContext() {
    this.userId = undefined
    this.userContext = undefined
    this.sessionId = this.generateSessionId()
    
    console.log('👤 User context cleared')
  }

  // Capture application errors with enhanced context
  captureError(error: Error, context: ErrorContext = {}) {
    const enhancedContext: ErrorContext = {
      ...context,
      userId: context.userId || this.userId,
      userRole: context.userRole || this.userContext?.role,
      userOrganisation: context.userOrganisation || this.userContext?.organisation,
      url: context.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      userAgent: context.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : undefined),
      sessionId: this.sessionId,
    }

    // Use existing error service
    captureException(error, enhancedContext)

    // Additional logging for critical errors
    if (context.severity === 'critical') {
      console.error('🚨 CRITICAL ERROR:', error, enhancedContext)
      this.sendAlert('critical_error', {
        error: error.message,
        context: enhancedContext,
      })
    }
  }

  // Track performance metrics
  capturePerformance(metric: PerformanceMetric) {
    const enhancedMetric = {
      ...metric,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: metric.timestamp || new Date(),
    }

    console.log(`📊 Performance: ${metric.name} = ${metric.value}${metric.unit}`)

    // Store in browser for development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]')
      metrics.push(enhancedMetric)
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100)
      }
      
      localStorage.setItem('performance_metrics', JSON.stringify(metrics))
    }

    // Send to analytics service in production
    this.sendToAnalytics('performance', enhancedMetric)
  }

  // Track security events
  captureSecurityEvent(event: SecurityEvent) {
    const enhancedEvent = {
      ...event,
      sessionId: this.sessionId,
      userId: event.userId || this.userId,
      timestamp: event.timestamp || new Date(),
    }

    console.warn('🔒 Security Event:', enhancedEvent)

    // Immediate alert for high/critical security events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert('security_event', enhancedEvent)
    }

    // Store security events
    this.sendToAnalytics('security', enhancedEvent)
  }

  // Track business events for analytics
  captureBusinessEvent(event: BusinessEvent) {
    const enhancedEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: event.timestamp || new Date(),
    }

    console.log('💼 Business Event:', enhancedEvent)
    
    this.sendToAnalytics('business', enhancedEvent)
  }

  // Monitor Web Vitals and performance
  private monitorPerformance() {
    if (typeof window === 'undefined') return

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.capturePerformance({
                name: 'long_task',
                value: entry.duration,
                unit: 'ms',
                timestamp: new Date(),
                context: {
                  entryType: entry.entryType,
                  startTime: entry.startTime,
                },
              })
            }
          }
        })
        
        observer.observe({ entryTypes: ['longtask'] })
      } catch (error) {
        console.warn('Performance observer not supported:', error)
      }
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.captureError(new Error('High memory usage detected'), {
            severity: 'medium',
            component: 'performance',
            action: 'memory_warning',
            metadata: {
              usedJSHeapSize: memory.usedJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
              totalJSHeapSize: memory.totalJSHeapSize,
            },
          })
        }
      }, 60000) // Check every minute
    }
  }

  // Monitor security-related events
  private monitorSecurity() {
    if (typeof window === 'undefined') return

    // Monitor failed authentication attempts
    let failedAuthAttempts = 0
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      
      // Monitor auth failures
      if (response.status === 401) {
        failedAuthAttempts++
        
        if (failedAuthAttempts > 3) {
          this.captureSecurityEvent({
            type: 'auth_failure',
            severity: 'high',
            details: `Multiple authentication failures detected: ${failedAuthAttempts}`,
            timestamp: new Date(),
            ipAddress: 'client-side', // Would need backend for real IP
          })
        }
      }
      
      // Reset counter on successful auth
      if (response.status === 200 && args[0]?.toString().includes('auth')) {
        failedAuthAttempts = 0
      }
      
      return response
    }

    // Monitor suspicious activity (rapid requests)
    let requestCount = 0
    let requestWindow = Date.now()
    
    const originalXHROpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function(...args) {
      requestCount++
      
      const now = Date.now()
      if (now - requestWindow > 10000) { // 10 second window
        if (requestCount > 50) { // More than 50 requests in 10 seconds
          monitoringService.captureSecurityEvent({
            type: 'suspicious_activity',
            severity: 'medium',
            details: `Rapid request pattern detected: ${requestCount} requests in 10 seconds`,
            timestamp: new Date(),
          })
        }
        requestCount = 0
        requestWindow = now
      }
      
      return originalXHROpen.apply(this, args)
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Send alerts for critical issues
  private sendAlert(type: string, data: any) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 ALERT [${type}]:`, data)
    }
    
    // In production, integrate with alerting service
    // Example: PagerDuty, Slack, email, etc.
  }

  // Send data to analytics service
  private sendToAnalytics(category: string, data: any) {
    if (typeof window === 'undefined') return

    // For development, store locally
    if (process.env.NODE_ENV === 'development') {
      const analytics = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      analytics.push({ category, data, timestamp: new Date() })
      
      // Keep only last 500 events
      if (analytics.length > 500) {
        analytics.splice(0, analytics.length - 500)
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(analytics))
    }

    // In production, send to your analytics service
    // Example: Google Analytics, Mixpanel, custom endpoint
  }

  // Get monitoring statistics (for debugging)
  getStats() {
    if (typeof window === 'undefined') return {}

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userContext: this.userContext,
      performance: JSON.parse(localStorage.getItem('performance_metrics') || '[]'),
      analytics: JSON.parse(localStorage.getItem('analytics_events') || '[]'),
      errors: JSON.parse(localStorage.getItem('app_errors') || '[]'),
    }
  }

  // Clear all monitoring data
  clearStats() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('performance_metrics')
      localStorage.removeItem('analytics_events')
      localStorage.removeItem('app_errors')
    }
  }
}

// Export singleton instance
export const monitoringService = EnhancedMonitoringService.getInstance()

// Convenience functions
export const captureError = (error: Error, context?: ErrorContext) => {
  monitoringService.captureError(error, context)
}

export const capturePerformance = (metric: PerformanceMetric) => {
  monitoringService.capturePerformance(metric)
}

export const captureSecurityEvent = (event: SecurityEvent) => {
  monitoringService.captureSecurityEvent(event)
}

export const captureBusinessEvent = (event: BusinessEvent) => {
  monitoringService.captureBusinessEvent(event)
}

export const setUserContext = (user: any) => {
  monitoringService.setUserContext(user)
}

export const clearUserContext = () => {
  monitoringService.clearUserContext()
}