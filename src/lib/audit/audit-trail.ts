// Comprehensive audit trail system for insurance platform compliance
export interface AuditEvent {
  id: string
  timestamp: Date
  userId: string
  userEmail?: string
  userRole?: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>
}

export interface AuditFilter {
  userId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Predefined audit actions for consistency
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login_failed',
  PASSWORD_CHANGED: 'user.password_changed',
  
  // Project management
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_VIEWED: 'project.viewed',
  
  // Claims
  CLAIM_CREATED: 'claim.created',
  CLAIM_UPDATED: 'claim.updated',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  CLAIM_SUBMITTED: 'claim.submitted',
  
  // Documents
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_SHARED: 'document.shared',
  
  // Financial
  PAYMENT_PROCESSED: 'payment.processed',
  INVOICE_GENERATED: 'invoice.generated',
  BUDGET_UPDATED: 'budget.updated',
  
  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DEACTIVATED: 'user.deactivated',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  
  // System
  SYSTEM_CONFIG_CHANGED: 'system.config_changed',
  BACKUP_CREATED: 'system.backup_created',
  MAINTENANCE_STARTED: 'system.maintenance_started',
  MAINTENANCE_ENDED: 'system.maintenance_ended',
  
  // Security
  SECURITY_BREACH_DETECTED: 'security.breach_detected',
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  DATA_EXPORT: 'security.data_export',
  SENSITIVE_DATA_ACCESSED: 'security.sensitive_data_accessed'
} as const

class AuditTrail {
  private static instance: AuditTrail
  private events: AuditEvent[] = []
  private userId?: string
  private userEmail?: string
  private userRole?: string
  private sessionId?: string
  private maxEvents = 10000 // Keep last 10,000 events in memory

  private constructor() {
    this.initialize()
  }

  public static getInstance(): AuditTrail {
    if (!this.instance) {
      this.instance = new AuditTrail()
    }
    return this.instance
  }

