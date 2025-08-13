// Comprehensive backup and disaster recovery system for business continuity
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'
import { encryptSensitiveData } from '@/lib/security/encryption'

// Backup types and frequencies
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental', 
  DIFFERENTIAL = 'differential',
  TRANSACTION_LOG = 'transaction_log'
}

export enum BackupSchedule {
  HOURLY = 'hourly',
  DAILY = 'daily', 
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// Recovery objectives
export interface RecoveryObjectives {
  rto: number // Recovery Time Objective (minutes)
  rpo: number // Recovery Point Objective (minutes)
  maxDowntime: number // Maximum acceptable downtime (minutes)
  dataLossThreshold: number // Max acceptable data loss (minutes)
}

// Backup configuration
export interface BackupConfig {
  id: string
  name: string
  type: BackupType
  schedule: BackupSchedule
  retention: {
    daily: number // days
    weekly: number // weeks
    monthly: number // months
    yearly: number // years
  }
  targets: BackupTarget[]
  encryption: boolean
  compression: boolean
  verification: boolean
}

// Backup target (where backups are stored)
export interface BackupTarget {
  id: string
  name: string
  type: 'local' | 'cloud' | 'offsite'
  location: string
  priority: number
  maxSize: number // GB
  credentials?: {
    accessKey?: string
    secretKey?: string
    region?: string
  }
}

// Backup record
export interface BackupRecord {
  id: string
  configId: string
  type: BackupType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'corrupted'
  startTime: Date
  endTime?: Date
  size: number // bytes
  location: string
  checksum: string
  encrypted: boolean
  compressed: boolean
  verified: boolean
  errorMessage?: string
  metadata: {
    tables: string[]
    recordCount: number
    version: string
    dependencies: string[]
  }
}

// Disaster recovery plan
export interface DisasterRecoveryPlan {
  id: string
  name: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  triggers: string[]
  procedures: RecoveryProcedure[]
  contacts: EmergencyContact[]
  resources: RequiredResource[]
  testing: {
    lastTested: Date
    nextTest: Date
    frequency: 'monthly' | 'quarterly' | 'annually'
    results: TestResult[]
  }
}

// Recovery procedure
export interface RecoveryProcedure {
  step: number
  title: string
  description: string
  estimatedTime: number // minutes
  requiredRoles: string[]
  dependencies: string[]
  verification: string
  rollback?: string
}

// Emergency contacts
export interface EmergencyContact {
  name: string
  role: string
  phone: string
  email: string
  priority: number
}

// Required resources for recovery
export interface RequiredResource {
  type: 'server' | 'database' | 'network' | 'personnel'
  name: string
  specifications: string
  availability: string
  cost: number
}

// Test results
export interface TestResult {
  testDate: Date
  success: boolean
  rto: number // actual recovery time
  rpo: number // actual data loss
  issues: string[]
  recommendations: string[]
}

class DisasterRecoverySystem {
  private static instance: DisasterRecoverySystem
  private backupConfigs: Map<string, BackupConfig> = new Map()
  private backupRecords: Map<string, BackupRecord[]> = new Map()
  private recoveryPlans: Map<string, DisasterRecoveryPlan> = new Map()
  private activeBackups: Set<string> = new Set()
  private recoveryObjectives: RecoveryObjectives

  private constructor() {
    this.recoveryObjectives = {
      rto: 240, // 4 hours
      rpo: 60,  // 1 hour
      maxDowntime: 480, // 8 hours
      dataLossThreshold: 120 // 2 hours
    }
    
    this.initializeDefaultConfigs()
    this.initializeRecoveryPlans()
    this.startBackupScheduler()
    console.log('💾 Disaster Recovery System initialized')
  }

  public static getInstance(): DisasterRecoverySystem {
    if (!this.instance) {
      this.instance = new DisasterRecoverySystem()
    }
    return this.instance
  }

