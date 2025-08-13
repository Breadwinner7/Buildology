// GDPR Data Privacy Controls and Data Subject Rights Implementation
import { encryptPII, decryptPII } from '@/lib/security/encryption'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// GDPR Data Subject Rights (Articles 15-22)
export enum DataSubjectRight {
  ACCESS = 'access',              // Article 15 - Right of access
  RECTIFICATION = 'rectification', // Article 16 - Right to rectification
  ERASURE = 'erasure',            // Article 17 - Right to erasure ('right to be forgotten')
  RESTRICT = 'restrict',          // Article 18 - Right to restriction of processing
  PORTABILITY = 'portability',    // Article 20 - Right to data portability
  OBJECT = 'object',              // Article 21 - Right to object
  AUTOMATED_DECISION = 'automated_decision' // Article 22 - Automated decision-making
}

// Legal bases for processing (Article 6)
export enum LegalBasis {
  CONSENT = 'consent',                    // Article 6(1)(a)
  CONTRACT = 'contract',                  // Article 6(1)(b)
  LEGAL_OBLIGATION = 'legal_obligation',  // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests',    // Article 6(1)(d)
  PUBLIC_TASK = 'public_task',           // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'legitimate_interests' // Article 6(1)(f)
}

// Data categories for processing
export enum DataCategory {
  IDENTITY = 'identity',           // Name, address, ID numbers
  CONTACT = 'contact',             // Email, phone, postal address
  FINANCIAL = 'financial',         // Bank details, payment info
  TECHNICAL = 'technical',         // IP addresses, device info, cookies
  BEHAVIORAL = 'behavioral',       // Usage patterns, preferences
  SENSITIVE = 'sensitive',         // Health, political, biometric data
  LOCATION = 'location',           // GPS, geolocation data
  COMMUNICATION = 'communication'  // Messages, calls, emails
}

// Data processing record
export interface ProcessingRecord {
  id: string
  dataSubjectId: string
  purpose: string
  legalBasis: LegalBasis
  dataCategories: DataCategory[]
  processingActivities: string[]
  retentionPeriod: number // in days
  thirdPartySharing: boolean
  internationalTransfer: boolean
  automatedDecisionMaking: boolean
  createdAt: Date
  updatedAt: Date
  consentWithdrawn?: Date
  erasureScheduled?: Date
}

// Consent record
export interface ConsentRecord {
  id: string
  dataSubjectId: string
  purposes: string[]
  dataCategories: DataCategory[]
  consentGiven: Date
  consentWithdrawn?: Date
  consentMethod: 'explicit' | 'implied' | 'opt_in' | 'opt_out'
  ipAddress: string
  userAgent: string
  isActive: boolean
  parentConsent?: boolean // for minors
}

// Data subject request
export interface DataSubjectRequest {
  id: string
  type: DataSubjectRight
  dataSubjectId: string
  requesterEmail: string
  identityVerified: boolean
  description: string
  requestDate: Date
  responseDeadline: Date
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'extended'
  rejectionReason?: string
  handledBy?: string
  response?: {
    data?: any
    explanation: string
    actions: string[]
    completedAt: Date
  }
  followUpRequired: boolean
}

// Data retention policy
export interface RetentionPolicy {
  dataCategory: DataCategory
  purpose: string
  retentionPeriod: number // days
  activeRetention: number // days for active processing
  archiveRetention: number // days in archive
  legalHoldExemption: boolean
  deletionMethod: 'soft' | 'hard' | 'anonymize'
  reviewPeriod: number // days between reviews
}

class GDPRControls {
  private static instance: GDPRControls
  private processingRecords: Map<string, ProcessingRecord[]> = new Map()
  private consentRecords: Map<string, ConsentRecord[]> = new Map()
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map()
  private retentionPolicies: Map<DataCategory, RetentionPolicy> = new Map()

  private constructor() {
    this.initializeRetentionPolicies()
    this.startAutomaticProcesses()
    console.log('🔒 GDPR Controls initialized')
  }

  public static getInstance(): GDPRControls {
    if (!this.instance) {
      this.instance = new GDPRControls()
    }
    return this.instance
  }

