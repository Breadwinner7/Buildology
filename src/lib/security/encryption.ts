// Data encryption utilities for sensitive information protection
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Sensitive data types that require encryption
export type SensitiveDataType = 
  | 'pii'           // Personally Identifiable Information
  | 'financial'     // Financial data (amounts, account numbers)
  | 'medical'       // Medical information
  | 'documents'     // Sensitive documents
  | 'credentials'   // Passwords, API keys
  | 'communication' // Private messages, emails

export interface EncryptionResult {
  encryptedData: string
  keyId: string
  algorithm: string
  timestamp: Date
}

export interface DecryptionRequest {
  encryptedData: string
  keyId: string
  userId?: string
  purpose: string
}

export interface EncryptionKey {
  id: string
  key: CryptoKey
  algorithm: string
  createdAt: Date
  rotationDue: Date
  isActive: boolean
}

class EncryptionManager {
  private static instance: EncryptionManager
  private keys: Map<string, EncryptionKey> = new Map()
  private currentKeyId: string | null = null
  private readonly KEY_ROTATION_DAYS = 90 // Rotate keys every 90 days

  private constructor() {
    this.initialize()
  }

  public static getInstance(): EncryptionManager {
    if (!this.instance) {
      this.instance = new EncryptionManager()
    }
    return this.instance
  }

  private async initialize() {
    try {
      await this.loadOrCreateMasterKey()
      this.startKeyRotationSchedule()
      console.log('🔐 Encryption Manager initialized')
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
      throw error
    }
  }

  // Encrypt sensitive data
  async encryptSensitiveData(
    data: string, 
    dataType: SensitiveDataType, 
    userId?: string
  ): Promise<EncryptionResult> {
    try {
      if (!this.currentKeyId) {
        throw new Error('No encryption key available')
      }

      const key = this.keys.get(this.currentKeyId)
      if (!key) {
        throw new Error('Encryption key not found')
      }

      // Convert data to bytes
      const dataBytes = new TextEncoder().encode(data)
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key.key,
        dataBytes
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      const encryptedData = this.arrayBufferToBase64(combined)

      const result: EncryptionResult = {
        encryptedData,
        keyId: this.currentKeyId,
        algorithm: key.algorithm,
        timestamp: new Date()
      }

      // Log encryption event for audit
      logAuditEvent(AUDIT_ACTIONS.SENSITIVE_DATA_ACCESSED, 'encryption', undefined, {
        action: 'encrypt',
        dataType,
        userId,
        keyId: this.currentKeyId,
        dataLength: data.length
      })

      return result

    } catch (error) {
      console.error('Encryption failed:', error)
      
      captureSecurityEvent({
        type: 'security.breach_detected',
        severity: 'high',
        details: `Encryption failed for ${dataType}`,
        timestamp: new Date(),
        userId
      })

      throw new Error('Failed to encrypt sensitive data')
    }
  }