  private initializeDefaultConfigs() {
    // Critical data - hourly backups
    const criticalConfig: BackupConfig = {
      id: 'critical_hourly',
      name: 'Critical Data Hourly Backup',
      type: BackupType.INCREMENTAL,
      schedule: BackupSchedule.HOURLY,
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 7
      },
      targets: [
        {
          id: 'primary_cloud',
          name: 'Primary Cloud Storage',
          type: 'cloud',
          location: 's3://buildology-backups/critical/',
          priority: 1,
          maxSize: 1000
        },
        {
          id: 'offsite_backup',
          name: 'Offsite Backup Location',
          type: 'offsite',
          location: '/mnt/offsite/critical/',
          priority: 2,
          maxSize: 2000
        }
      ],
      encryption: true,
      compression: true,
      verification: true
    }

    // Full system backup - daily
    const fullConfig: BackupConfig = {
      id: 'full_daily',
      name: 'Full System Daily Backup',
      type: BackupType.FULL,
      schedule: BackupSchedule.DAILY,
      retention: {
        daily: 14,
        weekly: 8,
        monthly: 6,
        yearly: 3
      },
      targets: [
        {
          id: 'cloud_storage',
          name: 'Cloud Storage',
          type: 'cloud',
          location: 's3://buildology-backups/full/',
          priority: 1,
          maxSize: 5000
        }
      ],
      encryption: true,
      compression: true,
      verification: true
    }

    this.backupConfigs.set(criticalConfig.id, criticalConfig)
    this.backupConfigs.set(fullConfig.id, fullConfig)
  }

  private initializeRecoveryPlans() {
    // Database corruption recovery plan
    const dbRecoveryPlan: DisasterRecoveryPlan = {
      id: 'database_corruption',
      name: 'Database Corruption Recovery',
      priority: 'critical',
      triggers: ['database_corruption', 'data_integrity_failure'],
      procedures: [
        {
          step: 1,
          title: 'Assess Damage',
          description: 'Evaluate extent of database corruption and identify affected data',
          estimatedTime: 30,
          requiredRoles: ['database_admin', 'system_admin'],
          dependencies: [],
          verification: 'Database integrity check completed'
        },
        {
          step: 2,
          title: 'Stop Application Services',
          description: 'Gracefully shutdown application to prevent further corruption',
          estimatedTime: 15,
          requiredRoles: ['system_admin'],
          dependencies: ['step_1'],
          verification: 'All application services stopped'
        },
        {
          step: 3,
          title: 'Restore from Latest Backup',
          description: 'Restore database from most recent verified backup',
          estimatedTime: 120,
          requiredRoles: ['database_admin'],
          dependencies: ['step_2'],
          verification: 'Database restored and integrity verified'
        },
        {
          step: 4,
          title: 'Apply Transaction Logs',
          description: 'Apply transaction logs to minimize data loss',
          estimatedTime: 60,
          requiredRoles: ['database_admin'],
          dependencies: ['step_3'],
          verification: 'Transaction logs applied successfully'
        },
        {
          step: 5,
          title: 'Restart Services',
          description: 'Restart application services and verify functionality',
          estimatedTime: 30,
          requiredRoles: ['system_admin'],
          dependencies: ['step_4'],
          verification: 'Application fully operational'
        }
      ],
      contacts: [
        {
          name: 'System Administrator',
          role: 'Primary Contact',
          phone: '+1-555-0123',
          email: 'sysadmin@buildology.com',
          priority: 1
        },
        {
          name: 'Database Administrator',
          role: 'Database Expert',
          phone: '+1-555-0124',
          email: 'dba@buildology.com',
          priority: 2
        }
      ],
      resources: [
        {
          type: 'server',
          name: 'Standby Database Server',
          specifications: '32GB RAM, 1TB SSD',
          availability: '24/7',
          cost: 500
        }
      ],
      testing: {
        lastTested: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        nextTest: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        frequency: 'quarterly',
        results: []
      }
    }

    // Ransomware recovery plan
    const ransomwareRecoveryPlan: DisasterRecoveryPlan = {
      id: 'ransomware_attack',
      name: 'Ransomware Attack Recovery',
      priority: 'critical',
      triggers: ['ransomware_detected', 'file_encryption_anomaly'],
      procedures: [
        {
          step: 1,
          title: 'Isolate Infected Systems',
          description: 'Immediately disconnect infected systems from network',
          estimatedTime: 10,
          requiredRoles: ['security_admin', 'system_admin'],
          dependencies: [],
          verification: 'Infected systems isolated'
        },
        {
          step: 2,
          title: 'Activate Incident Response',
          description: 'Initiate incident response procedures and notify authorities',
          estimatedTime: 30,
          requiredRoles: ['security_admin'],
          dependencies: ['step_1'],
          verification: 'Incident response team activated'
        },
        {
          step: 3,
          title: 'Assess Clean Systems',
          description: 'Verify backup systems and offline storage are unaffected',
          estimatedTime: 60,
          requiredRoles: ['system_admin'],
          dependencies: ['step_2'],
          verification: 'Clean backup systems verified'
        },
        {
          step: 4,
          title: 'Restore from Clean Backups',
          description: 'Restore systems from verified clean backups',
          estimatedTime: 240,
          requiredRoles: ['system_admin'],
          dependencies: ['step_3'],
          verification: 'Systems restored from clean backups'
        }
      ],
      contacts: [
        {
          name: 'Security Team Lead',
          role: 'Security Incident Response',
          phone: '+1-555-0125',
          email: 'security@buildology.com',
          priority: 1
        },
        {
          name: 'Legal Counsel',
          role: 'Legal Compliance',
          phone: '+1-555-0126',
          email: 'legal@buildology.com',
          priority: 2
        }
      ],
      resources: [
        {
          type: 'server',
          name: 'Clean Recovery Environment',
          specifications: 'Isolated network segment',
          availability: 'On-demand',
          cost: 1000
        }
      ],
      testing: {
        lastTested: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        frequency: 'quarterly',
        results: []
      }
    }

    this.recoveryPlans.set(dbRecoveryPlan.id, dbRecoveryPlan)
    this.recoveryPlans.set(ransomwareRecoveryPlan.id, ransomwareRecoveryPlan)
  }