  private initialize() {
    this.sessionId = this.generateSessionId()
    
    // Load existing events from storage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('audit_events')
        if (stored) {
          const parsed = JSON.parse(stored)
          this.events = parsed.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }))
        }
      } catch (error) {
        console.warn('Failed to load audit events from storage:', error)
      }
    }
    
    console.log('📋 Audit trail initialized')
  }

  // Set current user context
  setUser(user: {
    id: string
    email?: string
    role?: string
  }) {
    this.userId = user.id
    this.userEmail = user.email
    this.userRole = user.role
    
    // Log user identification
    this.logEvent(AUDIT_ACTIONS.LOGIN, 'user', user.id, {
      email: user.email,
      role: user.role
    })
    
    console.log('👤 Audit user set:', user.email || user.id)
  }

  // Clear user context
  clearUser() {
    if (this.userId) {
      this.logEvent(AUDIT_ACTIONS.LOGOUT, 'user', this.userId)
    }
    
    this.userId = undefined
    this.userEmail = undefined
    this.userRole = undefined
    this.sessionId = this.generateSessionId()
    
    console.log('👤 Audit user cleared')
  }

  // Log an audit event
  logEvent(
    action: string,
    resource: string,
    resourceId?: string,
    details: Record<string, any> = {},
    changes?: { before?: Record<string, any>, after?: Record<string, any> }
  ) {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      userId: this.userId || 'anonymous',
      userEmail: this.userEmail,
      userRole: this.userRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      sessionId: this.sessionId,
      changes,
      metadata: {
        platform: typeof window !== 'undefined' ? 'web' : 'server',
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }

    this.events.push(event)
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }

    // Persist to storage
    this.persistEvents()

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Audit:', {
        action,
        resource: resourceId ? `${resource}:${resourceId}` : resource,
        user: this.userEmail || this.userId || 'anonymous',
        timestamp: event.timestamp.toISOString()
      })
    }

    // Send to server in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(event)
    }

    // Trigger compliance checks for sensitive actions
    if (this.isSensitiveAction(action)) {
      this.handleSensitiveAction(event)
    }
  }

  // Convenience methods for common actions
  logLogin(userId: string, email?: string, role?: string, success = true) {
    this.logEvent(
      success ? AUDIT_ACTIONS.LOGIN : AUDIT_ACTIONS.LOGIN_FAILED,
      'user',
      userId,
      { email, role, success }
    )
  }

  logProjectAccess(projectId: string, action: 'view' | 'create' | 'update' | 'delete', details: Record<string, any> = {}) {
    const auditAction = {
      view: AUDIT_ACTIONS.PROJECT_VIEWED,
      create: AUDIT_ACTIONS.PROJECT_CREATED,
      update: AUDIT_ACTIONS.PROJECT_UPDATED,
      delete: AUDIT_ACTIONS.PROJECT_DELETED
    }[action]

    this.logEvent(auditAction, 'project', projectId, details)
  }

  logClaimActivity(claimId: string, action: 'create' | 'update' | 'approve' | 'reject' | 'submit', details: Record<string, any> = {}, changes?: any) {
    const auditAction = {
      create: AUDIT_ACTIONS.CLAIM_CREATED,
      update: AUDIT_ACTIONS.CLAIM_UPDATED,
      approve: AUDIT_ACTIONS.CLAIM_APPROVED,
      reject: AUDIT_ACTIONS.CLAIM_REJECTED,
      submit: AUDIT_ACTIONS.CLAIM_SUBMITTED
    }[action]

    this.logEvent(auditAction, 'claim', claimId, details, changes)
  }

  logDocumentActivity(documentId: string, action: 'upload' | 'download' | 'delete' | 'share', details: Record<string, any> = {}) {
    const auditAction = {
      upload: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      download: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
      delete: AUDIT_ACTIONS.DOCUMENT_DELETED,
      share: AUDIT_ACTIONS.DOCUMENT_SHARED
    }[action]

    this.logEvent(auditAction, 'document', documentId, details)
  }

  logFinancialActivity(action: 'payment' | 'invoice' | 'budget', resourceId: string, details: Record<string, any> = {}) {
    const auditAction = {
      payment: AUDIT_ACTIONS.PAYMENT_PROCESSED,
      invoice: AUDIT_ACTIONS.INVOICE_GENERATED,
      budget: AUDIT_ACTIONS.BUDGET_UPDATED
    }[action]

    this.logEvent(auditAction, action, resourceId, details)
  }

  logSecurityEvent(event: 'breach' | 'unauthorized' | 'data_export' | 'sensitive_access', details: Record<string, any> = {}) {
    const auditAction = {
      breach: AUDIT_ACTIONS.SECURITY_BREACH_DETECTED,
      unauthorized: AUDIT_ACTIONS.UNAUTHORIZED_ACCESS,
      data_export: AUDIT_ACTIONS.DATA_EXPORT,
      sensitive_access: AUDIT_ACTIONS.SENSITIVE_DATA_ACCESSED
    }[event]

    this.logEvent(auditAction, 'security', undefined, details)
  }

  // Query audit events
  getEvents(filter: AuditFilter = {}): AuditEvent[] {
    let filtered = this.events

    if (filter.userId) {
      filtered = filtered.filter(event => event.userId === filter.userId)
    }

    if (filter.action) {
      filtered = filtered.filter(event => event.action === filter.action)
    }

    if (filter.resource) {
      filtered = filtered.filter(event => event.resource === filter.resource)
    }

    if (filter.startDate) {
      filtered = filtered.filter(event => event.timestamp >= filter.startDate!)
    }

    if (filter.endDate) {
      filtered = filtered.filter(event => event.timestamp <= filter.endDate!)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    if (filter.offset) {
      filtered = filtered.slice(filter.offset)
    }

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit)
    }

    return filtered
  }

  // Get audit summary
  getSummary(days = 7): {
    totalEvents: number
    userEvents: number
    systemEvents: number
    securityEvents: number
    topActions: Array<{ action: string, count: number }>
    topUsers: Array<{ userId: string, userEmail?: string, count: number }>
  } {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const recentEvents = this.events.filter(event => event.timestamp >= since)

    const actionCounts: Record<string, number> = {}
    const userCounts: Record<string, { count: number, email?: string }> = {}
    let userEvents = 0
    let systemEvents = 0
    let securityEvents = 0

    recentEvents.forEach(event => {
      // Count actions
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1

      // Count users
      if (!userCounts[event.userId]) {
        userCounts[event.userId] = { count: 0, email: event.userEmail }
      }
      userCounts[event.userId].count++

      // Categorize events
      if (event.action.startsWith('user.')) {
        userEvents++
      } else if (event.action.startsWith('system.')) {
        systemEvents++
      } else if (event.action.startsWith('security.')) {
        securityEvents++
      }
    })

    const topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))

    const topUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([userId, data]) => ({ 
        userId, 
        userEmail: data.email, 
        count: data.count 
      }))

    return {
      totalEvents: recentEvents.length,
      userEvents,
      systemEvents,
      securityEvents,
      topActions,
      topUsers
    }
  }

  // Export audit trail for compliance
  exportAuditTrail(format: 'json' | 'csv' = 'json', filter: AuditFilter = {}): string {
    const events = this.getEvents(filter)

    if (format === 'csv') {
      const headers = [
        'Timestamp', 'User ID', 'User Email', 'Action', 'Resource', 
        'Resource ID', 'IP Address', 'Session ID', 'Details'
      ]
      
      const rows = events.map(event => [
        event.timestamp.toISOString(),
        event.userId,
        event.userEmail || '',
        event.action,
        event.resource,
        event.resourceId || '',
        event.ipAddress || '',
        event.sessionId || '',
        JSON.stringify(event.details)
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(events, null, 2)
  }

  // Helper methods
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientIP(): string | undefined {
    // In production, this would come from headers or external service
    return 'client-side' // Placeholder
  }

  private getUserAgent(): string | undefined {
    return typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  }

  private persistEvents() {
    if (typeof window !== 'undefined') {
      try {
        // Keep only last 1000 events in localStorage
        const eventsToStore = this.events.slice(-1000)
        localStorage.setItem('audit_events', JSON.stringify(eventsToStore))
      } catch (error) {
        console.warn('Failed to persist audit events:', error)
      }
    }
  }

  private async sendToServer(event: AuditEvent) {
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.warn('Failed to send audit event to server:', error)
    }
  }

  private isSensitiveAction(action: string): boolean {
    return [
      AUDIT_ACTIONS.PAYMENT_PROCESSED,
      AUDIT_ACTIONS.CLAIM_APPROVED,
      AUDIT_ACTIONS.DATA_EXPORT,
      AUDIT_ACTIONS.SENSITIVE_DATA_ACCESSED,
      AUDIT_ACTIONS.SECURITY_BREACH_DETECTED,
      AUDIT_ACTIONS.PERMISSION_GRANTED,
      AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED
    ].includes(action as any)
  }

  private handleSensitiveAction(event: AuditEvent) {
    console.warn('🔒 Sensitive action detected:', {
      action: event.action,
      user: event.userEmail || event.userId,
      resource: event.resource,
      timestamp: event.timestamp.toISOString()
    })

    // In production, implement additional security measures:
    // - Immediate notification to security team
    // - Additional verification requirements
    // - Enhanced logging
    // - Real-time monitoring alerts
  }

  // Clear all events (admin only)
  clearEvents() {
    this.events = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('audit_events')
    }
    console.log('📋 Audit events cleared')
  }
}