  // Decrypt sensitive data
  async decryptSensitiveData(request: DecryptionRequest): Promise<string> {
    try {
      const key = this.keys.get(request.keyId)
      if (!key) {
        throw new Error('Decryption key not found')
      }

      // Decode base64 data
      const combined = this.base64ToArrayBuffer(request.encryptedData)
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encryptedData = combined.slice(12)

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key.key,
        encryptedData
      )

      const decryptedText = new TextDecoder().decode(decrypted)

      // Log decryption event for audit
      logAuditEvent(AUDIT_ACTIONS.SENSITIVE_DATA_ACCESSED, 'encryption', undefined, {
        action: 'decrypt',
        keyId: request.keyId,
        userId: request.userId,
        purpose: request.purpose,
        dataLength: decryptedText.length
      })

      return decryptedText

    } catch (error) {
      console.error('Decryption failed:', error)
      
      captureSecurityEvent({
        type: 'unauthorized_access',
        severity: 'high',
        details: `Decryption failed - possible tampering detected`,
        timestamp: new Date(),
        userId: request.userId
      })

      throw new Error('Failed to decrypt sensitive data')
    }
  }

  // Encrypt PII (Personally Identifiable Information)
  async encryptPII(data: {
    name?: string
    email?: string
    phone?: string
    ssn?: string
    address?: string
    [key: string]: string | undefined
  }, userId?: string): Promise<Record<string, EncryptionResult>> {
    const encrypted: Record<string, EncryptionResult> = {}

    for (const [field, value] of Object.entries(data)) {
      if (value && typeof value === 'string') {
        encrypted[field] = await this.encryptSensitiveData(value, 'pii', userId)
      }
    }

    return encrypted
  }

  // Decrypt PII
  async decryptPII(
    encryptedData: Record<string, EncryptionResult>, 
    userId?: string,
    purpose = 'data_access'
  ): Promise<Record<string, string>> {
    const decrypted: Record<string, string> = {}

    for (const [field, encryptionResult] of Object.entries(encryptedData)) {
      const request: DecryptionRequest = {
        encryptedData: encryptionResult.encryptedData,
        keyId: encryptionResult.keyId,
        userId,
        purpose: `pii_${field}_${purpose}`
      }
      
      decrypted[field] = await this.decryptSensitiveData(request)
    }

    return decrypted
  }

  // Encrypt financial data
  async encryptFinancialData(data: {
    amount?: number
    accountNumber?: string
    routingNumber?: string
    cardNumber?: string
    [key: string]: string | number | undefined
  }, userId?: string): Promise<Record<string, EncryptionResult>> {
    const encrypted: Record<string, EncryptionResult> = {}

    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined) {
        const stringValue = typeof value === 'number' ? value.toString() : value
        encrypted[field] = await this.encryptSensitiveData(stringValue, 'financial', userId)
      }
    }

    return encrypted
  }

  // Hash sensitive data for indexing (one-way)
  async hashForIndexing(data: string, salt?: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data + (salt || 'buildology_salt_2024'))
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes)
    return this.arrayBufferToBase64(hashBuffer)
  }

  // Generate secure random string
  generateSecureRandom(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    
    return Array.from(array, byte => chars[byte % chars.length]).join('')
  }

  // Create or load master encryption key
  private async loadOrCreateMasterKey(): Promise<void> {
    try {
      // In production, load key from secure key management service
      // For now, create a new key each session
      await this.createNewEncryptionKey()
    } catch (error) {
      console.error('Failed to load master key:', error)
      throw error
    }
  }

  // Create new encryption key
  private async createNewEncryptionKey(): Promise<string> {
    const keyId = `key_${Date.now()}_${this.generateSecureRandom(8)}`
    
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // not extractable for security
      ['encrypt', 'decrypt']
    )

    const encryptionKey: EncryptionKey = {
      id: keyId,
      key,
      algorithm: 'AES-GCM',
      createdAt: new Date(),
      rotationDue: new Date(Date.now() + this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000),
      isActive: true
    }

    this.keys.set(keyId, encryptionKey)
    this.currentKeyId = keyId

    // Log key creation
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'encryption', undefined, {
      action: 'key_created',
      keyId,
      algorithm: 'AES-GCM'
    })

    console.log('🔑 New encryption key created:', keyId)
    return keyId
  }

  // Rotate encryption keys
  private async rotateEncryptionKey(): Promise<void> {
    try {
      const oldKeyId = this.currentKeyId
      const newKeyId = await this.createNewEncryptionKey()

      // Deactivate old key but keep it for decryption
      if (oldKeyId) {
        const oldKey = this.keys.get(oldKeyId)
        if (oldKey) {
          oldKey.isActive = false
          this.keys.set(oldKeyId, oldKey)
        }
      }

      // Log key rotation
      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'encryption', undefined, {
        action: 'key_rotated',
        oldKeyId,
        newKeyId
      })

      captureSecurityEvent({
        type: 'security.config_changed',
        severity: 'medium',
        details: 'Encryption key rotated successfully',
        timestamp: new Date()
      })

      console.log('🔄 Encryption key rotated:', oldKeyId, '->', newKeyId)

    } catch (error) {
      console.error('Key rotation failed:', error)
      
      captureSecurityEvent({
        type: 'security.breach_detected',
        severity: 'critical',
        details: 'Encryption key rotation failed',
        timestamp: new Date()
      })
    }
  }

  // Start automatic key rotation
  private startKeyRotationSchedule(): void {
    // Check for key rotation daily
    setInterval(() => {
      if (this.currentKeyId) {
        const currentKey = this.keys.get(this.currentKeyId)
        if (currentKey && new Date() >= currentKey.rotationDue) {
          this.rotateEncryptionKey()
        }
      }
    }, 24 * 60 * 60 * 1000) // Daily check
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  // Public API methods
  getCurrentKeyId(): string | null {
    return this.currentKeyId
  }

  getKeyStats(): {
    totalKeys: number
    activeKeys: number
    oldestKey?: Date
    newestKey?: Date
    nextRotation?: Date
  } {
    const keys = Array.from(this.keys.values())
    const activeKeys = keys.filter(k => k.isActive)
    
    return {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      oldestKey: keys.length > 0 ? 
        keys.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0].createdAt :
        undefined,
      newestKey: keys.length > 0 ?
        keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt :
        undefined,
      nextRotation: this.currentKeyId ? 
        this.keys.get(this.currentKeyId)?.rotationDue :
        undefined
    }
  }

  // Force key rotation (admin function)
  async forceKeyRotation(): Promise<void> {
    await this.rotateEncryptionKey()
  }

  // Verify data integrity
  async verifyDataIntegrity(
    originalData: string, 
    encryptedResult: EncryptionResult
  ): Promise<boolean> {
    try {
      const decrypted = await this.decryptSensitiveData({
        encryptedData: encryptedResult.encryptedData,
        keyId: encryptedResult.keyId,
        purpose: 'integrity_check'
      })

      return originalData === decrypted
    } catch (error) {
      return false
    }
  }
}

