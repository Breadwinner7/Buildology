// Security headers and CSRF protection for enhanced web security
import { NextRequest, NextResponse } from 'next/server'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'

// Security configuration
interface SecurityConfig {
  csp: {
    enabled: boolean
    directives: Record<string, string[]>
    reportOnly: boolean
  }
  csrf: {
    enabled: boolean
    cookieName: string
    headerName: string
    secretKey: string
  }
  headers: {
    hsts: {
      enabled: boolean
      maxAge: number
      includeSubDomains: boolean
      preload: boolean
    }
    referrerPolicy: string
    frameOptions: string
    contentTypeOptions: boolean
    xssProtection: boolean
    permissionsPolicy: string[]
  }
  rateLimit: {
    enabled: boolean
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
  }
}

class SecurityHeaders {
  private static instance: SecurityHeaders
  private config: SecurityConfig
  private csrfTokens: Map<string, { token: string, expires: number }> = new Map()
  private rateLimitStore: Map<string, { count: number, resetTime: number }> = new Map()

  private constructor() {
    this.config = this.getDefaultConfig()
    this.initialize()
  }

  public static getInstance(): SecurityHeaders {
    if (!this.instance) {
      this.instance = new SecurityHeaders()
    }
    return this.instance
  }

  private initialize() {
    // Clean up expired tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens()
    }, 60 * 60 * 1000)

    console.log('🛡️  Security headers initialized')
  }

  private getDefaultConfig(): SecurityConfig {
    return {
      csp: {
        enabled: true,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            "'unsafe-inline'", // Required for Next.js in development
            "'unsafe-eval'", // Required for Next.js in development
            'https://vercel.live',
            'https://va.vercel-scripts.com'
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'", // Required for CSS-in-JS
            'https://fonts.googleapis.com'
          ],
          'img-src': [
            "'self'",
            'data:',
            'https:',
            'blob:'
          ],
          'font-src': [
            "'self'",
            'https://fonts.gstatic.com'
          ],
          'connect-src': [
            "'self'",
            'https://api.supabase.co',
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.ipify.org',
            'https://api.qrserver.com'
          ],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': []
        }
      },
      csrf: {
        enabled: true,
        cookieName: '__Host-csrf-token',
        headerName: 'X-CSRF-Token',
        secretKey: process.env.CSRF_SECRET || 'buildology-csrf-secret-2024'
      },
      headers: {
        hsts: {
          enabled: true,
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
        frameOptions: 'DENY',
        contentTypeOptions: true,
        xssProtection: true,
        permissionsPolicy: [
          'camera=(), microphone=(), geolocation=()',
          'payment=(), usb=(), magnetometer=()',
          'accelerometer=(), gyroscope=(), vibrate=()'
        ]
      },
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
      }
    }
  }

  // Apply security headers to response
  applySecurityHeaders(response: NextResponse, request?: NextRequest): NextResponse {
    // Content Security Policy
    if (this.config.csp.enabled) {
      const cspValue = this.buildCSPHeader()
      const headerName = this.config.csp.reportOnly ? 
        'Content-Security-Policy-Report-Only' : 
        'Content-Security-Policy'
      
      response.headers.set(headerName, cspValue)
    }

    // HTTP Strict Transport Security
    if (this.config.headers.hsts.enabled) {
      const hstsValue = [
        `max-age=${this.config.headers.hsts.maxAge}`,
        this.config.headers.hsts.includeSubDomains ? 'includeSubDomains' : '',
        this.config.headers.hsts.preload ? 'preload' : ''
      ].filter(Boolean).join('; ')

      response.headers.set('Strict-Transport-Security', hstsValue)
    }

    // X-Frame-Options
    response.headers.set('X-Frame-Options', this.config.headers.frameOptions)

    // X-Content-Type-Options
    if (this.config.headers.contentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    // X-XSS-Protection
    if (this.config.headers.xssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block')
    }

    // Referrer Policy
    response.headers.set('Referrer-Policy', this.config.headers.referrerPolicy)

    // Permissions Policy
    if (this.config.headers.permissionsPolicy.length > 0) {
      response.headers.set('Permissions-Policy', this.config.headers.permissionsPolicy.join(', '))
    }

    // Additional security headers
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

    // Remove potentially revealing headers
    response.headers.delete('Server')
    response.headers.delete('X-Powered-By')

    return response
  }

  // Generate CSRF token
  generateCSRFToken(sessionId?: string): string {
    const tokenData = {
      sessionId: sessionId || 'anonymous',
      timestamp: Date.now(),
      random: Math.random().toString(36)
    }

    const token = this.encodeToken(tokenData)
    const expires = Date.now() + (4 * 60 * 60 * 1000) // 4 hours

    this.csrfTokens.set(token, { token, expires })

    return token
  }

  // Validate CSRF token
  validateCSRFToken(token: string, sessionId?: string): boolean {
    try {
      // Check if token exists and isn't expired
      const storedToken = this.csrfTokens.get(token)
      if (!storedToken || Date.now() > storedToken.expires) {
        return false
      }

      // Decode and validate token
      const tokenData = this.decodeToken(token)
      if (!tokenData) {
        return false
      }

      // Validate session if provided
      if (sessionId && tokenData.sessionId !== sessionId) {
        return false
      }

      // Token is valid
      return true

    } catch (error) {
      console.error('CSRF token validation error:', error)
      return false
    }
  }

  // CSRF protection middleware
  async validateCSRFProtection(request: NextRequest): Promise<{
    valid: boolean
    error?: string
    shouldBlock: boolean
  }> {
    if (!this.config.csrf.enabled) {
      return { valid: true, shouldBlock: false }
    }

    // Skip GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return { valid: true, shouldBlock: false }
    }

    // Skip certain API routes that use other authentication
    const url = request.nextUrl.pathname
    const skipRoutes = ['/api/auth/callback', '/api/webhooks']
    if (skipRoutes.some(route => url.startsWith(route))) {
      return { valid: true, shouldBlock: false }
    }

    try {
      // Get CSRF token from header or body
      let csrfToken = request.headers.get(this.config.csrf.headerName)
      
      if (!csrfToken && request.headers.get('content-type')?.includes('application/json')) {
        // Try to get from request body
        const body = await request.text()
        if (body) {
          try {
            const parsed = JSON.parse(body)
            csrfToken = parsed._csrf
          } catch (error) {
            // Body is not JSON or doesn't contain CSRF token
          }
        }
      }

      if (!csrfToken) {
        captureSecurityEvent({
          type: 'security.breach_detected',
          severity: 'high',
          details: `CSRF token missing for ${request.method} ${url}`,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        })

        return {
          valid: false,
          error: 'CSRF token missing',
          shouldBlock: true
        }
      }

      // Validate token
      const sessionId = this.getSessionIdFromRequest(request)
      const isValid = this.validateCSRFToken(csrfToken, sessionId)

      if (!isValid) {
        captureSecurityEvent({
          type: 'security.breach_detected',
          severity: 'critical',
          details: `Invalid CSRF token for ${request.method} ${url}`,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        })

        return {
          valid: false,
          error: 'Invalid CSRF token',
          shouldBlock: true
        }
      }

      return { valid: true, shouldBlock: false }

    } catch (error) {
      console.error('CSRF validation error:', error)
      return {
        valid: false,
        error: 'CSRF validation failed',
        shouldBlock: true
      }
    }
  }

  // Rate limiting
  async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    error?: string
  }> {
    if (!this.config.rateLimit.enabled) {
      return { allowed: true, remaining: 100, resetTime: Date.now() }
    }

    const identifier = this.getClientIdentifier(request)
    const now = Date.now()
    const windowStart = now - this.config.rateLimit.windowMs

    let clientData = this.rateLimitStore.get(identifier)
    
    // Clean up old data or initialize
    if (!clientData || clientData.resetTime <= windowStart) {
      clientData = {
        count: 0,
        resetTime: now + this.config.rateLimit.windowMs
      }
    }

    // Check if request should be counted
    const shouldCount = !this.config.rateLimit.skipSuccessfulRequests || 
                       !this.wasRequestSuccessful(request)

    if (shouldCount) {
      clientData.count++
    }

    this.rateLimitStore.set(identifier, clientData)

    const allowed = clientData.count <= this.config.rateLimit.maxRequests
    const remaining = Math.max(0, this.config.rateLimit.maxRequests - clientData.count)

    if (!allowed) {
      captureSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: `Rate limit exceeded: ${clientData.count} requests from ${identifier}`,
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })

      logAuditEvent(AUDIT_ACTIONS.SECURITY_BREACH_DETECTED, 'rate_limit', undefined, {
        identifier,
        requestCount: clientData.count,
        limit: this.config.rateLimit.maxRequests,
        windowMs: this.config.rateLimit.windowMs
      })
    }

    return {
      allowed,
      remaining,
      resetTime: clientData.resetTime,
      error: allowed ? undefined : 'Rate limit exceeded'
    }
  }

  // Build Content Security Policy header
  private buildCSPHeader(): string {
    const directives = []
    
    for (const [directive, values] of Object.entries(this.config.csp.directives)) {
      if (values.length === 0) {
        directives.push(directive)
      } else {
        directives.push(`${directive} ${values.join(' ')}`)
      }
    }

    return directives.join('; ')
  }

  // Encode CSRF token
  private encodeToken(data: any): string {
    const jsonData = JSON.stringify(data)
    const encoded = Buffer.from(jsonData).toString('base64url')
    
    // Add simple signature (in production, use proper HMAC)
    const signature = this.simpleHash(encoded + this.config.csrf.secretKey)
    return `${encoded}.${signature}`
  }

  // Decode CSRF token
  private decodeToken(token: string): any {
    try {
      const [encoded, signature] = token.split('.')
      if (!encoded || !signature) return null

      // Verify signature
      const expectedSignature = this.simpleHash(encoded + this.config.csrf.secretKey)
      if (signature !== expectedSignature) return null

      const jsonData = Buffer.from(encoded, 'base64url').toString()
      return JSON.parse(jsonData)
    } catch (error) {
      return null
    }
  }

  // Simple hash function (use proper crypto in production)
  private simpleHash(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // Get session ID from request
  private getSessionIdFromRequest(request: NextRequest): string | undefined {
    // Try to get from cookie or header
    const sessionCookie = request.cookies.get('session-id')
    if (sessionCookie) return sessionCookie.value

    const sessionHeader = request.headers.get('x-session-id')
    if (sessionHeader) return sessionHeader

    return undefined
  }

  // Get client identifier for rate limiting
  private getClientIdentifier(request: NextRequest): string {
    // Use IP address as identifier
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = request.headers.get('x-client-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return realIP || clientIP || 'unknown'
  }

  // Check if request was successful (for rate limiting)
  private wasRequestSuccessful(request: NextRequest): boolean {
    // This would need to be implemented based on response status
    // For now, assume all requests should be counted
    return false
  }

  // Clean up expired CSRF tokens
  private cleanupExpiredTokens(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [token, data] of this.csrfTokens.entries()) {
      if (data.expires < now) {
        this.csrfTokens.delete(token)
        cleanedCount++
      }
    }

    // Clean up rate limit store
    for (const [identifier, data] of this.rateLimitStore.entries()) {
      if (data.resetTime < now) {
        this.rateLimitStore.delete(identifier)
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired CSRF tokens`)
    }
  }

  // Update security configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🛡️  Security configuration updated')
  }

  // Get security statistics
  getSecurityStats(): {
    csrfTokensActive: number
    rateLimitEntries: number
    cspEnabled: boolean
    hstsEnabled: boolean
  } {
    return {
      csrfTokensActive: this.csrfTokens.size,
      rateLimitEntries: this.rateLimitStore.size,
      cspEnabled: this.config.csp.enabled,
      hstsEnabled: this.config.headers.hsts.enabled
    }
  }
}

// Export singleton
export const securityHeaders = SecurityHeaders.getInstance()

// Convenience functions
export const applySecurityHeaders = (response: NextResponse, request?: NextRequest) => 
  securityHeaders.applySecurityHeaders(response, request)

export const generateCSRFToken = (sessionId?: string) => 
  securityHeaders.generateCSRFToken(sessionId)

export const validateCSRFToken = (token: string, sessionId?: string) => 
  securityHeaders.validateCSRFToken(token, sessionId)

export const validateCSRFProtection = (request: NextRequest) => 
  securityHeaders.validateCSRFProtection(request)

export const checkRateLimit = (request: NextRequest) => 
  securityHeaders.checkRateLimit(request)

// Security middleware function
export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Check rate limiting
  const rateLimitResult = await checkRateLimit(request)
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.resetTime },
      { status: 429 }
    )
    
    response.headers.set('X-RateLimit-Limit', securityHeaders.config.rateLimit.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
    response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString())
    
    return applySecurityHeaders(response, request)
  }

  // Check CSRF protection
  const csrfResult = await validateCSRFProtection(request)
  if (!csrfResult.valid && csrfResult.shouldBlock) {
    const response = NextResponse.json(
      { error: csrfResult.error || 'CSRF validation failed' },
      { status: 403 }
    )
    
    return applySecurityHeaders(response, request)
  }

  // Continue with request
  return null
}

// React hook for security
export function useSecurity() {
  return {
    generateCSRFToken,
    validateCSRFToken,
    getSecurityStats: () => securityHeaders.getSecurityStats(),
    updateConfig: (config: Partial<SecurityConfig>) => securityHeaders.updateConfig(config)
  }
}