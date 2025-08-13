'use client'

import { createClient } from '@/lib/supabase/client'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Multi-Factor Authentication for enhanced security
export interface MFASetup {
  userId: string
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  isEnabled: boolean
  setupDate: Date
}

export interface MFAVerification {
  userId: string
  code: string
  timestamp: Date
  success: boolean
  method: 'totp' | 'backup' | 'sms'
  deviceInfo: string
}

class MFAManager {
  private static instance: MFAManager
  private userMFA: Map<string, MFASetup> = new Map()
  private verificationAttempts: MFAVerification[] = []

  private constructor() {
    this.initialize()
  }

  public static getInstance(): MFAManager {
    if (!this.instance) {
      this.instance = new MFAManager()
    }
    return this.instance
  }

  private initialize() {
    if (typeof window === 'undefined') return

    // Load MFA data from storage
    try {
      const stored = localStorage.getItem('mfa_setups')
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.entries(parsed).forEach(([userId, setup]: [string, any]) => {
          this.userMFA.set(userId, {
            ...setup,
            setupDate: new Date(setup.setupDate)
          })
        })
      }

      const storedVerifications = localStorage.getItem('mfa_verifications')
      if (storedVerifications) {
        this.verificationAttempts = JSON.parse(storedVerifications).map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp)
        }))
      }
    } catch (error) {
      console.warn('Failed to load MFA data:', error)
    }

    console.log('🔐 MFA Manager initialized')
  }

  // Setup TOTP-based MFA
  async setupTOTP(userId: string, userEmail: string): Promise<{
    secret: string
    qrCodeUrl: string
    backupCodes: string[]
    manualEntryKey: string
  }> {
    try {
      // Generate secret
      const secret = this.generateSecret()
      const serviceName = 'Buildology Insurance'
      const accountName = userEmail
      
      // Generate QR code URL
      const qrCodeUrl = this.generateQRCodeUrl(serviceName, accountName, secret)
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes()
      
      // Store MFA setup (not enabled yet)
      const mfaSetup: MFASetup = {
        userId,
        secret,
        qrCodeUrl,
        backupCodes,
        isEnabled: false,
        setupDate: new Date()
      }
      
      this.userMFA.set(userId, mfaSetup)
      this.persistMFAData()

      // Log audit event
      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'mfa', userId, {
        action: 'mfa_setup_initiated',
        email: userEmail
      })

      return {
        secret,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: this.formatSecretForManualEntry(secret)
      }

    } catch (error) {
      console.error('MFA setup error:', error)
      throw new Error('Failed to setup MFA')
    }
  }

  // Verify TOTP code and enable MFA
  async enableMFA(userId: string, verificationCode: string): Promise<{
    success: boolean
    error?: string
  }> {
    const mfaSetup = this.userMFA.get(userId)
    if (!mfaSetup) {
      return { success: false, error: 'MFA setup not found' }
    }

    // Verify the code
    const isValid = this.verifyTOTP(mfaSetup.secret, verificationCode)
    
    const verification: MFAVerification = {
      userId,
      code: verificationCode,
      timestamp: new Date(),
      success: isValid,
      method: 'totp',
      deviceInfo: navigator.userAgent
    }

    this.verificationAttempts.push(verification)
    this.persistVerificationAttempts()

    if (!isValid) {
      // Log failed verification
      logAuditEvent(AUDIT_ACTIONS.LOGIN_FAILED, 'mfa', userId, {
        reason: 'invalid_mfa_code',
        method: 'totp'
      })

      captureSecurityEvent({
        type: 'auth_failure',
        severity: 'medium',
        details: 'Failed MFA verification during setup',
        timestamp: new Date(),
        userId
      })

      return { success: false, error: 'Invalid verification code' }
    }

    // Enable MFA
    mfaSetup.isEnabled = true
    this.userMFA.set(userId, mfaSetup)
    this.persistMFAData()

    // Log successful MFA enablement
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'mfa', userId, {
      action: 'mfa_enabled',
      method: 'totp'
    })

    console.log('🔐 MFA enabled for user:', userId)
    return { success: true }
  }

  // Verify MFA during login
  async verifyMFA(userId: string, code: string, method: 'totp' | 'backup' = 'totp'): Promise<{
    success: boolean
    error?: string
  }> {
    const mfaSetup = this.userMFA.get(userId)
    if (!mfaSetup || !mfaSetup.isEnabled) {
      return { success: false, error: 'MFA not enabled for this user' }
    }

    let isValid = false

    if (method === 'totp') {
      isValid = this.verifyTOTP(mfaSetup.secret, code)
    } else if (method === 'backup') {
      isValid = this.verifyBackupCode(userId, code)
    }

    const verification: MFAVerification = {
      userId,
      code: method === 'backup' ? '******' : code, // Hide backup codes in logs
      timestamp: new Date(),
      success: isValid,
      method,
      deviceInfo: navigator.userAgent
    }

    this.verificationAttempts.push(verification)
    this.persistVerificationAttempts()

    if (!isValid) {
      // Check for brute force attempts
      const recentFailures = this.verificationAttempts.filter(
        v => v.userId === userId && 
            !v.success && 
            Date.now() - v.timestamp.getTime() < 15 * 60 * 1000 // 15 minutes
      )

      if (recentFailures.length >= 5) {
        captureSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          details: `Multiple MFA failures for user ${userId}`,
          timestamp: new Date(),
          userId
        })
      }

      logAuditEvent(AUDIT_ACTIONS.LOGIN_FAILED, 'mfa', userId, {
        reason: 'invalid_mfa_code',
        method,
        attempts: recentFailures.length
      })

      return { success: false, error: 'Invalid verification code' }
    }

    // Successful verification
    logAuditEvent(AUDIT_ACTIONS.LOGIN, 'mfa', userId, {
      method,
      verificationSuccess: true
    })

    console.log('🔐 MFA verification successful:', userId, method)
    return { success: true }
  }

  // Disable MFA (requires current verification)
  async disableMFA(userId: string, verificationCode: string): Promise<{
    success: boolean
    error?: string
  }> {
    const mfaSetup = this.userMFA.get(userId)
    if (!mfaSetup || !mfaSetup.isEnabled) {
      return { success: false, error: 'MFA not enabled' }
    }

    // Verify current MFA code before disabling
    const verification = await this.verifyMFA(userId, verificationCode)
    if (!verification.success) {
      return { success: false, error: 'Invalid verification code' }
    }

    // Disable MFA
    mfaSetup.isEnabled = false
    this.userMFA.set(userId, mfaSetup)
    this.persistMFAData()

    // Log MFA disabled
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'mfa', userId, {
      action: 'mfa_disabled'
    })

    captureSecurityEvent({
      type: 'unauthorized_access',
      severity: 'medium',
      details: 'MFA disabled by user',
      timestamp: new Date(),
      userId
    })

    console.log('🔐 MFA disabled for user:', userId)
    return { success: true }
  }

  // Generate new backup codes
  async regenerateBackupCodes(userId: string, verificationCode: string): Promise<{
    success: boolean
    backupCodes?: string[]
    error?: string
  }> {
    const mfaSetup = this.userMFA.get(userId)
    if (!mfaSetup || !mfaSetup.isEnabled) {
      return { success: false, error: 'MFA not enabled' }
    }

    // Verify current MFA code
    const verification = await this.verifyMFA(userId, verificationCode)
    if (!verification.success) {
      return { success: false, error: 'Invalid verification code' }
    }

    // Generate new backup codes
    const newBackupCodes = this.generateBackupCodes()
    mfaSetup.backupCodes = newBackupCodes
    this.userMFA.set(userId, mfaSetup)
    this.persistMFAData()

    // Log backup codes regenerated
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'mfa', userId, {
      action: 'backup_codes_regenerated'
    })

    return { success: true, backupCodes: newBackupCodes }
  }

  // Check if user has MFA enabled
  isMFAEnabled(userId: string): boolean {
    const mfaSetup = this.userMFA.get(userId)
    return mfaSetup?.isEnabled ?? false
  }

  // Get MFA status for user
  getMFAStatus(userId: string): {
    enabled: boolean
    setupDate?: Date
    backupCodesRemaining?: number
  } {
    const mfaSetup = this.userMFA.get(userId)
    
    if (!mfaSetup) {
      return { enabled: false }
    }

    return {
      enabled: mfaSetup.isEnabled,
      setupDate: mfaSetup.setupDate,
      backupCodesRemaining: mfaSetup.backupCodes.length
    }
  }

  // TOTP Implementation
  private verifyTOTP(secret: string, token: string, window = 1): boolean {
    const epoch = Math.round(Date.now() / 1000 / 30)

    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generateTOTP(secret, epoch + i)
      if (expectedToken === token) {
        return true
      }
    }

    return false
  }

  private generateTOTP(secret: string, epoch: number): string {
    // Simplified TOTP implementation
    // In production, use a proper TOTP library like 'otplib'
    const key = this.base32Decode(secret)
    const time = this.int64ToBytes(epoch)
    const hmac = this.hmacSha1(key, time)
    const offset = hmac[hmac.length - 1] & 0xf
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff)
    
    return (code % 1000000).toString().padStart(6, '0')
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  private generateQRCodeUrl(serviceName: string, accountName: string, secret: string): string {
    const label = encodeURIComponent(`${serviceName}:${accountName}`)
    const params = new URLSearchParams({
      secret,
      issuer: serviceName,
      algorithm: 'SHA1',
      digits: '6',
      period: '30'
    })
    
    const otpUrl = `otpauth://totp/${label}?${params.toString()}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUrl)}`
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substr(2, 8).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  private verifyBackupCode(userId: string, code: string): boolean {
    const mfaSetup = this.userMFA.get(userId)
    if (!mfaSetup) return false

    const codeIndex = mfaSetup.backupCodes.indexOf(code)
    if (codeIndex === -1) return false

    // Remove used backup code
    mfaSetup.backupCodes.splice(codeIndex, 1)
    this.userMFA.set(userId, mfaSetup)
    this.persistMFAData()

    // Log backup code usage
    logAuditEvent(AUDIT_ACTIONS.LOGIN, 'mfa', userId, {
      method: 'backup_code',
      backupCodesRemaining: mfaSetup.backupCodes.length
    })

    return true
  }

  private formatSecretForManualEntry(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret
  }

  // Helper functions for TOTP (simplified - use proper crypto library in production)
  private base32Decode(encoded: string): Uint8Array {
    // Simplified base32 decode - use proper library in production
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = ''
    
    for (const char of encoded) {
      const index = alphabet.indexOf(char)
      if (index !== -1) {
        bits += index.toString(2).padStart(5, '0')
      }
    }
    
    const bytes = new Uint8Array(Math.floor(bits.length / 8))
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2)
    }
    
    return bytes
  }

  private int64ToBytes(num: number): Uint8Array {
    const bytes = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) {
      bytes[i] = num & 0xff
      num = Math.floor(num / 256)
    }
    return bytes
  }

  private hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
    // Simplified HMAC-SHA1 - use proper crypto library in production
    // This is a placeholder implementation
    const crypto = window.crypto || (window as any).msCrypto
    if (!crypto) throw new Error('Crypto API not available')
    
    // Return mock hash for demo - implement proper HMAC-SHA1
    return new Uint8Array(20).fill(0).map(() => Math.floor(Math.random() * 256))
  }

  // Persistence
  private persistMFAData() {
    if (typeof window !== 'undefined') {
      const data = Object.fromEntries(this.userMFA)
      localStorage.setItem('mfa_setups', JSON.stringify(data))
    }
  }

  private persistVerificationAttempts() {
    if (typeof window !== 'undefined') {
      // Keep only recent attempts (last 30 days)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const recentAttempts = this.verificationAttempts.filter(
        attempt => attempt.timestamp.getTime() > thirtyDaysAgo
      )
      localStorage.setItem('mfa_verifications', JSON.stringify(recentAttempts))
    }
  }

  // Analytics
  getMFAStats(): {
    totalUsers: number
    enabledUsers: number
    recentVerifications: number
    failureRate: number
  } {
    const totalUsers = this.userMFA.size
    const enabledUsers = Array.from(this.userMFA.values()).filter(setup => setup.isEnabled).length
    
    const recent = this.verificationAttempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 24 * 60 * 60 * 1000
    )
    const failures = recent.filter(attempt => !attempt.success)
    
    return {
      totalUsers,
      enabledUsers,
      recentVerifications: recent.length,
      failureRate: recent.length > 0 ? (failures.length / recent.length) * 100 : 0
    }
  }
}

// Export singleton
export const mfaManager = MFAManager.getInstance()

// Convenience functions
export const setupMFA = (userId: string, userEmail: string) => mfaManager.setupTOTP(userId, userEmail)
export const enableMFA = (userId: string, code: string) => mfaManager.enableMFA(userId, code)
export const verifyMFA = (userId: string, code: string, method?: 'totp' | 'backup') => mfaManager.verifyMFA(userId, code, method)
export const disableMFA = (userId: string, code: string) => mfaManager.disableMFA(userId, code)
export const isMFAEnabled = (userId: string) => mfaManager.isMFAEnabled(userId)
export const getMFAStatus = (userId: string) => mfaManager.getMFAStatus(userId)
export const regenerateBackupCodes = (userId: string, code: string) => mfaManager.regenerateBackupCodes(userId, code)

// React hook
export function useMFA() {
  return {
    setupMFA,
    enableMFA,
    verifyMFA,
    disableMFA,
    isMFAEnabled,
    getMFAStatus,
    regenerateBackupCodes,
    getMFAStats: () => mfaManager.getMFAStats()
  }
}