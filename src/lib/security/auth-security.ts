'use client'

import { createClient } from '@/lib/supabase/client'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'

// Advanced authentication security for insurance platform
export interface SecuritySession {
  id: string
  userId: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  loginTime: Date
  lastActivity: Date
  isActive: boolean
  riskScore: number
  location?: {
    country: string
    city: string
    coordinates?: [number, number]
  }
}

export interface LoginAttempt {
  id: string
  email: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  success: boolean
  failureReason?: string
  riskFactors: string[]
  blocked: boolean
}

export interface SecurityConfig {
  maxLoginAttempts: number
  lockoutDuration: number // minutes
  sessionTimeout: number // minutes
  maxConcurrentSessions: number
  requireMFA: boolean
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
  suspiciousActivityThreshold: number
}

class AuthSecurity {
  private static instance: AuthSecurity
  private sessions: Map<string, SecuritySession> = new Map()
  private loginAttempts: LoginAttempt[] = []
  private blockedIPs: Map<string, Date> = new Map()
  private deviceFingerprints: Map<string, string> = new Map()

  private config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    sessionTimeout: 60,
    maxConcurrentSessions: 3,
    requireMFA: true,
    passwordMinLength: 12,
    passwordRequireSpecialChars: true,
    suspiciousActivityThreshold: 3
  }

  private constructor() {
    this.initialize()
  }

  public static getInstance(): AuthSecurity {
    if (!this.instance) {
      this.instance = new AuthSecurity()
    }
    return this.instance
  }

  private initialize() {
    if (typeof window === 'undefined') return

    // Load existing data from storage
    try {
      const storedSessions = localStorage.getItem('security_sessions')
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions)
        parsed.forEach((session: any) => {
          this.sessions.set(session.id, {
            ...session,
            loginTime: new Date(session.loginTime),
            lastActivity: new Date(session.lastActivity)
          })
        })
      }

      const storedAttempts = localStorage.getItem('login_attempts')
      if (storedAttempts) {
        this.loginAttempts = JSON.parse(storedAttempts).map((attempt: any) => ({
          ...attempt,
          timestamp: new Date(attempt.timestamp)
        }))
      }

      const storedBlocked = localStorage.getItem('blocked_ips')
      if (storedBlocked) {
        const parsed = JSON.parse(storedBlocked)
        Object.entries(parsed).forEach(([ip, dateStr]) => {
          this.blockedIPs.set(ip, new Date(dateStr as string))
        })
      }
    } catch (error) {
      console.warn('Failed to load security data:', error)
    }

    // Start security monitoring
    this.startSecurityMonitoring()

    console.log('🔒 Authentication security initialized')
  }

  // Enhanced login with security checks
  async secureLogin(email: string, password: string): Promise<{
    success: boolean
    user?: any
    error?: string
    requiresMFA?: boolean
    sessionId?: string
    riskScore: number
  }> {
    const ipAddress = await this.getClientIP()
    const userAgent = navigator.userAgent
    const deviceFingerprint = this.generateDeviceFingerprint()
    
    // Check if IP is blocked
    if (this.isIPBlocked(ipAddress)) {
      const attempt = this.recordLoginAttempt(email, ipAddress, userAgent, false, 'IP_BLOCKED', ['blocked_ip'])
      return {
        success: false,
        error: 'Account temporarily locked due to suspicious activity',
        riskScore: 10
      }
    }

    // Check for suspicious activity
    const riskScore = this.calculateRiskScore(email, ipAddress, userAgent, deviceFingerprint)
    
    if (riskScore >= this.config.suspiciousActivityThreshold) {
      captureSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        details: `High-risk login attempt: ${email}`,
        timestamp: new Date(),
        ipAddress,
        userAgent
      })
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        const failureReason = this.categorizeAuthError(error.message)
        const riskFactors = this.analyzeRiskFactors(email, ipAddress, userAgent, deviceFingerprint)
        
        this.recordLoginAttempt(email, ipAddress, userAgent, false, failureReason, riskFactors)
        
        // Check if we should block this IP
        if (this.shouldBlockIP(email, ipAddress)) {
          this.blockIP(ipAddress)
          captureSecurityEvent({
            type: 'auth_failure',
            severity: 'high',
            details: `IP blocked after multiple failed attempts: ${ipAddress}`,
            timestamp: new Date(),
            ipAddress,
            userAgent
          })
        }

        return {
          success: false,
          error: error.message,
          riskScore
        }
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Authentication failed',
          riskScore
        }
      }

      // Successful login - create secure session
      const sessionId = await this.createSecureSession(data.user, deviceFingerprint, ipAddress, userAgent, riskScore)
      
      // Record successful login attempt
      this.recordLoginAttempt(email, ipAddress, userAgent, true)
      
      // Log audit event
      logAuditEvent(AUDIT_ACTIONS.LOGIN, 'user', data.user.id, {
        email: data.user.email,
        ipAddress,
        deviceFingerprint,
        riskScore,
        sessionId
      })

      // Check if MFA is required
      const requiresMFA = this.config.requireMFA || riskScore >= 5

      if (requiresMFA) {
        return {
          success: true,
          user: data.user,
          requiresMFA: true,
          sessionId,
          riskScore
        }
      }

      return {
        success: true,
        user: data.user,
        sessionId,
        riskScore
      }

    } catch (error) {
      console.error('Secure login error:', error)
      return {
        success: false,
        error: 'Authentication system error',
        riskScore
      }
    }
  }

  // Create secure session with enhanced tracking
  private async createSecureSession(
    user: any, 
    deviceFingerprint: string, 
    ipAddress: string, 
    userAgent: string, 
    riskScore: number
  ): Promise<string> {
    const sessionId = this.generateSessionId()
    
    // Check concurrent session limit
    const userSessions = Array.from(this.sessions.values()).filter(
      session => session.userId === user.id && session.isActive
    )

    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = userSessions.sort((a, b) => 
        a.lastActivity.getTime() - b.lastActivity.getTime()
      )[0]
      
      this.terminateSession(oldestSession.id, 'concurrent_limit_exceeded')
    }

    // Get location data (optional)
    const location = await this.getLocationFromIP(ipAddress)

    const session: SecuritySession = {
      id: sessionId,
      userId: user.id,
      deviceFingerprint,
      ipAddress,
      userAgent,
      loginTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
      riskScore,
      location
    }

    this.sessions.set(sessionId, session)
    this.deviceFingerprints.set(deviceFingerprint, user.id)
    this.persistSessions()

    console.log('🔐 Secure session created:', sessionId)
    return sessionId
  }

  // Validate session security
  validateSession(sessionId: string): {
    valid: boolean
    session?: SecuritySession
    reason?: string
  } {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      return { valid: false, reason: 'session_not_found' }
    }

    if (!session.isActive) {
      return { valid: false, reason: 'session_inactive' }
    }

    // Check session timeout
    const timeSinceLastActivity = Date.now() - session.lastActivity.getTime()
    if (timeSinceLastActivity > this.config.sessionTimeout * 60 * 1000) {
      this.terminateSession(sessionId, 'timeout')
      return { valid: false, reason: 'session_timeout' }
    }

    // Update last activity
    session.lastActivity = new Date()
    this.sessions.set(sessionId, session)
    this.persistSessions()

    return { valid: true, session }
  }

  // Terminate session
  terminateSession(sessionId: string, reason: string) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      this.sessions.set(sessionId, session)
      this.persistSessions()

      logAuditEvent(AUDIT_ACTIONS.LOGOUT, 'user', session.userId, {
        sessionId,
        reason,
        duration: Date.now() - session.loginTime.getTime()
      })

      console.log('🔐 Session terminated:', sessionId, reason)
    }
  }

  // Calculate risk score for login attempt
  private calculateRiskScore(email: string, ipAddress: string, userAgent: string, deviceFingerprint: string): number {
    let score = 0

    // Check recent failed attempts
    const recentFailures = this.loginAttempts.filter(
      attempt => attempt.email === email && 
                !attempt.success && 
                Date.now() - attempt.timestamp.getTime() < 24 * 60 * 60 * 1000 // 24 hours
    )
    score += recentFailures.length * 2

    // Check if new IP
    const knownIPs = Array.from(this.sessions.values())
      .filter(session => session.userId === email)
      .map(session => session.ipAddress)
    
    if (!knownIPs.includes(ipAddress)) {
      score += 3
    }

    // Check if new device
    if (!this.deviceFingerprints.has(deviceFingerprint)) {
      score += 2
    }

    // Check suspicious IP patterns
    if (this.isSuspiciousIP(ipAddress)) {
      score += 5
    }

    // Check unusual timing (e.g., middle of night for user's timezone)
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) {
      score += 1
    }

    return Math.min(score, 10) // Cap at 10
  }

  // Analyze risk factors
  private analyzeRiskFactors(email: string, ipAddress: string, userAgent: string, deviceFingerprint: string): string[] {
    const factors: string[] = []

    // Recent failures
    const recentFailures = this.loginAttempts.filter(
      attempt => attempt.email === email && !attempt.success && 
                Date.now() - attempt.timestamp.getTime() < 60 * 60 * 1000 // 1 hour
    )
    if (recentFailures.length > 0) factors.push('recent_failures')

    // New IP
    const knownIPs = Array.from(this.sessions.values()).map(s => s.ipAddress)
    if (!knownIPs.includes(ipAddress)) factors.push('new_ip')

    // New device
    if (!this.deviceFingerprints.has(deviceFingerprint)) factors.push('new_device')

    // Suspicious IP
    if (this.isSuspiciousIP(ipAddress)) factors.push('suspicious_ip')

    // Unusual timing
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) factors.push('unusual_timing')

    return factors
  }

  // Record login attempt
  private recordLoginAttempt(
    email: string, 
    ipAddress: string, 
    userAgent: string, 
    success: boolean, 
    failureReason?: string, 
    riskFactors: string[] = []
  ): LoginAttempt {
    const attempt: LoginAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success,
      failureReason,
      riskFactors,
      blocked: false
    }

    this.loginAttempts.push(attempt)
    
    // Keep only last 1000 attempts
    if (this.loginAttempts.length > 1000) {
      this.loginAttempts.shift()
    }

    this.persistLoginAttempts()
    return attempt
  }

  // Check if IP should be blocked
  private shouldBlockIP(email: string, ipAddress: string): boolean {
    const recentFailures = this.loginAttempts.filter(
      attempt => attempt.ipAddress === ipAddress && 
                !attempt.success && 
                Date.now() - attempt.timestamp.getTime() < 60 * 60 * 1000 // 1 hour
    )

    return recentFailures.length >= this.config.maxLoginAttempts
  }

  // Block IP address
  private blockIP(ipAddress: string) {
    const blockUntil = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000)
    this.blockedIPs.set(ipAddress, blockUntil)
    this.persistBlockedIPs()
    
    console.warn('🚫 IP blocked:', ipAddress, 'until', blockUntil)
  }

  // Check if IP is blocked
  private isIPBlocked(ipAddress: string): boolean {
    const blockUntil = this.blockedIPs.get(ipAddress)
    if (!blockUntil) return false

    if (Date.now() > blockUntil.getTime()) {
      this.blockedIPs.delete(ipAddress)
      this.persistBlockedIPs()
      return false
    }

    return true
  }

  // Generate device fingerprint
  private generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx!.textBaseline = 'top'
    ctx!.font = '14px Arial'
    ctx!.fillText('Device fingerprint', 2, 2)

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      canvas.toDataURL()
    ].join('|')

    return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substr(0, 32)
  }

  // Generate secure session ID
  private generateSessionId(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Helper methods
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }

  private async getLocationFromIP(ip: string): Promise<any> {
    try {
      // In production, use a proper geolocation service
      return { country: 'Unknown', city: 'Unknown' }
    } catch {
      return undefined
    }
  }

  private isSuspiciousIP(ip: string): boolean {
    // In production, check against threat intelligence databases
    // For now, basic checks
    const suspiciousPatterns = [
      /^10\./, // Private IP (suspicious if external)
      /^192\.168\./, // Private IP
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // Private IP
    ]

    return suspiciousPatterns.some(pattern => pattern.test(ip))
  }

  private categorizeAuthError(errorMessage: string): string {
    if (errorMessage.includes('Invalid login credentials')) return 'invalid_credentials'
    if (errorMessage.includes('Email not confirmed')) return 'email_unconfirmed'
    if (errorMessage.includes('Too many requests')) return 'rate_limited'
    return 'auth_error'
  }

  private startSecurityMonitoring() {
    // Clean up expired blocked IPs every hour
    setInterval(() => {
      const now = Date.now()
      for (const [ip, blockUntil] of this.blockedIPs.entries()) {
        if (now > blockUntil.getTime()) {
          this.blockedIPs.delete(ip)
        }
      }
      this.persistBlockedIPs()
    }, 60 * 60 * 1000) // 1 hour

    // Clean up expired sessions
    setInterval(() => {
      const expiredThreshold = Date.now() - this.config.sessionTimeout * 60 * 1000
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.lastActivity.getTime() < expiredThreshold && session.isActive) {
          this.terminateSession(sessionId, 'expired_cleanup')
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  // Persistence methods
  private persistSessions() {
    if (typeof window !== 'undefined') {
      const sessionsArray = Array.from(this.sessions.values())
      localStorage.setItem('security_sessions', JSON.stringify(sessionsArray))
    }
  }

  private persistLoginAttempts() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('login_attempts', JSON.stringify(this.loginAttempts))
    }
  }

  private persistBlockedIPs() {
    if (typeof window !== 'undefined') {
      const blocked = Object.fromEntries(this.blockedIPs)
      localStorage.setItem('blocked_ips', JSON.stringify(blocked))
    }
  }

  // Public API methods
  getSecurityStats(): {
    activeSessions: number
    recentLoginAttempts: number
    blockedIPs: number
    securityIncidents: number
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length
    const recentAttempts = this.loginAttempts.filter(
      a => Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length
    const incidents = this.loginAttempts.filter(a => a.riskFactors.length > 2).length

    return {
      activeSessions,
      recentLoginAttempts: recentAttempts,
      blockedIPs: this.blockedIPs.size,
      securityIncidents: incidents
    }
  }

  getRecentSecurityEvents(): LoginAttempt[] {
    return this.loginAttempts
      .filter(attempt => Date.now() - attempt.timestamp.getTime() < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50)
  }

  updateSecurityConfig(newConfig: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...newConfig }
    console.log('🔒 Security configuration updated')
  }
}

// Export singleton
export const authSecurity = AuthSecurity.getInstance()

// Convenience functions
export const secureLogin = (email: string, password: string) => authSecurity.secureLogin(email, password)
export const validateSession = (sessionId: string) => authSecurity.validateSession(sessionId)
export const terminateSession = (sessionId: string, reason: string) => authSecurity.terminateSession(sessionId, reason)
export const getSecurityStats = () => authSecurity.getSecurityStats()
export const getRecentSecurityEvents = () => authSecurity.getRecentSecurityEvents()

// React hook for authentication security
export function useAuthSecurity() {
  return {
    secureLogin,
    validateSession,
    terminateSession,
    getSecurityStats,
    getRecentEvents: getRecentSecurityEvents,
    updateConfig: (config: Partial<SecurityConfig>) => authSecurity.updateSecurityConfig(config)
  }
}