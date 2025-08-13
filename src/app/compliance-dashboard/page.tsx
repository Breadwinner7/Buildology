'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Download, 
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  Shield,
  Building,
  Scale,
  Eye,
  Clock,
  Users,
  Database
} from 'lucide-react'

// Import compliance hooks
import { useComplianceReporting, ComplianceFramework, ReportType, ExportFormat } from '@/lib/compliance/reporting'
import { useGDPRControls } from '@/lib/privacy/gdpr-controls'

export default function ComplianceDashboard() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>(ComplianceFramework.SOC2)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [complianceData, setComplianceData] = useState(null)

  // Compliance hooks
  const {
    generateReport,
    exportReport,
    generateAuditTrail,
    generatePIA,
    getReportHistory,
    getComplianceControls,
    scheduleReporting,
    ComplianceFramework: CF,
    ReportType: RT,
    ExportFormat: EF
  } = useComplianceReporting()

  const {
    getProcessingRecords,
    getConsentRecords,
    getDataSubjectRequests,
    getStats: getGDPRStats
  } = useGDPRControls()

  useEffect(() => {
    loadComplianceData()
  }, [selectedFramework])

  const loadComplianceData = async () => {
    try {
      setLoading(true)
      
      const reports = getReportHistory(10)
      const controls = getComplianceControls(selectedFramework)
      const gdprStats = getGDPRStats()
      
      setComplianceData({
        reports,
        controls,
        gdprStats,
        frameworks: {
          [CF.SOC2]: { score: 92, status: 'compliant' },
          [CF.GDPR]: { score: 88, status: 'compliant' },
          [CF.ISO_27001]: { score: 85, status: 'review_required' },
          [CF.HIPAA]: { score: 78, status: 'review_required' },
          [CF.PCI_DSS]: { score: 82, status: 'review_required' }
        }
      })
    } catch (error) {
      console.error('Failed to load compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (type: ReportType, format: ExportFormat) => {
    try {
      setLoading(true)
      
      const config = {
        type,
        framework: selectedFramework,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        format,
        includeDetails: true
      }

      const report = await generateReport(config, 'current_user')
      
      // Export the report
      const exportResult = await exportReport(report.id, format, 'current_user')
      
      if (exportResult.success) {
        // In a real app, you would trigger a download
        console.log('Report generated successfully:', exportResult.filename)
      }
      
      await loadComplianceData()
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFrameworkIcon = (framework: ComplianceFramework) => {
    switch (framework) {
      case CF.SOC2: return <Building className="h-4 w-4" />
      case CF.GDPR: return <Shield className="h-4 w-4" />
      case CF.ISO_27001: return <Scale className="h-4 w-4" />
      case CF.HIPAA: return <Users className="h-4 w-4" />
      case CF.PCI_DSS: return <Database className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600'
      case 'review_required': return 'text-yellow-600'
      case 'non_compliant': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'review_required': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'non_compliant': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (loading && !complianceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <FileText className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CF.SOC2}>SOC 2</SelectItem>
              <SelectItem value={CF.GDPR}>GDPR</SelectItem>
              <SelectItem value={CF.ISO_27001}>ISO 27001</SelectItem>
              <SelectItem value={CF.HIPAA}>HIPAA</SelectItem>
              <SelectItem value={CF.PCI_DSS}>PCI DSS</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => handleGenerateReport(RT.COMPLIANCE_STATUS, EF.PDF)}
            disabled={loading}
          >
            {loading ? 'Generating...' : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Framework Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Object.entries(complianceData?.frameworks || {}).map(([framework, data]) => (
          <Card key={framework} className={selectedFramework === framework ? 'border-blue-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{framework.toUpperCase()}</CardTitle>
              {getFrameworkIcon(framework as ComplianceFramework)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.score}%</div>
              <div className="flex items-center space-x-1 mt-1">
                {getStatusIcon(data.status)}
                <p className={`text-xs capitalize ${getStatusColor(data.status)}`}>
                  {data.status.replace('_', ' ')}
                </p>
              </div>
              <Progress value={data.score} className="h-1 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="gdpr">GDPR</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Framework Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getFrameworkIcon(selectedFramework)}
                  <span>{selectedFramework.toUpperCase()} Compliance</span>
                </CardTitle>
                <CardDescription>Current compliance status and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Compliance Score:</span>
                  <span className="text-2xl font-bold">
                    {complianceData?.frameworks?.[selectedFramework]?.score || 0}%
                  </span>
                </div>
                <Progress 
                  value={complianceData?.frameworks?.[selectedFramework]?.score || 0} 
                  className="h-2" 
                />
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(complianceData?.frameworks?.[selectedFramework]?.status)}
                    <span className={`capitalize ${getStatusColor(complianceData?.frameworks?.[selectedFramework]?.status)}`}>
                      {complianceData?.frameworks?.[selectedFramework]?.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Generate compliance reports and documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport(RT.SECURITY_ASSESSMENT, EF.PDF)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Security Assessment Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport(RT.DATA_PRIVACY, EF.PDF)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Data Privacy Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport(RT.ACCESS_REVIEW, EF.CSV)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Access Review Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => generateAuditTrail(
                    { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
                    EF.CSV
                  )}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Audit Trail Export
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{selectedFramework.toUpperCase()} Controls</CardTitle>
              <CardDescription>Implementation status of compliance controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceData?.controls?.map((control, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{control.controlId} - {control.title}</CardTitle>
                        <Badge 
                          variant={
                            control.status === 'implemented' ? 'default' :
                            control.status === 'partial' ? 'secondary' : 'destructive'
                          }
                        >
                          {control.status}
                        </Badge>
                      </div>
                      <CardDescription>{control.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Implementation:</span>
                          <p className="text-muted-foreground mt-1">{control.implementation}</p>
                        </div>
                        <div>
                          <span className="font-medium">Last Assessed:</span>
                          <p className="text-muted-foreground mt-1">
                            {new Date(control.lastAssessed).toLocaleDateString()} by {control.assessedBy}
                          </p>
                        </div>
                      </div>
                      {control.evidence.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-sm">Evidence:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {control.evidence.map((evidence, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{evidence}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No controls found for {selectedFramework.toUpperCase()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Generated compliance and audit reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceData?.reports?.length > 0 ? (
                  complianceData.reports.map((report, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{report.type?.replace('_', ' ').toUpperCase()} Report</h4>
                            <p className="text-sm text-muted-foreground">
                              Framework: {report.framework?.toUpperCase() || 'General'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Generated {new Date(report.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                report.status === 'compliant' ? 'default' :
                                report.status === 'review_required' ? 'secondary' : 'destructive'
                              }
                            >
                              {report.complianceScore}% - {report.status?.replace('_', ' ')}
                            </Badge>
                            <Button size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {report.recommendations?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium">Key Recommendations:</p>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              {report.recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No reports generated yet. Generate your first compliance report above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GDPR Tab */}
        <TabsContent value="gdpr" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Records</CardTitle>
                <Database className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData?.gdprStats?.totalProcessingRecords || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData?.gdprStats?.activeConsents || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {complianceData?.gdprStats?.expiredConsents || 0} expired
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Requests</CardTitle>
                <Eye className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData?.gdprStats?.totalRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {complianceData?.gdprStats?.pendingRequests || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consent Records</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData?.gdprStats?.totalConsentRecords || 0}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GDPR Quick Actions</CardTitle>
              <CardDescription>Manage data subject rights and privacy controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <div className="font-medium">Generate Privacy Impact Assessment</div>
                    <div className="text-sm text-muted-foreground">Assess privacy risks for new projects</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <div className="font-medium">Export Data Subject Requests</div>
                    <div className="text-sm text-muted-foreground">Download recent data requests</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <div className="font-medium">Consent Management Report</div>
                    <div className="text-sm text-muted-foreground">Review consent status and renewals</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <div className="font-medium">Data Retention Review</div>
                    <div className="text-sm text-muted-foreground">Check retention policies and cleanup</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail Export</CardTitle>
              <CardDescription>Export detailed audit trails for compliance purposes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => generateAuditTrail(
                    { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
                    EF.CSV
                  )}
                  className="h-20 flex-col"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  Last 7 Days
                </Button>
                <Button 
                  onClick={() => generateAuditTrail(
                    { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
                    EF.CSV
                  )}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  Last 30 Days
                </Button>
                <Button 
                  onClick={() => generateAuditTrail(
                    { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
                    EF.CSV
                  )}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  Last 90 Days
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}