// Export singleton
export const auditTrail = AuditTrail.getInstance()

// Convenience functions
export const logAuditEvent = (action: string, resource: string, resourceId?: string, details?: Record<string, any>, changes?: any) => {
  auditTrail.logEvent(action, resource, resourceId, details, changes)
}

export const setAuditUser = (user: any) => auditTrail.setUser(user)
export const clearAuditUser = () => auditTrail.clearUser()
export const getAuditEvents = (filter?: AuditFilter) => auditTrail.getEvents(filter)
export const getAuditSummary = (days?: number) => auditTrail.getSummary(days)
export const exportAuditTrail = (format?: 'json' | 'csv', filter?: AuditFilter) => auditTrail.exportAuditTrail(format, filter)

// React hook for audit trail
export function useAuditTrail() {
  return {
    logEvent: logAuditEvent,
    logProjectAccess: (projectId: string, action: any, details?: any) => auditTrail.logProjectAccess(projectId, action, details),
    logClaimActivity: (claimId: string, action: any, details?: any, changes?: any) => auditTrail.logClaimActivity(claimId, action, details, changes),
    logDocumentActivity: (documentId: string, action: any, details?: any) => auditTrail.logDocumentActivity(documentId, action, details),
    logFinancialActivity: (action: any, resourceId: string, details?: any) => auditTrail.logFinancialActivity(action, resourceId, details),
    logSecurityEvent: (event: any, details?: any) => auditTrail.logSecurityEvent(event, details),
    getEvents: getAuditEvents,
    getSummary: getAuditSummary,
    exportTrail: exportAuditTrail,
    setUser: setAuditUser,
    clearUser: clearAuditUser
  }
}