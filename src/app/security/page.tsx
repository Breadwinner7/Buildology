'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Settings,
  Activity,
  Lock,
  Key,
  Database,
  Scan,
  Download
} from 'lucide-react'

// Import our security hooks
import { useVulnerabilityScanner } from '@/lib/security/vulnerability-scanner'
import { useIncidentResponse } from '@/lib/security/incident-response'
import { useComplianceReporting } from '@/lib/compliance/reporting'
import { useDisasterRecovery } from '@/lib/backup/disaster-recovery'
import { useAuthSecurity } from '@/lib/security/auth-security'

export default function SecurityDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [securityData, setSecurityData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Security system hooks
  const { 
    quickCheck, 
    performScan, 
    getLatestScan, 
    getScanHistory,
    isScanning,
    getStats: getVulnStats
  } = useVulnerabilityScanner()

  const {
    getActiveIncidents,
    getAllIncidents,
    getStats: getIncidentStats
  } = useIncidentResponse()

  const {
    getReportHistory,
    generateReport,
    getComplianceControls
  } = useComplianceReporting()

  const {
    getBackupStats,
    getBackupHistory
  } = useDisasterRecovery()

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      setLoading(true)
      
      // Run quick security check
      const securityHealth = await quickCheck()
      
      // Get all stats
      const vulnStats = getVulnStats()
      const incidentStats = getIncidentStats()
      const backupStats = getBackupStats()
      const activeIncidents = getActiveIncidents()
      const recentReports = getReportHistory(5)

      setSecurityData({
        health: securityHealth,
        vulnerabilities: vulnStats,
        incidents: {
          ...incidentStats,
          active: activeIncidents
        },
        backups: backupStats,
        compliance: {
          recentReports
        }
      })
    } catch (error) {
      console.error('Failed to load security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runFullScan = async () => {
    try {
      await performScan({
        enabledChecks: ['authentication', 'authorization', 'data_exposure', 'injection'],
        depth: 'thorough',
        includeInformational: true
      })
      await loadSecurityData()
    } catch (error) {
      console.error('Security scan failed:', error)
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'secure': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'secure': return <ShieldCheck className="h-5 w-5 text-green-600" />
      case 'warning': return <ShieldAlert className="h-5 w-5 text-yellow-600" />
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Shield className="h-5 w-5 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Security Center</h1>
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
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Security Center</h1>
        </div>
        <Button onClick={runFullScan} disabled={isScanning()}>
          {isScanning() ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Scan className="h-4 w-4 mr-2" />
              Run Security Scan
            </>
          )}
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Health</CardTitle>
            {securityData?.health && getHealthIcon(securityData.health.overallHealth)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              <span className={getHealthColor(securityData?.health?.overallHealth)}>
                {securityData?.health?.overallHealth || 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Risk Score: {securityData?.health?.riskScore || 0}/100
            </p>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityData?.incidents?.active?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityData?.incidents?.total || 0} total incidents
            </p>
          </CardContent>
        </Card>

        {/* Vulnerabilities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityData?.vulnerabilities?.totalFindings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityData?.vulnerabilities?.totalScans || 0} scans completed
            </p>
          </CardContent>
        </Card>

        {/* Backup Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Health</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityData?.backups?.successRate?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {securityData?.backups?.totalBackups || 0} backups completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
                <CardDescription>Immediate actions to improve security posture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {securityData?.health?.recommendedActions?.map((action, index) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{action}</AlertDescription>
                  </Alert>
                )) || (
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription>No immediate security actions required</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Activity</CardTitle>
                <CardDescription>Latest security events and actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {securityData?.incidents?.active?.slice(0, 5).map((incident, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {incident.severity}
                    </Badge>
                    <span className="text-sm">{incident.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(incident.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">No recent security incidents</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vulnerabilities Tab */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vulnerability Assessment</CardTitle>
                <CardDescription>Security vulnerabilities found in system scans</CardDescription>
              </div>
              <Button onClick={runFullScan} disabled={isScanning()}>
                {isScanning() ? 'Scanning...' : 'Run Scan'}
              </Button>
            </CardHeader>
            <CardContent>
              {securityData?.vulnerabilities && (
                <div className="space-y-4">
                  {/* Severity Breakdown */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {securityData.vulnerabilities.findingsBySeverity?.critical || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {securityData.vulnerabilities.findingsBySeverity?.high || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {securityData.vulnerabilities.findingsBySeverity?.medium || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Medium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {securityData.vulnerabilities.findingsBySeverity?.low || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Low</div>
                    </div>
                  </div>

                  {/* Risk Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Average Risk Score</span>
                      <span className="text-sm">{securityData.vulnerabilities.averageRiskScore}/100</span>
                    </div>
                    <Progress value={securityData.vulnerabilities.averageRiskScore} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>Active and recent security incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityData?.incidents?.active?.length > 0 ? (
                  securityData.incidents.active.map((incident, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{incident.title}</CardTitle>
                          <Badge 
                            variant={
                              incident.severity === 'critical' ? 'destructive' :
                              incident.severity === 'high' ? 'destructive' :
                              incident.severity === 'medium' ? 'secondary' : 'outline'
                            }
                          >
                            {incident.severity}
                          </Badge>
                        </div>
                        <CardDescription>{incident.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Detected:</span> 
                            {new Date(incident.detectedAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> 
                            <Badge variant="outline" className="ml-2">{incident.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>All Clear</AlertTitle>
                    <AlertDescription>No active security incidents detected</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Compliance Reports</CardTitle>
                <CardDescription>Generate and view compliance reports</CardDescription>
              </div>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityData?.compliance?.recentReports?.length > 0 ? (
                  securityData.compliance.recentReports.map((report, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{report.type} Report</h4>
                            <p className="text-sm text-muted-foreground">
                              Generated {new Date(report.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={report.status === 'compliant' ? 'default' : 'destructive'}>
                              Score: {report.complianceScore}%
                            </Badge>
                            <Button size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>No compliance reports generated yet</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery Status</CardTitle>
              <CardDescription>Monitor backup health and recovery capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              {securityData?.backups && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{securityData.backups.totalBackups}</div>
                      <div className="text-sm text-muted-foreground">Total Backups</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {securityData.backups.successRate.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{securityData.backups.activeBackups}</div>
                      <div className="text-sm text-muted-foreground">Active Backups</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{securityData.backups.configuredTargets}</div>
                      <div className="text-sm text-muted-foreground">Backup Targets</div>
                    </div>
                  </div>

                  <Progress value={securityData.backups.successRate} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security policies and controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertTitle>Security Configuration</AlertTitle>
                  <AlertDescription>
                    Security settings are managed through the system configuration.
                    Contact your administrator to modify security policies.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}