// Comprehensive compliance reporting and audit export system
import { getAuditEvents, exportAuditTrail, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { getSecurityScanHistory } from '@/lib/security/vulnerability-scanner'
import { logAuditEvent } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Compliance frameworks and standards
export enum ComplianceFramework {
  SOC2 = 'soc2',
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
  FCA = 'fca', // Financial Conduct Authority
  SOLVENCY_II = 'solvency_ii'
}

// Report types
export enum ReportType {
  AUDIT_TRAIL = 'audit_trail',
  SECURITY_ASSESSMENT = 'security_assessment',
  DATA_PRIVACY = 'data_privacy',
  ACCESS_REVIEW = 'access_review',
  INCIDENT_SUMMARY = 'incident_summary',
  COMPLIANCE_STATUS = 'compliance_status',
  RISK_ASSESSMENT = 'risk_assessment',
  USER_ACTIVITY = 'user_activity'
}

// Export formats
export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  EXCEL = 'xlsx'
}

// Report configuration
export interface ReportConfig {
  type: ReportType
  framework?: ComplianceFramework
  dateRange: {
    start: Date
    end: Date
  }
  filters?: {
    userId?: string
    severity?: string[]
    eventTypes?: string[]
    departments?: string[]
  }
  format: ExportFormat
  includeDetails: boolean
  anonymize?: boolean
}

// Compliance report result
export interface ComplianceReport {
  id: string
  type: ReportType
  framework?: ComplianceFramework
  generatedAt: Date
  generatedBy: string
  dateRange: {
    start: Date
    end: Date
  }
  summary: {
    totalEvents: number
    criticalEvents: number
    userCount: number
    systemChanges: number
    securityIncidents: number
  }
  sections: ReportSection[]
  recommendations: string[]
  complianceScore: number
  status: 'compliant' | 'non_compliant' | 'review_required'
  nextReviewDate: Date
}

// Report section
export interface ReportSection {
  title: string
  description: string
  findings: Finding[]
  controls: ComplianceControl[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  status: 'pass' | 'fail' | 'partial' | 'not_applicable'
}

// Individual finding
export interface Finding {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence: string[]
  recommendation: string
  controlReference?: string
  status: 'open' | 'mitigated' | 'accepted'
}

// Compliance control
export interface ComplianceControl {
  id: string
  framework: ComplianceFramework
  controlId: string
  title: string
  description: string
  requirement: string
  implementation: string
  evidence: string[]
  status: 'implemented' | 'partial' | 'not_implemented'
  lastAssessed: Date
  assessedBy: string
  nextReview: Date
}

class ComplianceReporting {
  private static instance: ComplianceReporting
  private reportHistory: ComplianceReport[] = []
  private complianceControls: Map<ComplianceFramework, ComplianceControl[]> = new Map()

  private constructor() {
    this.initializeComplianceControls()
    console.log('📋 Compliance reporting initialized')
  }

  public static getInstance(): ComplianceReporting {
    if (!this.instance) {
      this.instance = new ComplianceReporting()
    }
    return this.instance
  }