// Export singleton
export const encryptionManager = EncryptionManager.getInstance()

// Convenience functions
export const encryptSensitiveData = (data: string, type: SensitiveDataType, userId?: string) =>
  encryptionManager.encryptSensitiveData(data, type, userId)

export const decryptSensitiveData = (request: DecryptionRequest) =>
  encryptionManager.decryptSensitiveData(request)

export const encryptPII = (data: Record<string, string | undefined>, userId?: string) =>
  encryptionManager.encryptPII(data, userId)

export const decryptPII = (data: Record<string, EncryptionResult>, userId?: string, purpose?: string) =>
  encryptionManager.decryptPII(data, userId, purpose)

export const encryptFinancialData = (data: Record<string, string | number | undefined>, userId?: string) =>
  encryptionManager.encryptFinancialData(data, userId)

export const hashForIndexing = (data: string, salt?: string) =>
  encryptionManager.hashForIndexing(data, salt)

export const generateSecureRandom = (length?: number) =>
  encryptionManager.generateSecureRandom(length)

// React hook for encryption
export function useEncryption() {
  return {
    encryptSensitiveData,
    decryptSensitiveData,
    encryptPII,
    decryptPII,
    encryptFinancialData,
    hashForIndexing,
    generateSecureRandom,
    getCurrentKeyId: () => encryptionManager.getCurrentKeyId(),
    getKeyStats: () => encryptionManager.getKeyStats(),
    forceKeyRotation: () => encryptionManager.forceKeyRotation(),
    verifyIntegrity: (original: string, encrypted: EncryptionResult) =>
      encryptionManager.verifyDataIntegrity(original, encrypted)
  }
}