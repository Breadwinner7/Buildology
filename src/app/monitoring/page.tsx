'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Monitor, 
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Download
} from 'lucide-react'

// Monitoring dashboard for comprehensive system oversight
export default function MonitoringPage() {
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMonitoringData()
    const interval = setInterval(loadMonitoringData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadMonitoringData = async () => {
    try {
      setIsLoading(true)

      // Load system health
      const healthResponse = await fetch('/api/health')
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setSystemHealth(healthData)
      }

      // Load metrics
      const metricsResponse = await fetch('/api/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics([metricsData])
      }

      // Load analytics summary
      const analyticsResponse = await fetch('/api/analytics?type=summary')
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.data)
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Monitor className="h-5 w-5 text-muted-foreground" />
    }
  }

  const exportMetrics = async () => {
    try {
      const response = await fetch('/api/metrics?format=prometheus')
      const metrics = await response.text()
      
      const blob = new Blob([metrics], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `buildology-metrics-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export metrics:', error)
    }
  }

  if (isLoading && !systemHealth) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-lg font-medium">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for Buildology platform
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export Metrics
          </Button>
          <Button onClick={loadMonitoringData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getHealthIcon(systemHealth.status)}
              <span>System Health</span>
              <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                {systemHealth.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Last updated: {lastUpdated.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(systemHealth.checks).map(([check, data]: [string, any]) => (
                <div key={check} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{check.replace('_', ' ')}</span>
                    <Badge variant={data.status === 'healthy' ? 'default' : 'destructive'}>
                      {data.status}
                    </Badge>
                  </div>
                  {data.responseTime && (
                    <p className="text-sm text-muted-foreground">
                      Response: {data.responseTime}
                    </p>
                  )}
                  {data.value && (
                    <p className="text-sm text-muted-foreground">
                      {data.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Health Score</span>
                <span className="text-sm text-muted-foreground">
                  Uptime: {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                </span>
              </div>
              <Progress 
                value={systemHealth.status === 'healthy' ? 100 : systemHealth.status === 'warning' ? 75 : 25} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Zap className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Users className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Metrics</CardTitle>
                <CardDescription>Core system performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {metrics[0].system?.uptime ? Math.floor(metrics[0].system.uptime / 3600) : 0}h
                        </div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {metrics[0].database?.projects || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Projects</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Memory Usage</span>
                        <span className="text-sm">
                          {metrics[0].system?.memory ? 
                            `${(metrics[0].system.memory.heapUsed / 1024 / 1024).toFixed(1)}MB` : 
                            'N/A'
                          }
                        </span>
                      </div>
                      <Progress 
                        value={metrics[0].system?.memory ? 
                          (metrics[0].system.memory.heapUsed / metrics[0].system.memory.heapTotal) * 100 : 
                          0
                        } 
                        className="h-2"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No metrics available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
                <CardDescription>API endpoint performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Response</span>
                    <span className="text-sm text-green-600">
                      {metrics[0]?.application?.responseTime || 0}ms
                    </span>
                  </div>
                  <div className="text-center p-8 border rounded-lg">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">
                      Performance metrics are being collected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
                <CardDescription>Connection status and query performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connection Status</span>
                    <Badge variant={
                      systemHealth?.checks?.database?.status === 'healthy' ? 'default' : 'destructive'
                    }>
                      {systemHealth?.checks?.database?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics[0]?.database?.projects || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Projects</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {metrics[0]?.database?.activeProjects || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Projects</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>Database operation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8 border rounded-lg">
                  <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">
                    Query monitoring active - metrics collected in real-time
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Web Vitals</CardTitle>
                <CardDescription>Core web performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8 border rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-sm text-muted-foreground">
                    Web Vitals monitoring initialized - data collected on page interactions
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>System resource consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Memory</span>
                      <span className="text-sm">
                        {systemHealth?.checks?.memory?.heapUsed || 'N/A'}
                      </span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm text-green-600">Good</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Analytics</CardTitle>
                <CardDescription>User behavior and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.topPages?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Popular Pages</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.recentEngagements || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Recent Events</div>
                      </div>
                    </div>
                    {analytics.topErrors && analytics.topErrors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Top Errors</h4>
                        <div className="space-y-2">
                          {analytics.topErrors.slice(0, 3).map(([error, count]: [string, number], index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-red-600">{error}</span>
                              <Badge variant="destructive">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">
                      Analytics data is being collected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
                <CardDescription>Key business indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    Business events tracking initialized
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}