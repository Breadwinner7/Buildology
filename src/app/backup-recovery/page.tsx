'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Database, 
  HardDrive,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  RotateCcw,
  Settings,
  Activity,
  Shield,
  FileArchive,
  Server,
  CloudUpload,
  Download,
  TestTube
} from 'lucide-react'

// Import backup hooks
import { 
  useDisasterRecovery, 
  BackupType, 
  BackupSchedule 
} from '@/lib/backup/disaster-recovery'

export default function BackupRecoveryDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [backupData, setBackupData] = useState(null)

  // Backup & Recovery hooks
  const {
    performBackup,
    restoreFromBackup,
    executeRecoveryPlan,
    testRecoveryPlan,
    getBackupConfigs,
    getBackupHistory,
    getRecoveryPlans,
    getRecoveryObjectives,
    updateRecoveryObjectives,
    getBackupStats,
    BackupType: BT,
    BackupSchedule: BS
  } = useDisasterRecovery()

  useEffect(() => {
    loadBackupData()
  }, [])

  const loadBackupData = async () => {
    try {
      setLoading(true)
      
      const configs = getBackupConfigs()
      const history = getBackupHistory(undefined, 20)
      const plans = getRecoveryPlans()
      const objectives = getRecoveryObjectives()
      const stats = getBackupStats()
      
      setBackupData({
        configs,
        history,
        plans,
        objectives,
        stats
      })
    } catch (error) {
      console.error('Failed to load backup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBackup = async (configId: string) => {
    try {
      setLoading(true)
      await performBackup(configId)
      await loadBackupData()
    } catch (error) {
      console.error('Backup failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    try {
      setLoading(true)
      await restoreFromBackup(backupId, {
        verifyBeforeRestore: true
      })
      await loadBackupData()
    } catch (error) {
      console.error('Restore failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestRecovery = async (planId: string) => {
    try {
      setLoading(true)
      await testRecoveryPlan(planId)
      await loadBackupData()
    } catch (error) {
      console.error('Recovery test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBackupTypeIcon = (type: BackupType) => {
    switch (type) {
      case BT.FULL: return <Database className="h-4 w-4 text-blue-600" />
      case BT.INCREMENTAL: return <FileArchive className="h-4 w-4 text-green-600" />
      case BT.DIFFERENTIAL: return <HardDrive className="h-4 w-4 text-yellow-600" />
      case BT.TRANSACTION_LOG: return <Activity className="h-4 w-4 text-purple-600" />
      default: return <Database className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'running': return <Activity className="h-4 w-4 text-blue-600 animate-spin" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading && !backupData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Database className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Backup & Recovery Center</h1>
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
          <Database className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Backup & Recovery Center</h1>
        </div>
        <Button 
          onClick={() => handleBackup('critical_hourly')}
          disabled={loading}
        >
          {loading ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Backup Now
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupData?.stats?.totalBackups || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(backupData?.stats?.totalSize || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupData?.stats?.successRate?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Backups</CardTitle>
            <Activity className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupData?.stats?.activeBackups || 0}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Targets</CardTitle>
            <Server className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupData?.stats?.configuredTargets || 0}</div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Objectives */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Objectives</CardTitle>
          <CardDescription>Current recovery time and point objectives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.floor((backupData?.objectives?.rto || 0) / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">RTO (Recovery Time)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.floor((backupData?.objectives?.rpo || 0) / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">RPO (Recovery Point)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {Math.floor((backupData?.objectives?.maxDowntime || 0) / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">Max Downtime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.floor((backupData?.objectives?.dataLossThreshold || 0) / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">Data Loss Threshold</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="restore">Restore</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Plans</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Health */}
            <Card>
              <CardHeader>
                <CardTitle>Backup Health Status</CardTitle>
                <CardDescription>Current status of backup systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Health:</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Healthy</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Success Rate:</span>
                    <span>{backupData?.stats?.successRate?.toFixed(0) || 0}%</span>
                  </div>
                  <Progress value={backupData?.stats?.successRate || 0} className="h-2" />
                  <div className="flex items-center justify-between">
                    <span>Avg Backup Time:</span>
                    <span>{backupData?.stats?.averageBackupTime || 0}s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Backup Activity</CardTitle>
                <CardDescription>Latest backup operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backupData?.history?.slice(0, 5).map((backup, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      {getStatusIcon(backup.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {getBackupTypeIcon(backup.type)}
                          <span className="font-medium capitalize">{backup.type} Backup</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.startTime).toLocaleDateString()} - {formatBytes(backup.size)}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No recent backup activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          {/* Backup Configurations */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Configurations</CardTitle>
              <CardDescription>Scheduled backup jobs and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupData?.configs?.map((config, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          {getBackupTypeIcon(config.type)}
                          <span>{config.name}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{config.schedule}</Badge>
                          <Button
                            size="sm"
                            onClick={() => handleBackup(config.id)}
                            disabled={loading}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run Now
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Type:</span>
                          <p className="text-muted-foreground capitalize">{config.type}</p>
                        </div>
                        <div>
                          <span className="font-medium">Schedule:</span>
                          <p className="text-muted-foreground capitalize">{config.schedule}</p>
                        </div>
                        <div>
                          <span className="font-medium">Retention:</span>
                          <p className="text-muted-foreground">{config.retention.daily} days</p>
                        </div>
                        <div>
                          <span className="font-medium">Encryption:</span>
                          <p className="text-muted-foreground">{config.encryption ? 'Enabled' : 'Disabled'}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="font-medium text-sm">Targets:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.targets.map((target, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {target.name} ({target.type})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No backup configurations found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>Recent backup operations and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backupData?.history?.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          {getBackupTypeIcon(backup.type)}
                          <span className="font-medium capitalize">{backup.type}</span>
                          <Badge variant="outline">{backup.id}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.startTime).toLocaleString()}
                          {backup.endTime && ` - ${new Date(backup.endTime).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{formatBytes(backup.size)}</div>
                        <div className="text-sm text-muted-foreground">
                          {backup.encrypted && <Shield className="inline h-3 w-3 mr-1" />}
                          {backup.compressed && <FileArchive className="inline h-3 w-3 mr-1" />}
                          {backup.verified && <CheckCircle className="inline h-3 w-3" />}
                        </div>
                      </div>
                      {backup.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(backup.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No backup history available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Restore Operations</AlertTitle>
            <AlertDescription>
              Restore operations should be performed with caution. Always verify backup integrity before restoring.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Available Backups for Restore</CardTitle>
              <CardDescription>Select a backup to restore from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backupData?.history?.filter(b => b.status === 'completed').slice(0, 10).map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          {getBackupTypeIcon(backup.type)}
                          <span className="font-medium capitalize">{backup.type} Backup</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(backup.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{formatBytes(backup.size)}</div>
                        <div className="text-sm text-muted-foreground">
                          {backup.verified ? 'Verified' : 'Unverified'}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRestore(backup.id)}
                        disabled={loading}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No completed backups available for restore
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recovery Plans Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disaster Recovery Plans</CardTitle>
              <CardDescription>Predefined recovery procedures for different scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupData?.plans?.map((plan, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            plan.priority === 'critical' ? 'destructive' :
                            plan.priority === 'high' ? 'destructive' :
                            plan.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {plan.priority}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestRecovery(plan.id)}
                            disabled={loading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Triggers:</span>
                          <div className="text-muted-foreground mt-1">
                            {plan.triggers.map((trigger, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs mr-1 mb-1">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Steps:</span>
                          <p className="text-muted-foreground">{plan.procedures.length} procedures</p>
                        </div>
                        <div>
                          <span className="font-medium">Last Test:</span>
                          <p className="text-muted-foreground">
                            {new Date(plan.testing.lastTested).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <span className="font-medium text-sm">Emergency Contacts:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {plan.contacts.map((contact, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {contact.name} ({contact.role})
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {plan.testing.results.length > 0 && (
                        <div className="mt-3 p-2 bg-muted rounded">
                          <span className="font-medium text-sm">Latest Test Result:</span>
                          <div className="text-sm text-muted-foreground mt-1">
                            {plan.testing.results[plan.testing.results.length - 1].success ? (
                              <span className="text-green-600">✓ Successful</span>
                            ) : (
                              <span className="text-red-600">✗ Failed</span>
                            )}
                            {' - '}
                            RTO: {plan.testing.results[plan.testing.results.length - 1].rto.toFixed(0)}min
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No recovery plans configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery Settings</CardTitle>
              <CardDescription>Configure backup policies and recovery objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertTitle>Configuration Management</AlertTitle>
                <AlertDescription>
                  Backup and recovery settings are managed through the system configuration.
                  Contact your administrator to modify backup policies and recovery objectives.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}