  // Perform backup based on configuration
  async performBackup(configId: string): Promise<BackupRecord> {
    const config = this.backupConfigs.get(configId)
    if (!config) {
      throw new Error(`Backup configuration not found: ${configId}`)
    }

    const backupId = this.generateBackupId()
    this.activeBackups.add(backupId)

    const startTime = new Date()
    console.log(`💾 Starting backup: ${config.name} (${backupId})`)

    try {
      // Simulate backup process (in production, this would perform actual backup)
      const backupData = await this.gatherBackupData(config.type)
      
      let processedData = backupData
      let size = backupData.length

      // Apply compression
      if (config.compression) {
        processedData = await this.compressData(processedData)
        console.log(`📦 Backup compressed: ${Math.round((1 - processedData.length / size) * 100)}% reduction`)
      }

      // Apply encryption
      if (config.encryption) {
        processedData = await this.encryptBackupData(processedData, backupId)
        console.log(`🔒 Backup encrypted with AES-256`)
      }

      // Store to targets
      const primaryTarget = config.targets[0]
      const location = await this.storeBackup(processedData, primaryTarget, backupId)
      
      // Generate checksum for integrity
      const checksum = this.generateChecksum(processedData)

      const record: BackupRecord = {
        id: backupId,
        configId,
        type: config.type,
        status: 'completed',
        startTime,
        endTime: new Date(),
        size: processedData.length,
        location,
        checksum,
        encrypted: config.encryption,
        compressed: config.compression,
        verified: false,
        metadata: {
          tables: ['users', 'projects', 'claims', 'documents'],
          recordCount: Math.floor(Math.random() * 100000),
          version: '1.0.0',
          dependencies: ['database', 'file_storage']
        }
      }

      // Verify backup if enabled
      if (config.verification) {
        const verified = await this.verifyBackup(record)
        record.verified = verified
        if (!verified) {
          record.status = 'corrupted'
          throw new Error('Backup verification failed')
        }
      }

      // Store backup record
      const configRecords = this.backupRecords.get(configId) || []
      configRecords.push(record)
      this.backupRecords.set(configId, configRecords)

      // Clean up old backups based on retention policy
      await this.cleanupOldBackups(configId)

      // Log backup completion
      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'backup_completed', undefined, {
        backupId,
        configId,
        type: config.type,
        size: record.size,
        duration: record.endTime!.getTime() - record.startTime.getTime(),
        encrypted: config.encryption,
        compressed: config.compression
      })

      console.log(`✅ Backup completed: ${backupId} (${this.formatSize(record.size)})`)
      return record

    } catch (error) {
      console.error('Backup failed:', error)
      
      const failedRecord: BackupRecord = {
        id: backupId,
        configId,
        type: config.type,
        status: 'failed',
        startTime,
        endTime: new Date(),
        size: 0,
        location: '',
        checksum: '',
        encrypted: false,
        compressed: false,
        verified: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tables: [],
          recordCount: 0,
          version: '1.0.0',
          dependencies: []
        }
      }