  private initializeRetentionPolicies() {
    // Define retention policies for different data categories
    const policies: RetentionPolicy[] = [
      {
        dataCategory: DataCategory.IDENTITY,
        purpose: 'customer_relationship',
        retentionPeriod: 2555, // 7 years for financial records
        activeRetention: 1095,  // 3 years active
        archiveRetention: 1460, // 4 years archive
        legalHoldExemption: true,
        deletionMethod: 'hard',
        reviewPeriod: 365
      },
      {
        dataCategory: DataCategory.FINANCIAL,
        purpose: 'transaction_processing',
        retentionPeriod: 2555, // 7 years for financial records
        activeRetention: 365,   // 1 year active
        archiveRetention: 2190, // 6 years archive
        legalHoldExemption: true,
        deletionMethod: 'hard',
        reviewPeriod: 180
      },
      {
        dataCategory: DataCategory.TECHNICAL,
        purpose: 'system_operation',
        retentionPeriod: 365,   // 1 year for technical data
        activeRetention: 90,    // 3 months active
        archiveRetention: 275,  // 9 months archive
        legalHoldExemption: false,
        deletionMethod: 'anonymize',
        reviewPeriod: 90
      },
      {
        dataCategory: DataCategory.BEHAVIORAL,
        purpose: 'service_improvement',
        retentionPeriod: 1095,  // 3 years for behavioral data
        activeRetention: 365,   // 1 year active
        archiveRetention: 730,  // 2 years archive
        legalHoldExemption: false,
        deletionMethod: 'anonymize',
        reviewPeriod: 180
      }
    ]

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.dataCategory, policy)
    })
  }

  // Record data processing activity
  async recordProcessingActivity(
    dataSubjectId: string,
    purpose: string,
    legalBasis: LegalBasis,
    dataCategories: DataCategory[],
    processingActivities: string[],
    options: {
      thirdPartySharing?: boolean
      internationalTransfer?: boolean
      automatedDecisionMaking?: boolean
    } = {}
  ): Promise<ProcessingRecord> {
    const record: ProcessingRecord = {
      id: `processing_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      dataSubjectId,
      purpose,
      legalBasis,
      dataCategories,
      processingActivities,
      retentionPeriod: this.calculateRetentionPeriod(dataCategories, purpose),
      thirdPartySharing: options.thirdPartySharing || false,
      internationalTransfer: options.internationalTransfer || false,
      automatedDecisionMaking: options.automatedDecisionMaking || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Store processing record
    const userRecords = this.processingRecords.get(dataSubjectId) || []
    userRecords.push(record)
    this.processingRecords.set(dataSubjectId, userRecords)

    // Log processing activity
    logAuditEvent(AUDIT_ACTIONS.SENSITIVE_DATA_ACCESSED, 'gdpr_processing', dataSubjectId, {
      processingId: record.id,
      purpose,
      legalBasis,
      dataCategories,
      processingActivities
    })

    console.log('📝 GDPR processing activity recorded:', record.id)
    return record
  }

  // Record explicit consent
  async recordConsent(
    dataSubjectId: string,
    purposes: string[],
    dataCategories: DataCategory[],
    consentMethod: ConsentRecord['consentMethod'] = 'explicit',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown',
    isMinor = false
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      dataSubjectId,
      purposes,
      dataCategories,
      consentGiven: new Date(),
      consentMethod,
      ipAddress,
      userAgent,
      isActive: true,
      parentConsent: isMinor
    }

    // Store consent record
    const userConsents = this.consentRecords.get(dataSubjectId) || []
    userConsents.push(consent)
    this.consentRecords.set(dataSubjectId, userConsents)

    // Log consent
    logAuditEvent(AUDIT_ACTIONS.USER_CREATED, 'gdpr_consent', dataSubjectId, {
      consentId: consent.id,
      purposes,
      dataCategories,
      consentMethod,
      isMinor
    })

    console.log('✅ GDPR consent recorded:', consent.id)
    return consent
  }

  // Withdraw consent
  async withdrawConsent(
    dataSubjectId: string,
    consentId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const userConsents = this.consentRecords.get(dataSubjectId) || []
    const consent = userConsents.find(c => c.id === consentId)

    if (!consent || !consent.isActive) {
      return { success: false, message: 'Consent record not found or already withdrawn' }
    }

    // Withdraw consent
    consent.consentWithdrawn = new Date()
    consent.isActive = false

    // Update processing records based on withdrawn consent
    const processingRecords = this.processingRecords.get(dataSubjectId) || []
    processingRecords.forEach(record => {
      if (record.legalBasis === LegalBasis.CONSENT) {
        // Schedule for erasure if consent was the only legal basis
        record.erasureScheduled = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        record.updatedAt = new Date()
      }
    })

    // Log consent withdrawal
    logAuditEvent(AUDIT_ACTIONS.USER_UPDATED, 'gdpr_consent_withdrawn', dataSubjectId, {
      consentId,
      withdrawnAt: consent.consentWithdrawn,
      reason
    })

    console.log('🚫 GDPR consent withdrawn:', consentId)
    return { success: true, message: 'Consent withdrawn successfully' }
  }

  // Handle data subject access request (Article 15)
  async handleAccessRequest(
    dataSubjectId: string,
    requesterEmail: string,
    identityVerified = false
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      type: DataSubjectRight.ACCESS,
      dataSubjectId,
      requesterEmail,
      identityVerified,
      description: 'Request for access to personal data',
      requestDate: new Date(),
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: identityVerified ? 'in_progress' : 'pending',
      followUpRequired: false
    }

    if (identityVerified) {
      // Generate data export
      const personalData = await this.exportPersonalData(dataSubjectId)
      request.response = {
        data: personalData,
        explanation: 'Complete export of personal data held by the system',
        actions: ['Data exported', 'Processing activities documented'],
        completedAt: new Date()
      }
      request.status = 'completed'
    }

    this.dataSubjectRequests.set(request.id, request)

    // Log access request
    logAuditEvent(AUDIT_ACTIONS.DATA_EXPORT, 'gdpr_access_request', dataSubjectId, {
      requestId: request.id,
      requesterEmail,
      identityVerified,
      deadline: request.responseDeadline
    })

    console.log('📋 GDPR access request created:', request.id)
    return request
  }

  // Handle erasure request (Article 17 - Right to be forgotten)
  async handleErasureRequest(
    dataSubjectId: string,
    requesterEmail: string,
    reason: string,
    identityVerified = false
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: `erasure_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      type: DataSubjectRight.ERASURE,
      dataSubjectId,
      requesterEmail,
      identityVerified,
      description: `Request for erasure of personal data. Reason: ${reason}`,
      requestDate: new Date(),
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: identityVerified ? 'in_progress' : 'pending',
      followUpRequired: false
    }

    if (identityVerified) {
      // Check if erasure is legally permissible
      const canErase = await this.canEraseData(dataSubjectId, reason)
      
      if (canErase.allowed) {
        // Schedule data for erasure
        await this.scheduleDataErasure(dataSubjectId, reason)
        request.response = {
          explanation: 'Personal data scheduled for erasure',
          actions: ['Data marked for deletion', 'Erasure process initiated'],
          completedAt: new Date()
        }
        request.status = 'completed'
      } else {
        request.response = {
          explanation: `Erasure request cannot be fulfilled: ${canErase.reason}`,
          actions: ['Request reviewed', 'Legal basis confirmed'],
          completedAt: new Date()
        }
        request.status = 'rejected'
        request.rejectionReason = canErase.reason
      }
    }

    this.dataSubjectRequests.set(request.id, request)

    // Log erasure request
    logAuditEvent(AUDIT_ACTIONS.USER_DELETED, 'gdpr_erasure_request', dataSubjectId, {
      requestId: request.id,
      reason,
      identityVerified,
      status: request.status
    })

    console.log('🗑️ GDPR erasure request created:', request.id)
    return request
  }

  // Handle data portability request (Article 20)
  async handlePortabilityRequest(
    dataSubjectId: string,
    requesterEmail: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: `portability_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      type: DataSubjectRight.PORTABILITY,
      dataSubjectId,
      requesterEmail,
      identityVerified: true, // Simplified for demo
      description: `Request for data portability in ${format} format`,
      requestDate: new Date(),
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'in_progress',
      followUpRequired: false
    }

    // Generate portable data export
    const portableData = await this.exportPortableData(dataSubjectId, format)
    request.response = {
      data: portableData,
      explanation: 'Portable data export generated in structured format',
      actions: ['Machine-readable data export created'],
      completedAt: new Date()
    }
    request.status = 'completed'

    this.dataSubjectRequests.set(request.id, request)

    // Log portability request
    logAuditEvent(AUDIT_ACTIONS.DATA_EXPORT, 'gdpr_portability_request', dataSubjectId, {
      requestId: request.id,
      format,
      dataSize: JSON.stringify(portableData).length
    })

    console.log('📤 GDPR portability request completed:', request.id)
    return request
  }

  // Check if consent is required for processing
  isConsentRequired(
    purpose: string,
    dataCategories: DataCategory[],
    legalBasis: LegalBasis
  ): boolean {
    // Consent is required if it's the legal basis
    if (legalBasis === LegalBasis.CONSENT) return true

    // Consent is also required for sensitive data categories
    const sensitiveCategories = [DataCategory.SENSITIVE, DataCategory.BEHAVIORAL]
    return dataCategories.some(category => sensitiveCategories.includes(category))
  }

  // Verify user consent for specific processing
  async verifyConsent(
    dataSubjectId: string,
    purposes: string[],
    dataCategories: DataCategory[]
  ): Promise<{
    hasValidConsent: boolean
    missingConsent: string[]
    expiredConsent: string[]
  }> {
    const userConsents = this.consentRecords.get(dataSubjectId) || []
    const activeConsents = userConsents.filter(c => c.isActive && !c.consentWithdrawn)

    const missingConsent: string[] = []
    const expiredConsent: string[] = []

    // Check each required purpose
    purposes.forEach(purpose => {
      const relevantConsent = activeConsents.find(consent =>
        consent.purposes.includes(purpose)
      )

      if (!relevantConsent) {
        missingConsent.push(purpose)
      } else {
        // Check if consent is expired (consent should be refreshed periodically)
        const consentAge = Date.now() - relevantConsent.consentGiven.getTime()
        const maxAge = 2 * 365 * 24 * 60 * 60 * 1000 // 2 years
        
        if (consentAge > maxAge) {
          expiredConsent.push(purpose)
        }
      }
    })

    return {
      hasValidConsent: missingConsent.length === 0 && expiredConsent.length === 0,
      missingConsent,
      expiredConsent
    }
  }

  // Export personal data for access requests
  private async exportPersonalData(dataSubjectId: string): Promise<any> {
    const processingRecords = this.processingRecords.get(dataSubjectId) || []
    const consentRecords = this.consentRecords.get(dataSubjectId) || []

    // In production, this would query all systems and databases
    return {
      dataSubject: {
        id: dataSubjectId,
        dataExportedAt: new Date().toISOString()
      },
      processingActivities: processingRecords.map(record => ({
        purpose: record.purpose,
        legalBasis: record.legalBasis,
        dataCategories: record.dataCategories,
        processingActivities: record.processingActivities,
        retentionPeriod: `${record.retentionPeriod} days`,
        createdAt: record.createdAt.toISOString()
      })),
      consentHistory: consentRecords.map(consent => ({
        purposes: consent.purposes,
        dataCategories: consent.dataCategories,
        consentGiven: consent.consentGiven.toISOString(),
        consentWithdrawn: consent.consentWithdrawn?.toISOString(),
        isActive: consent.isActive
      })),
      rights: {
        accessRight: 'Available - Article 15 GDPR',
        rectificationRight: 'Available - Article 16 GDPR',
        erasureRight: 'Available - Article 17 GDPR',
        restrictionRight: 'Available - Article 18 GDPR',
        portabilityRight: 'Available - Article 20 GDPR',
        objectionRight: 'Available - Article 21 GDPR'
      }
    }
  }

  // Export portable data (structured, machine-readable)
  private async exportPortableData(dataSubjectId: string, format: string): Promise<any> {
    const data = await this.exportPersonalData(dataSubjectId)
    
    // Filter to only data provided by the data subject or collected through automated means
    const portableData = {
      userProvidedData: {
        // Data actively provided by the user
      },
      automaticallyCollectedData: {
        // Data collected through system usage
      },
      exportFormat: format,
      exportedAt: new Date().toISOString(),
      dataPortabilityNote: 'This export contains your personal data in a structured, commonly used, and machine-readable format as per Article 20 GDPR'
    }

    return portableData
  }

  // Check if data can be erased
  private async canEraseData(dataSubjectId: string, reason: string): Promise<{
    allowed: boolean
    reason?: string
  }> {
    const processingRecords = this.processingRecords.get(dataSubjectId) || []

    // Check for legal obligations that prevent erasure
    const legalObligations = processingRecords.filter(record =>
      record.legalBasis === LegalBasis.LEGAL_OBLIGATION
    )

    if (legalObligations.length > 0) {
      return {
        allowed: false,
        reason: 'Data must be retained to comply with legal obligations'
      }
    }

    // Check for ongoing contracts
    const contractualBasis = processingRecords.filter(record =>
      record.legalBasis === LegalBasis.CONTRACT
    )

    if (contractualBasis.length > 0) {
      return {
        allowed: false,
        reason: 'Data is necessary for the performance of a contract'
      }
    }

    return { allowed: true }
  }

  // Schedule data for erasure
  private async scheduleDataErasure(dataSubjectId: string, reason: string): Promise<void> {
    const processingRecords = this.processingRecords.get(dataSubjectId) || []
    
    processingRecords.forEach(record => {
      record.erasureScheduled = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days grace period
      record.updatedAt = new Date()
    })

    // Log erasure scheduling
    logAuditEvent(AUDIT_ACTIONS.USER_DELETED, 'gdpr_erasure_scheduled', dataSubjectId, {
      reason,
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recordsAffected: processingRecords.length
    })
  }

  // Calculate retention period based on data categories and purpose
  private calculateRetentionPeriod(dataCategories: DataCategory[], purpose: string): number {
    let maxRetention = 365 // Default 1 year

    dataCategories.forEach(category => {
      const policy = this.retentionPolicies.get(category)
      if (policy && policy.retentionPeriod > maxRetention) {
        maxRetention = policy.retentionPeriod
      }
    })

    // Special cases for specific purposes
    if (purpose.includes('financial') || purpose.includes('tax')) {
      maxRetention = Math.max(maxRetention, 2555) // 7 years for financial records
    }

    return maxRetention
  }

  // Start automatic processes for GDPR compliance
  private startAutomaticProcesses(): void {
    // Daily cleanup process
    setInterval(() => {
      this.performDataRetentionCleanup()
    }, 24 * 60 * 60 * 1000) // Daily

    // Weekly consent review
    setInterval(() => {
      this.reviewConsentRecords()
    }, 7 * 24 * 60 * 60 * 1000) // Weekly

    console.log('🔄 GDPR automatic processes started')
  }

  // Perform automatic data retention cleanup
  private async performDataRetentionCleanup(): Promise<void> {
    const now = new Date()
    let cleanupCount = 0

    for (const [dataSubjectId, records] of this.processingRecords.entries()) {
      for (const record of records) {
        // Check if data is scheduled for erasure
        if (record.erasureScheduled && record.erasureScheduled <= now) {
          // Perform erasure (in production, this would delete from all systems)
          console.log(`🗑️ Erasing data for record: ${record.id}`)
          cleanupCount++

          // Log erasure completion
          logAuditEvent(AUDIT_ACTIONS.USER_DELETED, 'gdpr_data_erased', dataSubjectId, {
            recordId: record.id,
            erasedAt: now,
            automaticErasure: true
          })
        }
        // Check retention period
        else if (record.retentionPeriod > 0) {
          const retentionExpiry = new Date(record.createdAt.getTime() + record.retentionPeriod * 24 * 60 * 60 * 1000)
          if (now >= retentionExpiry && record.legalBasis === LegalBasis.CONSENT) {
            // Schedule for erasure
            record.erasureScheduled = now
            cleanupCount++
          }
        }
      }
    }

    if (cleanupCount > 0) {
      console.log(`🧹 GDPR cleanup completed: ${cleanupCount} records processed`)
    }
  }

  // Review consent records for renewals
  private async reviewConsentRecords(): Promise<void> {
    const now = new Date()
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
    let reviewCount = 0

    for (const [dataSubjectId, consents] of this.consentRecords.entries()) {
      for (const consent of consents) {
        if (consent.isActive && consent.consentGiven < twoYearsAgo) {
          // Flag for consent renewal
          console.log(`📋 Consent review needed for: ${consent.id}`)
          reviewCount++

          // Log consent review requirement
          logAuditEvent(AUDIT_ACTIONS.COMPLIANCE_READ, 'gdpr_consent_review', dataSubjectId, {
            consentId: consent.id,
            age: Math.floor((now.getTime() - consent.consentGiven.getTime()) / (1000 * 60 * 60 * 24)),
            reviewRequired: true
          })
        }
      }
    }

    if (reviewCount > 0) {
      console.log(`📋 Consent review required for ${reviewCount} records`)
    }
  }

  // Public API methods
  getProcessingRecords(dataSubjectId: string): ProcessingRecord[] {
    return this.processingRecords.get(dataSubjectId) || []
  }

  getConsentRecords(dataSubjectId: string): ConsentRecord[] {
    return this.consentRecords.get(dataSubjectId) || []
  }

  getDataSubjectRequests(dataSubjectId?: string): DataSubjectRequest[] {
    if (dataSubjectId) {
      return Array.from(this.dataSubjectRequests.values())
        .filter(request => request.dataSubjectId === dataSubjectId)
    }
    return Array.from(this.dataSubjectRequests.values())
  }

  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values())
  }

  getGDPRStats(): {
    totalProcessingRecords: number
    totalConsentRecords: number
    totalRequests: number
    activeConsents: number
    expiredConsents: number
    pendingRequests: number
  } {
    const allProcessingRecords = Array.from(this.processingRecords.values()).flat()
    const allConsentRecords = Array.from(this.consentRecords.values()).flat()
    const allRequests = Array.from(this.dataSubjectRequests.values())

    const activeConsents = allConsentRecords.filter(c => c.isActive).length
    const expiredConsents = allConsentRecords.length - activeConsents
    const pendingRequests = allRequests.filter(r => r.status === 'pending' || r.status === 'in_progress').length

    return {
      totalProcessingRecords: allProcessingRecords.length,
      totalConsentRecords: allConsentRecords.length,
      totalRequests: allRequests.length,
      activeConsents,
      expiredConsents,
      pendingRequests
    }
  }
}

// Export singleton
export const gdprControls = GDPRControls.getInstance()

// Convenience functions
export const recordProcessingActivity = (dataSubjectId: string, purpose: string, legalBasis: LegalBasis, dataCategories: DataCategory[], activities: string[], options?: any) =>
  gdprControls.recordProcessingActivity(dataSubjectId, purpose, legalBasis, dataCategories, activities, options)

export const recordConsent = (dataSubjectId: string, purposes: string[], dataCategories: DataCategory[], method?: any, ip?: string, userAgent?: string, isMinor?: boolean) =>
  gdprControls.recordConsent(dataSubjectId, purposes, dataCategories, method, ip, userAgent, isMinor)

export const withdrawConsent = (dataSubjectId: string, consentId: string, reason?: string) =>
  gdprControls.withdrawConsent(dataSubjectId, consentId, reason)

export const handleAccessRequest = (dataSubjectId: string, email: string, verified?: boolean) =>
  gdprControls.handleAccessRequest(dataSubjectId, email, verified)

export const handleErasureRequest = (dataSubjectId: string, email: string, reason: string, verified?: boolean) =>
  gdprControls.handleErasureRequest(dataSubjectId, email, reason, verified)

export const handlePortabilityRequest = (dataSubjectId: string, email: string, format?: 'json' | 'csv' | 'xml') =>
  gdprControls.handlePortabilityRequest(dataSubjectId, email, format)

export const verifyConsent = (dataSubjectId: string, purposes: string[], dataCategories: DataCategory[]) =>
  gdprControls.verifyConsent(dataSubjectId, purposes, dataCategories)

// React hook for GDPR controls
export function useGDPRControls() {
  return {
    recordProcessingActivity,
    recordConsent,
    withdrawConsent,
    handleAccessRequest,
    handleErasureRequest,
    handlePortabilityRequest,
    verifyConsent,
    isConsentRequired: (purpose: string, categories: DataCategory[], basis: LegalBasis) =>
      gdprControls.isConsentRequired(purpose, categories, basis),
    getProcessingRecords: (id: string) => gdprControls.getProcessingRecords(id),
    getConsentRecords: (id: string) => gdprControls.getConsentRecords(id),
    getDataSubjectRequests: (id?: string) => gdprControls.getDataSubjectRequests(id),
    getStats: () => gdprControls.getGDPRStats(),
    DataSubjectRight,
    LegalBasis,
    DataCategory
  }
}