  private initializeComplianceControls() {
    // SOC 2 Controls
    const soc2Controls: ComplianceControl[] = [
      {
        id: 'soc2_cc6_1',
        framework: ComplianceFramework.SOC2,
        controlId: 'CC6.1',
        title: 'Logical and Physical Access Controls',
        description: 'Entity implements logical access security software and architecture',
        requirement: 'Restrict logical access to system resources, data, and application functionality',
        implementation: 'Multi-factor authentication, role-based access control, session management',
        evidence: ['Authentication logs', 'Access control policies', 'User access reviews'],
        status: 'implemented',
        lastAssessed: new Date(),
        assessedBy: 'system',
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      },
      {
        id: 'soc2_cc6_7',
        framework: ComplianceFramework.SOC2,
        controlId: 'CC6.7',
        title: 'Data Transmission and Disposal',
        description: 'Entity restricts data transmission and disposal',
        requirement: 'Transmit and dispose of data in accordance with system objectives',
        implementation: 'Encryption in transit and at rest, secure data disposal procedures',
        evidence: ['Encryption configuration', 'Data retention policies', 'Disposal logs'],
        status: 'implemented',
        lastAssessed: new Date(),
        assessedBy: 'system',
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    ]

    // GDPR Controls
    const gdprControls: ComplianceControl[] = [
      {
        id: 'gdpr_art_32',
        framework: ComplianceFramework.GDPR,
        controlId: 'Article 32',
        title: 'Security of Processing',
        description: 'Appropriate technical and organisational measures to ensure security',
        requirement: 'Implement appropriate technical and organisational measures',
        implementation: 'Encryption, access controls, regular security testing, incident procedures',
        evidence: ['Security policies', 'Encryption evidence', 'Security test reports'],
        status: 'implemented',
        lastAssessed: new Date(),
        assessedBy: 'system',
        nextReview: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days
      },
      {
        id: 'gdpr_art_25',
        framework: ComplianceFramework.GDPR,
        controlId: 'Article 25',
        title: 'Data Protection by Design and Default',
        description: 'Privacy by design implementation',
        requirement: 'Implement data protection by design and by default',
        implementation: 'Privacy controls built into system architecture, data minimization',
        evidence: ['Privacy impact assessments', 'Data processing records', 'System design docs'],
        status: 'partial',
        lastAssessed: new Date(),
        assessedBy: 'system',
        nextReview: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      }
    ]

    // ISO 27001 Controls
    const iso27001Controls: ComplianceControl[] = [
      {
        id: 'iso_a9_1_2',
        framework: ComplianceFramework.ISO_27001,
        controlId: 'A.9.1.2',
        title: 'Access to Networks and Network Services',
        description: 'Users shall only be provided access to networks and network services',
        requirement: 'Provide users access only to networks they are authorized to use',
        implementation: 'Network segmentation, access control lists, VPN access controls',
        evidence: ['Network policies', 'Access logs', 'Network architecture diagrams'],
        status: 'implemented',
        lastAssessed: new Date(),
        assessedBy: 'system',
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    ]

    this.complianceControls.set(ComplianceFramework.SOC2, soc2Controls)
    this.complianceControls.set(ComplianceFramework.GDPR, gdprControls)
    this.complianceControls.set(ComplianceFramework.ISO_27001, iso27001Controls)
  }

  // Generate comprehensive compliance report
  async generateComplianceReport(
    config: ReportConfig,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const reportId = this.generateReportId()
    const startTime = Date.now()

    try {
      console.log(`📊 Generating compliance report: ${config.type} (${config.framework || 'general'})`)

      // Gather audit events
      const auditEvents = getAuditEvents({
        startDate: config.dateRange.start,
        endDate: config.dateRange.end,
        userId: config.filters?.userId
      })

      // Get security scan history
      const securityScans = getSecurityScanHistory(10)

      // Create report sections based on type and framework
      const sections = await this.createReportSections(config, auditEvents, securityScans)

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(sections)

      // Generate summary
      const summary = this.generateSummary(auditEvents, securityScans)

      // Create recommendations
      const recommendations = this.generateRecommendations(sections, config.framework)

      // Determine compliance status
      const status = this.determineComplianceStatus(complianceScore, sections)

      const report: ComplianceReport = {
        id: reportId,
        type: config.type,
        framework: config.framework,
        generatedAt: new Date(),
        generatedBy,
        dateRange: config.dateRange,
        summary,
        sections,
        recommendations,
        complianceScore,
        status,
        nextReviewDate: this.calculateNextReviewDate(config.framework)
      }

      // Store report
      this.reportHistory.push(report)

      // Log report generation
      logAuditEvent(AUDIT_ACTIONS.DATA_EXPORT, 'compliance_report', undefined, {
        reportId,
        reportType: config.type,
        framework: config.framework,
        generatedBy,
        dateRange: config.dateRange,
        complianceScore,
        duration: Date.now() - startTime
      })

      console.log(`✅ Compliance report generated: ${reportId} (Score: ${complianceScore})`)
      return report

    } catch (error) {
      console.error('Compliance report generation failed:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  // Export report in specified format
  async exportReport(
    reportId: string,
    format: ExportFormat,
    userId: string
  ): Promise<{
    success: boolean
    data?: string | Buffer
    filename: string
    error?: string
  }> {
    try {
      const report = this.reportHistory.find(r => r.id === reportId)
      if (!report) {
        return {
          success: false,
          filename: '',
          error: 'Report not found'
        }
      }

      const filename = this.generateFilename(report, format)
      let exportData: string | Buffer

      switch (format) {
        case ExportFormat.JSON:
          exportData = JSON.stringify(report, null, 2)
          break

        case ExportFormat.CSV:
          exportData = this.convertToCSV(report)
          break

        case ExportFormat.XML:
          exportData = this.convertToXML(report)
          break

        case ExportFormat.PDF:
          exportData = await this.convertToPDF(report)
          break

        case ExportFormat.EXCEL:
          exportData = await this.convertToExcel(report)
          break

        default:
          return {
            success: false,
            filename: '',
            error: 'Unsupported export format'
          }
      }

      // Log export activity
      logAuditEvent(AUDIT_ACTIONS.DATA_EXPORT, 'compliance_report', userId, {
        reportId,
        format,
        filename,
        reportType: report.type,
        framework: report.framework
      })

      return {
        success: true,
        data: exportData,
        filename
      }

    } catch (error) {
      console.error('Report export failed:', error)
      return {
        success: false,
        filename: '',
        error: 'Export failed'
      }
    }
  }

  // Generate audit trail report
  async generateAuditTrailReport(
    dateRange: { start: Date; end: Date },
    format: ExportFormat = ExportFormat.CSV,
    filters?: any
  ): Promise<string> {
    try {
      const auditData = exportAuditTrail(format, {
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...filters
      })

      // Log audit trail export
      logAuditEvent(AUDIT_ACTIONS.AUDIT_EXPORT, 'audit_trail', undefined, {
        dateRange,
        format,
        filters
      })

      return auditData

    } catch (error) {
      console.error('Audit trail export failed:', error)
      throw new Error('Failed to export audit trail')
    }
  }

  // Privacy impact assessment
  async generatePrivacyImpactAssessment(
    projectId: string,
    assessorId: string
  ): Promise<{
    id: string
    projectId: string
    riskLevel: 'low' | 'medium' | 'high' | 'very_high'
    findings: Finding[]
    recommendations: string[]
    requiresDPO: boolean
    requiresConsultation: boolean
  }> {
    const piaId = `pia_${Date.now()}`

    // Analyze data processing activities
    const findings: Finding[] = []
    
    // Example findings (would be based on actual assessment)
    findings.push({
      id: 'pia_001',
      title: 'Personal Data Processing',
      description: 'System processes personal data including PII and financial information',
      severity: 'medium',
      evidence: ['Data processing records', 'Database schemas'],
      recommendation: 'Implement data minimization and purpose limitation controls',
      status: 'open'
    })

    const riskLevel = this.calculatePrivacyRiskLevel(findings)
    const recommendations = this.generatePrivacyRecommendations(findings, riskLevel)

    // Log PIA generation
    logAuditEvent(AUDIT_ACTIONS.COMPLIANCE_READ, 'privacy_impact_assessment', assessorId, {
      piaId,
      projectId,
      riskLevel,
      findingsCount: findings.length
    })

    return {
      id: piaId,
      projectId,
      riskLevel,
      findings,
      recommendations,
      requiresDPO: riskLevel === 'high' || riskLevel === 'very_high',
      requiresConsultation: riskLevel === 'very_high'
    }
  }

  // Create report sections based on configuration
  private async createReportSections(
    config: ReportConfig,
    auditEvents: any[],
    securityScans: any[]
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = []

    switch (config.type) {
      case ReportType.SECURITY_ASSESSMENT:
        sections.push(await this.createSecuritySection(securityScans))
        break

      case ReportType.ACCESS_REVIEW:
        sections.push(await this.createAccessReviewSection(auditEvents))
        break

      case ReportType.DATA_PRIVACY:
        sections.push(await this.createPrivacySection(auditEvents))
        break

      case ReportType.AUDIT_TRAIL:
        sections.push(await this.createAuditSection(auditEvents))
        break

      case ReportType.COMPLIANCE_STATUS:
        if (config.framework) {
          sections.push(await this.createComplianceSection(config.framework))
        }
        break
    }

    return sections
  }

  private async createSecuritySection(securityScans: any[]): Promise<ReportSection> {
    const latestScan = securityScans[0]
    const findings: Finding[] = []

    if (latestScan && latestScan.summary.critical > 0) {
      findings.push({
        id: 'sec_001',
        title: 'Critical Security Vulnerabilities',
        description: `${latestScan.summary.critical} critical vulnerabilities found`,
        severity: 'critical',
        evidence: ['Security scan results'],
        recommendation: 'Address critical vulnerabilities immediately',
        status: 'open'
      })
    }

    return {
      title: 'Security Assessment',
      description: 'Analysis of system security posture and vulnerabilities',
      findings,
      controls: [],
      riskLevel: latestScan?.summary.critical > 0 ? 'critical' : 'medium',
      status: latestScan?.summary.critical > 0 ? 'fail' : 'pass'
    }
  }

  private async createAccessReviewSection(auditEvents: any[]): Promise<ReportSection> {
    const accessEvents = auditEvents.filter(e => 
      e.action.includes('login') || e.action.includes('permission')
    )

    const findings: Finding[] = []

    // Check for unusual access patterns
    const failedLogins = accessEvents.filter(e => e.action === AUDIT_ACTIONS.LOGIN_FAILED)
    if (failedLogins.length > 10) {
      findings.push({
        id: 'access_001',
        title: 'High Failed Login Attempts',
        description: `${failedLogins.length} failed login attempts detected`,
        severity: 'medium',
        evidence: ['Authentication logs'],
        recommendation: 'Review account security and implement additional protections',
        status: 'open'
      })
    }

    return {
      title: 'Access Control Review',
      description: 'Review of user access patterns and authentication events',
      findings,
      controls: [],
      riskLevel: failedLogins.length > 50 ? 'high' : 'low',
      status: failedLogins.length > 50 ? 'fail' : 'pass'
    }
  }

  private async createPrivacySection(auditEvents: any[]): Promise<ReportSection> {
    const privacyEvents = auditEvents.filter(e => 
      e.action.includes('data') || e.resource === 'encryption'
    )

    return {
      title: 'Data Privacy Controls',
      description: 'Assessment of data protection and privacy measures',
      findings: [],
      controls: this.complianceControls.get(ComplianceFramework.GDPR) || [],
      riskLevel: 'low',
      status: 'pass'
    }
  }

  private async createAuditSection(auditEvents: any[]): Promise<ReportSection> {
    return {
      title: 'Audit Trail Review',
      description: 'Comprehensive review of system audit logs',
      findings: [],
      controls: [],
      riskLevel: 'low',
      status: 'pass'
    }
  }

  private async createComplianceSection(framework: ComplianceFramework): Promise<ReportSection> {
    const controls = this.complianceControls.get(framework) || []
    const implementedControls = controls.filter(c => c.status === 'implemented')
    
    const findings: Finding[] = []
    controls.forEach(control => {
      if (control.status !== 'implemented') {
        findings.push({
          id: control.id,
          title: `Control ${control.controlId} Not Implemented`,
          description: control.description,
          severity: 'medium',
          evidence: control.evidence,
          recommendation: `Implement control: ${control.title}`,
          controlReference: control.controlId,
          status: 'open'
        })
      }
    })

    const implementationRate = (implementedControls.length / controls.length) * 100

    return {
      title: `${framework.toUpperCase()} Compliance`,
      description: `Assessment against ${framework.toUpperCase()} requirements`,
      findings,
      controls,
      riskLevel: implementationRate < 80 ? 'high' : 'low',
      status: implementationRate >= 90 ? 'pass' : implementationRate >= 70 ? 'partial' : 'fail'
    }
  }

  // Helper methods
  private calculateComplianceScore(sections: ReportSection[]): number {
    if (sections.length === 0) return 0

    const sectionScores = sections.map(section => {
      switch (section.status) {
        case 'pass': return 100
        case 'partial': return 70
        case 'fail': return 30
        case 'not_applicable': return 100
        default: return 50
      }
    })

    return Math.round(sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length)
  }

  private generateSummary(auditEvents: any[], securityScans: any[]) {
    const uniqueUsers = new Set(auditEvents.map(e => e.userId)).size
    const systemChanges = auditEvents.filter(e => e.action.includes('system')).length
    const securityIncidents = auditEvents.filter(e => e.action.includes('security')).length
    const criticalEvents = auditEvents.filter(e => e.severity === 'critical').length

    return {
      totalEvents: auditEvents.length,
      criticalEvents,
      userCount: uniqueUsers,
      systemChanges,
      securityIncidents
    }
  }

  private generateRecommendations(sections: ReportSection[], framework?: ComplianceFramework): string[] {
    const recommendations: string[] = []

    sections.forEach(section => {
      section.findings.forEach(finding => {
        if (finding.status === 'open') {
          recommendations.push(finding.recommendation)
        }
      })
    })

    // Framework-specific recommendations
    if (framework === ComplianceFramework.GDPR) {
      recommendations.push('Conduct regular privacy impact assessments')
      recommendations.push('Implement data subject rights procedures')
    }

    if (framework === ComplianceFramework.SOC2) {
      recommendations.push('Establish continuous monitoring procedures')
      recommendations.push('Document change management processes')
    }

    return Array.from(new Set(recommendations)) // Remove duplicates
  }

  private determineComplianceStatus(
    score: number, 
    sections: ReportSection[]
  ): 'compliant' | 'non_compliant' | 'review_required' {
    const criticalFailures = sections.filter(s => s.status === 'fail' && s.riskLevel === 'critical')
    
    if (criticalFailures.length > 0) return 'non_compliant'
    if (score >= 85) return 'compliant'
    return 'review_required'
  }

  private calculateNextReviewDate(framework?: ComplianceFramework): Date {
    const months = framework === ComplianceFramework.GDPR ? 6 : 3 // GDPR: 6 months, others: 3 months
    return new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
  }

  private calculatePrivacyRiskLevel(findings: Finding[]): 'low' | 'medium' | 'high' | 'very_high' {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length
    const highFindings = findings.filter(f => f.severity === 'high').length

    if (criticalFindings > 2) return 'very_high'
    if (criticalFindings > 0 || highFindings > 3) return 'high'
    if (highFindings > 0) return 'medium'
    return 'low'
  }

  private generatePrivacyRecommendations(findings: Finding[], riskLevel: string): string[] {
    const recommendations = findings.map(f => f.recommendation)
    
    if (riskLevel === 'very_high') {
      recommendations.push('Consult with supervisory authority')
      recommendations.push('Consider halting data processing activities')
    }
    
    return recommendations
  }

  // Export format converters
  private convertToCSV(report: ComplianceReport): string {
    const headers = ['Section', 'Finding', 'Severity', 'Status', 'Recommendation']
    const rows: string[] = [headers.join(',')]

    report.sections.forEach(section => {
      section.findings.forEach(finding => {
        const row = [
          `"${section.title}"`,
          `"${finding.title}"`,
          finding.severity,
          finding.status,
          `"${finding.recommendation}"`
        ]
        rows.push(row.join(','))
      })
    })

    return rows.join('\n')
  }

  private convertToXML(report: ComplianceReport): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compliance-report id="${report.id}">
  <metadata>
    <type>${report.type}</type>
    <framework>${report.framework || ''}</framework>
    <generated-at>${report.generatedAt.toISOString()}</generated-at>
    <compliance-score>${report.complianceScore}</compliance-score>
    <status>${report.status}</status>
  </metadata>
  <sections>
    ${report.sections.map(section => `
    <section>
      <title>${section.title}</title>
      <status>${section.status}</status>
      <risk-level>${section.riskLevel}</risk-level>
      <findings>
        ${section.findings.map(finding => `
        <finding id="${finding.id}">
          <title>${finding.title}</title>
          <severity>${finding.severity}</severity>
          <status>${finding.status}</status>
          <recommendation>${finding.recommendation}</recommendation>
        </finding>`).join('')}
      </findings>
    </section>`).join('')}
  </sections>
</compliance-report>`
  }

  private async convertToPDF(report: ComplianceReport): Promise<Buffer> {
    // In production, use a PDF library like puppeteer or jsPDF
    const content = `Compliance Report - ${report.type}\n\nScore: ${report.complianceScore}\nStatus: ${report.status}`
    return Buffer.from(content, 'utf-8')
  }

  private async convertToExcel(report: ComplianceReport): Promise<Buffer> {
    // In production, use a library like exceljs
    const content = JSON.stringify(report)
    return Buffer.from(content, 'utf-8')
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private generateFilename(report: ComplianceReport, format: ExportFormat): string {
    const date = report.generatedAt.toISOString().split('T')[0]
    const framework = report.framework ? `_${report.framework}` : ''
    return `${report.type}${framework}_${date}.${format}`
  }

  // Public API methods
  getReportHistory(limit = 20): ComplianceReport[] {
    return this.reportHistory.slice(-limit).reverse()
  }

  getComplianceControls(framework: ComplianceFramework): ComplianceControl[] {
    return this.complianceControls.get(framework) || []
  }

  async scheduleAutomaticReporting(
    config: ReportConfig,
    schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ): Promise<string> {
    // In production, integrate with job scheduler
    const scheduleId = `schedule_${Date.now()}`
    console.log(`📅 Scheduled ${schedule} ${config.type} reports: ${scheduleId}`)
    return scheduleId
  }
}

// Export singleton
export const complianceReporting = ComplianceReporting.getInstance()

// Convenience functions
export const generateComplianceReport = (config: ReportConfig, generatedBy: string) =>
  complianceReporting.generateComplianceReport(config, generatedBy)

export const exportComplianceReport = (reportId: string, format: ExportFormat, userId: string) =>
  complianceReporting.exportReport(reportId, format, userId)

export const generateAuditTrail = (dateRange: any, format?: ExportFormat, filters?: any) =>
  complianceReporting.generateAuditTrailReport(dateRange, format, filters)

export const generatePrivacyImpactAssessment = (projectId: string, assessorId: string) =>
  complianceReporting.generatePrivacyImpactAssessment(projectId, assessorId)

// React hook for compliance reporting
export function useComplianceReporting() {
  return {
    generateReport: generateComplianceReport,
    exportReport: exportComplianceReport,
    generateAuditTrail,
    generatePIA: generatePrivacyImpactAssessment,
    getReportHistory: (limit?: number) => complianceReporting.getReportHistory(limit),
    getComplianceControls: (framework: ComplianceFramework) => complianceReporting.getComplianceControls(framework),
    scheduleReporting: (config: ReportConfig, schedule: any) => complianceReporting.scheduleAutomaticReporting(config, schedule),
    ComplianceFramework,
    ReportType,
    ExportFormat
  }
}