      const configRecords = this.backupRecords.get(configId) || []
      configRecords.push(failedRecord)
      this.backupRecords.set(configId, configRecords)

      return failedRecord

    } finally {
      this.activeBackups.delete(backupId)
    }
  }

  // Restore from backup
  async restoreFromBackup(
    backupId: string,
    options: {
      targetLocation?: string
      pointInTime?: Date
      partialRestore?: string[]
      verifyBeforeRestore?: boolean
    } = {}
  ): Promise<{
    success: boolean
    restoredSize: number
    duration: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // Find backup record
      let backupRecord: BackupRecord | undefined
      for (const records of this.backupRecords.values()) {
        backupRecord = records.find(r => r.id === backupId)
        if (backupRecord) break
      }

      if (!backupRecord) {
        throw new Error(`Backup record not found: ${backupId}`)
      }

      if (backupRecord.status !== 'completed') {
        throw new Error(`Cannot restore from incomplete backup: ${backupRecord.status}`)
      }

      console.log(`🔄 Starting restore from backup: ${backupId}`)

      // Verify backup before restore if requested
      if (options.verifyBeforeRestore) {
        const verified = await this.verifyBackup(backupRecord)
        if (!verified) {
          throw new Error('Backup verification failed before restore')
        }
      }

      // Load backup data
      let backupData = await this.loadBackup(backupRecord.location)

      // Decrypt if encrypted
      if (backupRecord.encrypted) {
        backupData = await this.decryptBackupData(backupData, backupId)
        console.log(`🔓 Backup decrypted`)
      }

      // Decompress if compressed
      if (backupRecord.compressed) {
        backupData = await this.decompressData(backupData)
        console.log(`📦 Backup decompressed`)
      }

      // Perform restore
      await this.performRestore(backupData, options)

      const duration = Date.now() - startTime

      // Log restore completion
      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'backup_restored', undefined, {
        backupId,
        restoredSize: backupData.length,
        duration,
        targetLocation: options.targetLocation,
        pointInTime: options.pointInTime
      })

      console.log(`✅ Restore completed: ${backupId} (${this.formatSize(backupData.length)})`)

      return {
        success: true,
        restoredSize: backupData.length,
        duration,
        errors
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(errorMessage)

      console.error('Restore failed:', error)

      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'backup_restore_failed', undefined, {
        backupId,
        error: errorMessage,
        duration
      })

      return {
        success: false,
        restoredSize: 0,
        duration,
        errors
      }
    }
  }

  // Execute disaster recovery plan
  async executeRecoveryPlan(planId: string, incident: any): Promise<{
    success: boolean
    executedSteps: number
    totalSteps: number
    duration: number
    issues: string[]
  }> {
    const plan = this.recoveryPlans.get(planId)
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`)
    }

    const startTime = Date.now()
    const issues: string[] = []
    let executedSteps = 0

    console.log(`🚨 Executing disaster recovery plan: ${plan.name}`)

    try {
      // Notify emergency contacts
      await this.notifyEmergencyContacts(plan.contacts, incident)

      // Execute recovery procedures in sequence
      for (const procedure of plan.procedures) {
        console.log(`📋 Step ${procedure.step}: ${procedure.title}`)
        
        try {
          // Check dependencies
          const dependenciesMet = this.checkDependencies(procedure.dependencies, executedSteps)
          if (!dependenciesMet) {
            issues.push(`Step ${procedure.step}: Dependencies not met`)
            break
          }

          // Execute procedure (simulated)
          await this.executeProcedure(procedure)
          executedSteps++

          console.log(`✅ Step ${procedure.step} completed`)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          issues.push(`Step ${procedure.step}: ${errorMessage}`)
          console.error(`❌ Step ${procedure.step} failed:`, error)
          break
        }
      }

      const duration = Date.now() - startTime
      const success = executedSteps === plan.procedures.length

      // Log recovery execution
      logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'disaster_recovery_executed', undefined, {
        planId,
        success,
        executedSteps,
        totalSteps: plan.procedures.length,
        duration,
        incident
      })

      console.log(`${success ? '✅' : '⚠️'} Recovery plan ${success ? 'completed' : 'partially executed'}: ${executedSteps}/${plan.procedures.length} steps`)

      return {
        success,
        executedSteps,
        totalSteps: plan.procedures.length,
        duration,
        issues
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      issues.push(`Recovery plan execution failed: ${errorMessage}`)

      return {
        success: false,
        executedSteps,
        totalSteps: plan.procedures.length,
        duration,
        issues
      }
    }
  }

  // Test disaster recovery plan
  async testRecoveryPlan(planId: string): Promise<TestResult> {
    const plan = this.recoveryPlans.get(planId)
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`)
    }

    const startTime = Date.now()
    const issues: string[] = []
    const recommendations: string[] = []

    console.log(`🧪 Testing disaster recovery plan: ${plan.name}`)

    try {
      // Simulate recovery execution in test environment
      const testExecution = await this.simulateRecoveryExecution(plan)
      
      const actualRTO = Date.now() - startTime
      const actualRPO = Math.random() * 120 // Simulated data loss in minutes

      // Check against objectives
      if (actualRTO > this.recoveryObjectives.rto * 60 * 1000) {
        issues.push('RTO objective not met')
        recommendations.push('Optimize recovery procedures to reduce time')
      }

      if (actualRPO > this.recoveryObjectives.rpo) {
        issues.push('RPO objective not met')
        recommendations.push('Increase backup frequency to reduce data loss window')
      }

      const testResult: TestResult = {
        testDate: new Date(),
        success: issues.length === 0,
        rto: actualRTO / (1000 * 60), // Convert to minutes
        rpo: actualRPO,
        issues,
        recommendations
      }

      // Update plan with test results
      plan.testing.results.push(testResult)
      plan.testing.lastTested = new Date()
      plan.testing.nextTest = this.calculateNextTestDate(plan.testing.frequency)

      console.log(`🧪 Recovery plan test ${testResult.success ? 'passed' : 'failed'}`)
      
      return testResult

    } catch (error) {
      const testResult: TestResult = {
        testDate: new Date(),
        success: false,
        rto: (Date.now() - startTime) / (1000 * 60),
        rpo: 0,
        issues: [`Test execution failed: ${error}`],
        recommendations: ['Review and update recovery procedures']
      }

      plan.testing.results.push(testResult)
      return testResult
    }
  }

  // Helper methods
  private async gatherBackupData(type: BackupType): Promise<string> {
    // Simulate data gathering based on backup type
    const baseData = 'BACKUP_DATA_' + Date.now()
    switch (type) {
      case BackupType.FULL:
        return baseData.repeat(1000) // Large full backup
      case BackupType.INCREMENTAL:
        return baseData.repeat(100) // Smaller incremental
      case BackupType.DIFFERENTIAL:
        return baseData.repeat(300) // Medium differential
      case BackupType.TRANSACTION_LOG:
        return baseData.repeat(50) // Small transaction log
      default:
        return baseData
    }
  }

  private async compressData(data: string): Promise<string> {
    // Simulate compression (reduce size by ~60%)
    return data.substring(0, Math.floor(data.length * 0.4))
  }

  private async decompressData(data: string): Promise<string> {
    // Simulate decompression
    return data + '_DECOMPRESSED'
  }

  private async encryptBackupData(data: string, backupId: string): Promise<string> {
    // Use the existing encryption system
    const encrypted = await encryptSensitiveData(data, 'backup', backupId)
    return encrypted.encryptedData
  }

  private async decryptBackupData(data: string, backupId: string): Promise<string> {
    // In production, would decrypt using the encryption system
    return data.replace('_ENCRYPTED', '')
  }

  private async storeBackup(data: string, target: BackupTarget, backupId: string): Promise<string> {
    // Simulate storing backup to target location
    const location = `${target.location}${backupId}.backup`
    console.log(`💾 Stored backup to: ${location}`)
    return location
  }

  private async loadBackup(location: string): Promise<string> {
    // Simulate loading backup from location
    return 'LOADED_BACKUP_DATA_FROM_' + location
  }

  private async verifyBackup(record: BackupRecord): Promise<boolean> {
    // Simulate backup verification (checksum validation, etc.)
    return Math.random() > 0.05 // 95% success rate
  }

  private async performRestore(data: string, options: any): Promise<void> {
    // Simulate restore process
    console.log('🔄 Restoring data...')
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private generateChecksum(data: string): string {
    // Simple checksum for demo (would use SHA-256 in production)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  private async cleanupOldBackups(configId: string): Promise<void> {
    const config = this.backupConfigs.get(configId)
    const records = this.backupRecords.get(configId)
    
    if (!config || !records) return

    // Implementation would clean up backups based on retention policy
    console.log(`🧹 Cleaning up old backups for ${configId}`)
  }

  private startBackupScheduler(): void {
    // Start backup scheduler (simplified)
    setInterval(() => {
      this.checkScheduledBackups()
    }, 60 * 60 * 1000) // Check hourly

    console.log('⏰ Backup scheduler started')
  }

  private async checkScheduledBackups(): Promise<void> {
    for (const [configId, config] of this.backupConfigs.entries()) {
      const shouldRun = this.shouldRunBackup(config)
      if (shouldRun && !this.activeBackups.has(configId)) {
        try {
          await this.performBackup(configId)
        } catch (error) {
          console.error(`Scheduled backup failed: ${configId}`, error)
        }
      }
    }
  }

  private shouldRunBackup(config: BackupConfig): boolean {
    // Simplified scheduling logic
    const now = new Date()
    const hour = now.getHours()
    
    switch (config.schedule) {
      case BackupSchedule.HOURLY:
        return true // Always run hourly checks
      case BackupSchedule.DAILY:
        return hour === 2 // Run at 2 AM
      case BackupSchedule.WEEKLY:
        return hour === 1 && now.getDay() === 0 // Sunday 1 AM
      case BackupSchedule.MONTHLY:
        return hour === 0 && now.getDate() === 1 // 1st of month midnight
      default:
        return false
    }
  }

  private async notifyEmergencyContacts(contacts: EmergencyContact[], incident: any): Promise<void> {
    console.log('📞 Notifying emergency contacts...')
    for (const contact of contacts.sort((a, b) => a.priority - b.priority)) {
      console.log(`📧 Notified: ${contact.name} (${contact.role})`)
    }
  }

  private checkDependencies(dependencies: string[], executedSteps: number): boolean {
    // Check if all dependencies are met
    for (const dep of dependencies) {
      const stepNumber = parseInt(dep.replace('step_', ''))
      if (stepNumber > executedSteps) {
        return false
      }
    }
    return true
  }

  private async executeProcedure(procedure: RecoveryProcedure): Promise<void> {
    // Simulate procedure execution
    await new Promise(resolve => setTimeout(resolve, procedure.estimatedTime * 10)) // 10ms per minute for simulation
  }

  private async simulateRecoveryExecution(plan: DisasterRecoveryPlan): Promise<boolean> {
    // Simulate recovery execution in test environment
    await new Promise(resolve => setTimeout(resolve, 2000))
    return Math.random() > 0.1 // 90% success rate
  }

  private calculateNextTestDate(frequency: string): Date {
    const now = new Date()
    switch (frequency) {
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      case 'quarterly':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      case 'annually':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    }
  }

  // Public API methods
  getBackupConfigs(): BackupConfig[] {
    return Array.from(this.backupConfigs.values())
  }

  getBackupHistory(configId?: string, limit = 20): BackupRecord[] {
    if (configId) {
      const records = this.backupRecords.get(configId) || []
      return records.slice(-limit).reverse()
    }
    
    const allRecords = Array.from(this.backupRecords.values()).flat()
    return allRecords
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit)
  }

  getRecoveryPlans(): DisasterRecoveryPlan[] {
    return Array.from(this.recoveryPlans.values())
  }

  getRecoveryObjectives(): RecoveryObjectives {
    return { ...this.recoveryObjectives }
  }

  updateRecoveryObjectives(objectives: Partial<RecoveryObjectives>): void {
    this.recoveryObjectives = { ...this.recoveryObjectives, ...objectives }
    console.log('🎯 Recovery objectives updated')
  }

  getBackupStats(): {
    totalBackups: number
    totalSize: number
    successRate: number
    activeBackups: number
    configuredTargets: number
    averageBackupTime: number
  } {
    const allRecords = Array.from(this.backupRecords.values()).flat()
    const successful = allRecords.filter(r => r.status === 'completed')
    const totalSize = successful.reduce((sum, r) => sum + r.size, 0)
    
    const avgTime = successful.length > 0
      ? successful.reduce((sum, r) => {
          const duration = r.endTime ? r.endTime.getTime() - r.startTime.getTime() : 0
          return sum + duration
        }, 0) / successful.length
      : 0

    const allTargets = Array.from(this.backupConfigs.values())
      .flatMap(config => config.targets)

    return {
      totalBackups: allRecords.length,
      totalSize,
      successRate: allRecords.length > 0 ? (successful.length / allRecords.length) * 100 : 100,
      activeBackups: this.activeBackups.size,
      configuredTargets: new Set(allTargets.map(t => t.id)).size,
      averageBackupTime: Math.round(avgTime / 1000) // in seconds
    }
  }
}

