// Security Incident Response System for immediate threat handling
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Incident severity levels (NIST SP 800-61)
export enum IncidentSeverity {
  LOW = 'low',         // Minimal impact, no data loss
  MEDIUM = 'medium',   // Moderate impact, limited data exposure
  HIGH = 'high',       // Significant impact, data breach potential
  CRITICAL = 'critical' // Severe impact, active data breach
}

// Incident categories (NIST Cybersecurity Framework)
export enum IncidentCategory {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DENIAL_OF_SERVICE = 'denial_of_service',
  INSIDER_THREAT = 'insider_threat',
  SYSTEM_COMPROMISE = 'system_compromise',
  CONFIGURATION_ERROR = 'configuration_error',
  THIRD_PARTY_BREACH = 'third_party_breach',
  REGULATORY_VIOLATION = 'regulatory_violation'
}

// Incident status workflow
export enum IncidentStatus {
  DETECTED = 'detected',     // Incident identified
  TRIAGED = 'triaged',       // Initial assessment complete
  INVESTIGATING = 'investigating', // Active investigation
  CONTAINING = 'containing',  // Threat containment in progress
  ERADICATING = 'eradicating', // Removing threat
  RECOVERING = 'recovering',  // System recovery
  CLOSED = 'closed',         // Incident resolved
  ESCALATED = 'escalated'    // Escalated to authorities
}

// Security incident record
export interface SecurityIncident {
  id: string
  title: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  description: string
  detectedAt: Date
  detectedBy: 'automated' | 'user' | 'external'
  assignedTo?: string
  affectedSystems: string[]
  affectedUsers: string[]
  dataCategories?: string[]
  potentialImpact: string
  timeline: IncidentTimelineEntry[]
  evidence: Evidence[]
  containmentActions: ContainmentAction[]
  rootCause?: string
  lessonsLearned?: string[]
  regulatoryNotification?: RegulatoryNotification
  estimatedLoss?: {
    financial: number
    reputational: number
    operational: number
  }
  closedAt?: Date
  escalatedAt?: Date
}

// Timeline entry for incident tracking
export interface IncidentTimelineEntry {
  timestamp: Date
  action: string
  description: string
  performedBy: string
  status: IncidentStatus
  evidence?: string[]
}

// Evidence collection
export interface Evidence {
  id: string
  type: 'log' | 'screenshot' | 'network_capture' | 'file' | 'witness_statement'
  name: string
  description: string
  collectedAt: Date
  collectedBy: string
  location: string
  hash?: string // for integrity verification
  chainOfCustody: ChainOfCustodyEntry[]
}

// Chain of custody for evidence
export interface ChainOfCustodyEntry {
  timestamp: Date
  action: 'collected' | 'transferred' | 'analyzed' | 'stored'
  person: string
  location: string
  notes: string
}

// Containment actions
export interface ContainmentAction {
  id: string
  action: string
  description: string
  implementedAt: Date
  implementedBy: string
  effectiveness: 'effective' | 'partial' | 'ineffective'
  impact: string
}

// Regulatory notification requirements
export interface RegulatoryNotification {
  required: boolean
  authorities: string[]
  notificationDeadline: Date
  notified?: boolean
  notifiedAt?: Date
  notificationMethod?: string
}

// Incident response playbook
export interface ResponsePlaybook {
  category: IncidentCategory
  severity: IncidentSeverity
  immediateActions: string[]
  containmentSteps: string[]
  investigationSteps: string[]
  communicationPlan: string[]
  recoverySteps: string[]
  escalationCriteria: string[]
}

class IncidentResponseSystem {
  private static instance: IncidentResponseSystem
  private incidents: Map<string, SecurityIncident> = new Map()
  private responsePlaybooks: Map<string, ResponsePlaybook> = new Map()
  private activeIncidents: Set<string> = new Set()
  private alertThresholds: Map<string, number> = new Map()

  private constructor() {
    this.initializePlaybooks()
    this.initializeAlertThresholds()
    this.startAutomaticMonitoring()
    console.log('🚨 Incident Response System initialized')
  }

  public static getInstance(): IncidentResponseSystem {
    if (!this.instance) {
      this.instance = new IncidentResponseSystem()
    }
    return this.instance
  }

