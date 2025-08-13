'use client'

import { captureBusinessEvent } from '../monitoring/error-monitoring'

// User analytics and behavior tracking for insurance platform
export interface UserEvent {
  event: string
  userId?: string
  properties?: Record<string, any>
  timestamp?: Date
}

export interface PageView {
  path: string
  title?: string
  referrer?: string
  userId?: string
  timestamp?: Date
}

export interface UserSession {
  sessionId: string
  userId?: string
  startTime: Date
  endTime?: Date
  pageViews: number
  events: number
  device?: string
  browser?: string
  os?: string
}

class UserAnalytics {
  private static instance: UserAnalytics
  private sessionId: string
  private userId?: string
  private sessionStart: Date
  private pageViews: number = 0
  private events: number = 0
  private isInitialized = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionStart = new Date()
    this.initialize()
  }

  public static getInstance(): UserAnalytics {
    if (!this.instance) {
      this.instance = new UserAnalytics()
    }
    return this.instance
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', { timestamp: new Date() })
      } else {
        this.trackEvent('page_visible', { timestamp: new Date() })
      }
    })

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.endSession()
    })

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      })
    })

    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      
      // Track button clicks
      if (target.tagName === 'BUTTON' || target.role === 'button') {
        this.trackEvent('button_click', {
          text: target.textContent?.trim() || 'Unknown',
          id: target.id || undefined,
          className: target.className || undefined
        })
      }

      // Track link clicks
      if (target.tagName === 'A') {
        const href = target.getAttribute('href')
        this.trackEvent('link_click', {
          href,
          text: target.textContent?.trim() || 'Unknown',
          external: href?.startsWith('http') && !href.includes(window.location.hostname)
        })
      }

      // Track form submissions
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'submit') {
        const form = target.closest('form')
        this.trackEvent('form_submit', {
          formId: form?.id || undefined,
          formAction: form?.action || undefined
        })
      }
    })

    // Track scroll depth
    let maxScrollDepth = 0
    let scrollTimeout: NodeJS.Timeout

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollDepth = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        )
        
        if (scrollDepth > maxScrollDepth && scrollDepth <= 100) {
          maxScrollDepth = scrollDepth
          
          // Track milestone scroll depths
          if (scrollDepth >= 25 && scrollDepth < 50 && maxScrollDepth >= 25) {
            this.trackEvent('scroll_depth', { depth: 25 })
          } else if (scrollDepth >= 50 && scrollDepth < 75 && maxScrollDepth >= 50) {
            this.trackEvent('scroll_depth', { depth: 50 })
          } else if (scrollDepth >= 75 && scrollDepth < 100 && maxScrollDepth >= 75) {
            this.trackEvent('scroll_depth', { depth: 75 })
          } else if (scrollDepth >= 100 && maxScrollDepth >= 100) {
            this.trackEvent('scroll_depth', { depth: 100 })
          }
        }
      }, 100)
    })

    this.isInitialized = true
    console.log('📊 User analytics initialized')
  }

  // Set user context
  setUser(user: { id: string; email?: string; role?: string; organization?: string }) {
    this.userId = user.id
    this.trackEvent('user_identified', {
      userId: user.id,
      email: user.email,
      role: user.role,
      organization: user.organization
    })
    
    console.log('👤 Analytics user set:', user.role)
  }

  // Clear user context
  clearUser() {
    this.trackEvent('user_logged_out')
    this.userId = undefined
    this.endSession()
    this.startNewSession()
  }

  // Track page views
  trackPageView(path: string, title?: string) {
    this.pageViews++
    
    const pageView: PageView = {
      path,
      title: title || document.title,
      referrer: document.referrer || undefined,
      userId: this.userId,
      timestamp: new Date()
    }

    this.sendToAnalytics('pageview', pageView)
    
    // Track specific business pages
    if (path.includes('/projects/')) {
      this.trackEvent('project_viewed', { path })
    } else if (path.includes('/claims/')) {
      this.trackEvent('claim_viewed', { path })
    } else if (path.includes('/documents/')) {
      this.trackEvent('document_viewed', { path })
    }
  }

  // Track custom events
  trackEvent(event: string, properties: Record<string, any> = {}) {
    this.events++
    
    const userEvent: UserEvent = {
      event,
      userId: this.userId,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date(),
        page: typeof window !== 'undefined' ? window.location.pathname : undefined
      },
      timestamp: new Date()
    }

    this.sendToAnalytics('event', userEvent)
    
    // Send business events to monitoring service
    if (this.isBusinessEvent(event)) {
      captureBusinessEvent({
        type: event as any,
        userId: this.userId || 'anonymous',
        timestamp: new Date(),
        metadata: properties
      })
    }
  }

  // Track business-specific events
  trackClaimCreated(claimId: string, amount: number, currency = 'USD') {
    this.trackEvent('claim_created', {
      claimId,
      amount,
      currency,
      category: 'business'
    })
  }

  trackDocumentUploaded(documentId: string, type: string, size: number) {
    this.trackEvent('document_uploaded', {
      documentId,
      type,
      size,
      category: 'business'
    })
  }

  trackPaymentProcessed(amount: number, currency = 'USD', method: string) {
    this.trackEvent('payment_processed', {
      amount,
      currency,
      method,
      category: 'business'
    })
  }

  trackUserEngagement(action: string, element: string, duration?: number) {
    this.trackEvent('user_engagement', {
      action,
      element,
      duration,
      category: 'engagement'
    })
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, unit = 'ms') {
    this.trackEvent('performance_metric', {
      metric,
      value,
      unit,
      category: 'performance'
    })
  }

  // A/B testing support
  trackExperiment(experimentName: string, variant: string, converted = false) {
    this.trackEvent('experiment_exposure', {
      experiment: experimentName,
      variant,
      converted,
      category: 'experiment'
    })
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>) {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...metadata,
      category: 'feature'
    })
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>) {
    this.trackEvent('error_occurred', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.slice(0, 1000), // Truncate stack trace
      ...context,
      category: 'error'
    })
  }

  // Session management
  private startNewSession() {
    this.sessionId = this.generateSessionId()
    this.sessionStart = new Date()
    this.pageViews = 0
    this.events = 0
    
    this.trackEvent('session_started')
  }

  private endSession() {
    const session: UserSession = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStart,
      endTime: new Date(),
      pageViews: this.pageViews,
      events: this.events,
      device: this.getDeviceInfo(),
      browser: this.getBrowserInfo(),
      os: this.getOSInfo()
    }

    this.sendToAnalytics('session_ended', session)
    
    // Calculate session duration
    const duration = session.endTime.getTime() - session.startTime.getTime()
    this.trackEvent('session_duration', {
      duration,
      pageViews: this.pageViews,
      events: this.events
    })
  }

  // Utility methods
  private isBusinessEvent(event: string): boolean {
    return [
      'claim_created',
      'document_uploaded', 
      'payment_processed',
      'approval_granted'
    ].includes(event)
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'unknown'
    
    const width = window.screen.width
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getBrowserInfo(): string {
    if (typeof window === 'undefined') return 'unknown'
    
    const userAgent = window.navigator.userAgent
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'unknown'
  }

  private getOSInfo(): string {
    if (typeof window === 'undefined') return 'unknown'
    
    const userAgent = window.navigator.userAgent
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'unknown'
  }

  // Send data to analytics services
  private sendToAnalytics(type: string, data: any) {
    if (typeof window === 'undefined') return

    // Store locally for development
    if (process.env.NODE_ENV === 'development') {
      const analyticsData = JSON.parse(localStorage.getItem('user_analytics') || '[]')
      analyticsData.push({
        type,
        data: {
          ...data,
          timestamp: data.timestamp || new Date()
        }
      })
      
      // Keep only last 500 events
      if (analyticsData.length > 500) {
        analyticsData.splice(0, analyticsData.length - 500)
      }
      
      localStorage.setItem('user_analytics', JSON.stringify(analyticsData))
    }

    // In production, send to analytics services
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    try {
      // Google Analytics 4 example
      if (typeof gtag !== 'undefined') {
        gtag('event', type, data)
      }
      
      // Custom analytics endpoint
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      }).catch(error => console.warn('Analytics request failed:', error))
      
    } catch (error) {
      console.warn('Failed to send analytics:', error)
    }
  }

  // Get analytics data for debugging
  getAnalyticsData(): any[] {
    if (typeof window === 'undefined') return []
    
    try {
      return JSON.parse(localStorage.getItem('user_analytics') || '[]')
    } catch {
      return []
    }
  }

  // Clear analytics data
  clearAnalyticsData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_analytics')
    }
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStart,
      pageViews: this.pageViews,
      events: this.events,
      duration: new Date().getTime() - this.sessionStart.getTime()
    }
  }
}