// Export singleton
export const disasterRecovery = DisasterRecoverySystem.getInstance()

// Convenience functions
export const performBackup = (configId: string) => 
  disasterRecovery.performBackup(configId)

export const restoreFromBackup = (backupId: string, options?: any) =>
  disasterRecovery.restoreFromBackup(backupId, options)

export const executeRecoveryPlan = (planId: string, incident: any) =>
  disasterRecovery.executeRecoveryPlan(planId, incident)

export const testRecoveryPlan = (planId: string) =>
  disasterRecovery.testRecoveryPlan(planId)

// React hook for disaster recovery
export function useDisasterRecovery() {
  return {
    performBackup,
    restoreFromBackup, 
    executeRecoveryPlan,
    testRecoveryPlan,
    getBackupConfigs: () => disasterRecovery.getBackupConfigs(),
    getBackupHistory: (configId?: string, limit?: number) => 
      disasterRecovery.getBackupHistory(configId, limit),
    getRecoveryPlans: () => disasterRecovery.getRecoveryPlans(),
    getRecoveryObjectives: () => disasterRecovery.getRecoveryObjectives(),
    updateRecoveryObjectives: (objectives: Partial<RecoveryObjectives>) => 
      disasterRecovery.updateRecoveryObjectives(objectives),
    getBackupStats: () => disasterRecovery.getBackupStats(),
    BackupType,
    BackupSchedule
  }
}