  private initializePlaybooks() {
    // Data breach response playbook
    const dataBreachPlaybook: ResponsePlaybook = {
      category: IncidentCategory.DATA_BREACH,
      severity: IncidentSeverity.HIGH,
      immediateActions: [
        'Activate incident response team',
        'Preserve evidence and logs',
        'Assess scope of data exposure',
        'Implement emergency containment'
      ],
      containmentSteps: [
        'Isolate affected systems',
        'Change compromised credentials',
        'Block suspicious IP addresses',
        'Disable compromised accounts'
      ],
      investigationSteps: [
        'Analyze system logs',
        'Interview relevant personnel',
        'Conduct forensic analysis',
        'Document attack vectors'
      ],
      communicationPlan: [
        'Notify senior management within 1 hour',
        'Prepare customer communication',
        'Draft regulatory notifications',
        'Coordinate with legal team'
      ],
      recoverySteps: [
        'Restore from clean backups',
        'Implement additional security controls',
        'Monitor for recurring threats',
        'Validate system integrity'
      ],
      escalationCriteria: [
        'Personal data of >1000 individuals affected',
        'Financial data compromised',
        'System compromise persists >4 hours',
        'Media attention or public disclosure'
      ]
    }

    // Unauthorized access playbook
    const unauthorizedAccessPlaybook: ResponsePlaybook = {
      category: IncidentCategory.UNAUTHORIZED_ACCESS,
      severity: IncidentSeverity.MEDIUM,
      immediateActions: [
        'Identify compromised accounts',
        'Review access logs',
        'Check for privilege escalation',
        'Assess data accessed'
      ],
      containmentSteps: [
        'Disable compromised accounts',
        'Force password resets',
        'Review access permissions',
        'Monitor user activities'
      ],
      investigationSteps: [
        'Trace access patterns',
        'Identify attack vector',
        'Check for insider threat indicators',
        'Review authentication logs'
      ],
      communicationPlan: [
        'Notify affected users',
        'Internal security team briefing',
        'Update management dashboard'
      ],
      recoverySteps: [
        'Restore proper access controls',
        'Implement MFA if not present',
        'Review and update permissions',
        'User security awareness training'
      ],
      escalationCriteria: [
        'Administrative access compromised',
        'Multiple accounts affected',
        'Evidence of data exfiltration'
      ]
    }

    this.responsePlaybooks.set(`${IncidentCategory.DATA_BREACH}_${IncidentSeverity.HIGH}`, dataBreachPlaybook)
    this.responsePlaybooks.set(`${IncidentCategory.UNAUTHORIZED_ACCESS}_${IncidentSeverity.MEDIUM}`, unauthorizedAccessPlaybook)
  }

  private initializeAlertThresholds() {
    this.alertThresholds.set('failed_logins', 10) // 10 failed logins in 5 minutes
    this.alertThresholds.set('privilege_escalation', 1) // Any privilege escalation
    this.alertThresholds.set('data_export', 5) // 5 large data exports in 1 hour
    this.alertThresholds.set('system_changes', 3) // 3 system config changes in 15 minutes
  }

  // Create new security incident
  async createIncident(
    title: string,
    category: IncidentCategory,
    severity: IncidentSeverity,
    description: string,
    detectedBy: 'automated' | 'user' | 'external',
    affectedSystems: string[] = [],
    affectedUsers: string[] = []
  ): Promise<SecurityIncident> {
    const incidentId = this.generateIncidentId()
    
    const incident: SecurityIncident = {
      id: incidentId,
      title,
      category,
      severity,
      status: IncidentStatus.DETECTED,
      description,
      detectedAt: new Date(),
      detectedBy,
      affectedSystems,
      affectedUsers,
      potentialImpact: this.assessPotentialImpact(category, severity, affectedSystems, affectedUsers),
      timeline: [{
        timestamp: new Date(),
        action: 'Incident Created',
        description: 'Security incident detected and recorded',
        performedBy: 'system',
        status: IncidentStatus.DETECTED
      }],
      evidence: [],
      containmentActions: []
    }

    // Auto-assign based on severity
    if (severity === IncidentSeverity.CRITICAL || severity === IncidentSeverity.HIGH) {
      incident.assignedTo = 'security-team-lead'
    }

    // Check for regulatory notification requirements
    incident.regulatoryNotification = this.assessRegulatoryRequirements(category, severity, affectedUsers)

    // Store incident
    this.incidents.set(incidentId, incident)
    this.activeIncidents.add(incidentId)

    // Log incident creation
    logAuditEvent(AUDIT_ACTIONS.SECURITY_BREACH_DETECTED, 'incident', undefined, {
      incidentId,
      category,
      severity,
      detectedBy,
      affectedSystemsCount: affectedSystems.length,
      affectedUsersCount: affectedUsers.length
    })

    // Trigger immediate response based on severity
    await this.triggerImmediateResponse(incident)

    console.log(`🚨 Security incident created: ${incidentId} (${severity.toUpperCase()})`)
    return incident
  }