// Export singleton
export const userAnalytics = UserAnalytics.getInstance()

// Convenience functions
export const trackPageView = (path: string, title?: string) => userAnalytics.trackPageView(path, title)
export const trackEvent = (event: string, properties?: Record<string, any>) => userAnalytics.trackEvent(event, properties)
export const trackClaimCreated = (claimId: string, amount: number, currency?: string) => userAnalytics.trackClaimCreated(claimId, amount, currency)
export const trackDocumentUploaded = (documentId: string, type: string, size: number) => userAnalytics.trackDocumentUploaded(documentId, type, size)
export const trackPaymentProcessed = (amount: number, currency: string, method: string) => userAnalytics.trackPaymentProcessed(amount, currency, method)
export const trackFeatureUsage = (feature: string, action: string, metadata?: Record<string, any>) => userAnalytics.trackFeatureUsage(feature, action, metadata)
export const setAnalyticsUser = (user: any) => userAnalytics.setUser(user)
export const clearAnalyticsUser = () => userAnalytics.clearUser()

// React hook
export function useAnalytics() {
  return {
    trackPageView,
    trackEvent,
    trackClaimCreated,
    trackDocumentUploaded, 
    trackPaymentProcessed,
    trackFeatureUsage,
    trackError: (error: Error, context?: Record<string, any>) => userAnalytics.trackError(error, context),
    trackPerformance: (metric: string, value: number, unit?: string) => userAnalytics.trackPerformance(metric, value, unit),
    trackExperiment: (name: string, variant: string, converted?: boolean) => userAnalytics.trackExperiment(name, variant, converted),
    setUser: setAnalyticsUser,
    clearUser: clearAnalyticsUser,
    getSessionInfo: () => userAnalytics.getSessionInfo()
  }
}