  // Update incident status and add timeline entry
  async updateIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    action: string,
    description: string,
    performedBy: string,
    evidence?: string[]
  ): Promise<void> {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    // Add timeline entry
    incident.timeline.push({
      timestamp: new Date(),
      action,
      description,
      performedBy,
      status: newStatus,
      evidence
    })

    // Update status
    const previousStatus = incident.status
    incident.status = newStatus

    // Handle status-specific actions
    switch (newStatus) {
      case IncidentStatus.CLOSED:
        incident.closedAt = new Date()
        this.activeIncidents.delete(incidentId)
        await this.generateIncidentReport(incidentId)
        break

      case IncidentStatus.ESCALATED:
        incident.escalatedAt = new Date()
        await this.escalateIncident(incident)
        break

      case IncidentStatus.CONTAINING:
        await this.activateContainmentPlan(incident)
        break
    }

    // Log status update
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'incident_status', performedBy, {
      incidentId,
      previousStatus,
      newStatus,
      action,
      evidence: evidence?.length || 0
    })

    console.log(`📋 Incident ${incidentId} status updated: ${previousStatus} → ${newStatus}`)
  }

  // Add evidence to incident
  async addEvidence(
    incidentId: string,
    type: Evidence['type'],
    name: string,
    description: string,
    location: string,
    collectedBy: string
  ): Promise<Evidence> {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    const evidence: Evidence = {
      id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      type,
      name,
      description,
      collectedAt: new Date(),
      collectedBy,
      location,
      chainOfCustody: [{
        timestamp: new Date(),
        action: 'collected',
        person: collectedBy,
        location,
        notes: 'Initial evidence collection'
      }]
    }

    // Generate hash for file integrity
    if (type === 'file') {
      evidence.hash = this.generateEvidenceHash(location)
    }

    incident.evidence.push(evidence)

    // Log evidence addition
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'evidence_collected', collectedBy, {
      incidentId,
      evidenceId: evidence.id,
      evidenceType: type,
      evidenceName: name
    })

    console.log(`📋 Evidence added to incident ${incidentId}: ${name}`)
    return evidence
  }

  // Implement containment action
  async implementContainment(
    incidentId: string,
    action: string,
    description: string,
    implementedBy: string
  ): Promise<ContainmentAction> {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    const containmentAction: ContainmentAction = {
      id: `containment_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      action,
      description,
      implementedAt: new Date(),
      implementedBy,
      effectiveness: 'effective', // Would be assessed later
      impact: 'Immediate threat containment'
    }

    incident.containmentActions.push(containmentAction)

    // Add to timeline
    incident.timeline.push({
      timestamp: new Date(),
      action: 'Containment Action',
      description: `${action}: ${description}`,
      performedBy: implementedBy,
      status: incident.status
    })

    // Log containment action
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'incident_containment', implementedBy, {
      incidentId,
      containmentId: containmentAction.id,
      action,
      description
    })

    console.log(`🛡️ Containment action implemented for ${incidentId}: ${action}`)
    return containmentAction
  }

  // Auto-detect security incidents from monitoring events
  async detectIncidentFromEvent(
    eventType: string,
    eventData: any,
    userId?: string
  ): Promise<SecurityIncident | null> {
    let incidentCreated = false
    let incident: SecurityIncident | null = null

    // Failed login threshold detection
    if (eventType === 'auth_failure' && eventData.attempts >= (this.alertThresholds.get('failed_logins') || 10)) {
      incident = await this.createIncident(
        'Multiple Failed Login Attempts',
        IncidentCategory.UNAUTHORIZED_ACCESS,
        IncidentSeverity.MEDIUM,
        `${eventData.attempts} failed login attempts detected from ${eventData.ipAddress}`,
        'automated',
        ['authentication_system'],
        userId ? [userId] : []
      )
      incidentCreated = true
    }

    // Data export anomaly detection
    if (eventType === 'data_export' && eventData.size > 1000000) { // >1MB
      incident = await this.createIncident(
        'Large Data Export Detected',
        IncidentCategory.DATA_BREACH,
        IncidentSeverity.HIGH,
        `Large data export detected: ${eventData.size} bytes by user ${userId}`,
        'automated',
        ['data_processing_system'],
        userId ? [userId] : []
      )
      incidentCreated = true
    }

    // Privilege escalation detection
    if (eventType === 'privilege_escalation') {
      incident = await this.createIncident(
        'Unauthorized Privilege Escalation',
        IncidentCategory.UNAUTHORIZED_ACCESS,
        IncidentSeverity.HIGH,
        `Privilege escalation detected for user ${userId}`,
        'automated',
        ['access_control_system'],
        userId ? [userId] : []
      )
      incidentCreated = true
    }

    // System configuration changes
    if (eventType === 'system_config_change' && eventData.critical) {
      incident = await this.createIncident(
        'Unauthorized System Configuration Change',
        IncidentCategory.SYSTEM_COMPROMISE,
        IncidentSeverity.MEDIUM,
        `Critical system configuration change: ${eventData.change}`,
        'automated',
        [eventData.system || 'unknown'],
        userId ? [userId] : []
      )
      incidentCreated = true
    }

    if (incidentCreated && incident) {
      console.log(`🔍 Auto-detected security incident: ${incident.id}`)
    }

    return incident
  }

  // Trigger immediate response actions
  private async triggerImmediateResponse(incident: SecurityIncident): Promise<void> {
    const playbookKey = `${incident.category}_${incident.severity}`
    const playbook = this.responsePlaybooks.get(playbookKey)

    if (playbook) {
      // Execute immediate actions
      for (const action of playbook.immediateActions) {
        await this.implementContainment(
          incident.id,
          'Immediate Response',
          action,
          'automated_response'
        )
      }

      // Check escalation criteria
      const shouldEscalate = this.shouldEscalate(incident, playbook.escalationCriteria)
      if (shouldEscalate) {
        await this.updateIncidentStatus(
          incident.id,
          IncidentStatus.ESCALATED,
          'Auto-Escalation',
          'Incident meets escalation criteria',
          'automated_response'
        )
      }
    }

    // Send notifications based on severity
    await this.sendIncidentNotifications(incident)
  }

  // Assess potential impact of incident
  private assessPotentialImpact(
    category: IncidentCategory,
    severity: IncidentSeverity,
    affectedSystems: string[],
    affectedUsers: string[]
  ): string {
    const impacts: string[] = []

    // Category-specific impacts
    switch (category) {
      case IncidentCategory.DATA_BREACH:
        impacts.push('Personal data exposure')
        if (affectedUsers.length > 100) impacts.push('Large-scale privacy violation')
        break

      case IncidentCategory.UNAUTHORIZED_ACCESS:
        impacts.push('Unauthorized data access')
        if (affectedSystems.includes('admin')) impacts.push('Administrative compromise')
        break

      case IncidentCategory.DENIAL_OF_SERVICE:
        impacts.push('Service availability disruption')
        break

      case IncidentCategory.MALWARE:
        impacts.push('System integrity compromise')
        impacts.push('Potential data corruption')
        break
    }

    // Severity-specific impacts
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        impacts.push('Business-critical systems affected')
        impacts.push('Potential regulatory violations')
        break

      case IncidentSeverity.HIGH:
        impacts.push('Significant operational impact')
        impacts.push('Potential financial loss')
        break
    }

    return impacts.join(', ')
  }

  // Assess regulatory notification requirements
  private assessRegulatoryRequirements(
    category: IncidentCategory,
    severity: IncidentSeverity,
    affectedUsers: string[]
  ): RegulatoryNotification {
    const authorities: string[] = []
    let required = false

    // GDPR notification requirements (Article 33/34)
    if (category === IncidentCategory.DATA_BREACH && affectedUsers.length > 0) {
      required = true
      authorities.push('Data Protection Authority')
      
      // Individual notification required if high risk
      if (severity >= IncidentSeverity.HIGH) {
        authorities.push('Affected Individuals')
      }
    }

    // Financial services notifications
    if (category === IncidentCategory.DATA_BREACH || category === IncidentCategory.SYSTEM_COMPROMISE) {
      authorities.push('Financial Conduct Authority')
      required = true
    }

    return {
      required,
      authorities,
      notificationDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours for GDPR
    }
  }

  // Send incident notifications
  private async sendIncidentNotifications(incident: SecurityIncident): Promise<void> {
    // Critical/High severity incidents - immediate notification
    if (incident.severity === IncidentSeverity.CRITICAL || incident.severity === IncidentSeverity.HIGH) {
      console.log(`📧 URGENT: Security incident notification sent for ${incident.id}`)
      
      captureSecurityEvent({
        type: 'security.incident_created',
        severity: 'critical',
        details: `${incident.category} incident: ${incident.title}`,
        timestamp: new Date(),
        metadata: {
          incidentId: incident.id,
          category: incident.category,
          affectedSystems: incident.affectedSystems,
          affectedUsers: incident.affectedUsers.length
        }
      })
    }

    // Regulatory notifications if required
    if (incident.regulatoryNotification?.required) {
      console.log(`📋 Regulatory notification required for ${incident.id}`)
      // In production: trigger regulatory notification workflow
    }
  }

  // Check if incident should be escalated
  private shouldEscalate(incident: SecurityIncident, escalationCriteria: string[]): boolean {
    // Check if any escalation criteria are met
    for (const criteria of escalationCriteria) {
      if (criteria.includes('1000 individuals') && incident.affectedUsers.length >= 1000) return true
      if (criteria.includes('Financial data') && incident.description.toLowerCase().includes('financial')) return true
      if (criteria.includes('4 hours') && this.getIncidentAge(incident) > 4) return true
      // Add more criteria checks as needed
    }

    return false
  }

  // Get incident age in hours
  private getIncidentAge(incident: SecurityIncident): number {
    return (Date.now() - incident.detectedAt.getTime()) / (1000 * 60 * 60)
  }

  // Generate evidence hash for integrity
  private generateEvidenceHash(location: string): string {
    // In production, calculate actual file hash
    return `sha256_${Date.now()}_${Math.random().toString(36)}`
  }

  // Start automatic monitoring for incidents
  private startAutomaticMonitoring(): void {
    // Monitor for incident patterns every 5 minutes
    setInterval(() => {
      this.checkForIncidentPatterns()
    }, 5 * 60 * 1000)

    // Daily incident review
    setInterval(() => {
      this.performDailyIncidentReview()
    }, 24 * 60 * 60 * 1000)
  }

  // Check for incident patterns
  private async checkForIncidentPatterns(): Promise<void> {
    // Look for patterns in recent incidents that might indicate larger issues
    const recentIncidents = Array.from(this.incidents.values())
      .filter(incident => incident.detectedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours

    if (recentIncidents.length > 5) {
      console.log('⚠️ High incident volume detected - may indicate coordinated attack')
    }
  }

  // Daily incident review
  private async performDailyIncidentReview(): Promise<void> {
    const activeIncidentsCount = this.activeIncidents.size
    const overdueIncidents = Array.from(this.incidents.values())
      .filter(incident => 
        this.activeIncidents.has(incident.id) &&
        this.getIncidentAge(incident) > 24 // Over 24 hours old
      )

    console.log(`📊 Daily incident review: ${activeIncidentsCount} active, ${overdueIncidents.length} overdue`)
  }

  // Generate incident ID
  private generateIncidentId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const sequence = String(this.incidents.size + 1).padStart(4, '0')
    return `INC-${date}-${sequence}`
  }

  // Activate containment plan
  private async activateContainmentPlan(incident: SecurityIncident): Promise<void> {
    const playbookKey = `${incident.category}_${incident.severity}`
    const playbook = this.responsePlaybooks.get(playbookKey)

    if (playbook) {
      for (const step of playbook.containmentSteps) {
        await this.implementContainment(
          incident.id,
          'Containment Plan',
          step,
          'incident_response_team'
        )
      }
    }
  }

  // Escalate incident to authorities
  private async escalateIncident(incident: SecurityIncident): Promise<void> {
    console.log(`🚨 ESCALATING INCIDENT: ${incident.id} to external authorities`)
    
    // Log escalation
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'incident_escalated', undefined, {
      incidentId: incident.id,
      escalatedAt: incident.escalatedAt,
      authorities: incident.regulatoryNotification?.authorities
    })
  }

  // Generate incident report
  private async generateIncidentReport(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId)
    if (!incident) return

    console.log(`📋 Generating incident report for ${incidentId}`)
    
    // Log report generation
    logAuditEvent(AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED, 'incident_report_generated', undefined, {
      incidentId,
      reportGeneratedAt: new Date(),
      incidentDuration: this.getIncidentAge(incident),
      evidenceCount: incident.evidence.length,
      containmentActionsCount: incident.containmentActions.length
    })
  }

  // Public API methods
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId)
  }

  getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.activeIncidents)
      .map(id => this.incidents.get(id))
      .filter((incident): incident is SecurityIncident => incident !== undefined)
  }

  getAllIncidents(limit = 50): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit)
  }

  getIncidentStats(): {
    total: number
    active: number
    byCategory: Record<IncidentCategory, number>
    bySeverity: Record<IncidentSeverity, number>
    avgResolutionTime: number
  } {
    const incidents = Array.from(this.incidents.values())
    const byCategory = {} as Record<IncidentCategory, number>
    const bySeverity = {} as Record<IncidentSeverity, number>

    Object.values(IncidentCategory).forEach(cat => byCategory[cat] = 0)
    Object.values(IncidentSeverity).forEach(sev => bySeverity[sev] = 0)

    incidents.forEach(incident => {
      byCategory[incident.category]++
      bySeverity[incident.severity]++
    })

    const closedIncidents = incidents.filter(i => i.closedAt)
    const avgResolutionTime = closedIncidents.length > 0
      ? closedIncidents.reduce((sum, incident) => {
          const resolution = incident.closedAt!.getTime() - incident.detectedAt.getTime()
          return sum + resolution
        }, 0) / closedIncidents.length / (1000 * 60 * 60) // in hours
      : 0

    return {
      total: incidents.length,
      active: this.activeIncidents.size,
      byCategory,
      bySeverity,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100
    }
  }
}

// Export singleton
export const incidentResponse = IncidentResponseSystem.getInstance()

// Convenience functions
export const createSecurityIncident = (title: string, category: IncidentCategory, severity: IncidentSeverity, description: string, detectedBy: any, systems?: string[], users?: string[]) =>
  incidentResponse.createIncident(title, category, severity, description, detectedBy, systems, users)

export const updateIncidentStatus = (id: string, status: IncidentStatus, action: string, description: string, performedBy: string, evidence?: string[]) =>
  incidentResponse.updateIncidentStatus(id, status, action, description, performedBy, evidence)

export const addIncidentEvidence = (id: string, type: Evidence['type'], name: string, description: string, location: string, collectedBy: string) =>
  incidentResponse.addEvidence(id, type, name, description, location, collectedBy)

export const implementIncidentContainment = (id: string, action: string, description: string, implementedBy: string) =>
  incidentResponse.implementContainment(id, action, description, implementedBy)

export const autoDetectIncident = (eventType: string, eventData: any, userId?: string) =>
  incidentResponse.detectIncidentFromEvent(eventType, eventData, userId)

// React hook for incident response
export function useIncidentResponse() {
  return {
    createIncident: createSecurityIncident,
    updateStatus: updateIncidentStatus,
    addEvidence: addIncidentEvidence,
    implementContainment: implementIncidentContainment,
    detectIncident: autoDetectIncident,
    getIncident: (id: string) => incidentResponse.getIncident(id),
    getActiveIncidents: () => incidentResponse.getActiveIncidents(),
    getAllIncidents: (limit?: number) => incidentResponse.getAllIncidents(limit),
    getStats: () => incidentResponse.getIncidentStats(),
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus
  }
}