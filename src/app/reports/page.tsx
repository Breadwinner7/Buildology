'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  PoundSterling,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Building2,
  Zap,
  RefreshCw,
  Filter,
  Eye,
  PieChart,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Mock data for reports and analytics
const mockAnalyticsData = {
  overview: {
    totalProjects: 156,
    activeProjects: 42,
    completedProjects: 114,
    totalValue: 2840000,
    avgProjectValue: 18205,
    completionRate: 73.1,
    customerSatisfaction: 4.6
  },
  monthlyTrends: [
    { month: 'Jan', projects: 12, value: 220000, claims: 8 },
    { month: 'Feb', projects: 15, value: 280000, claims: 11 },
    { month: 'Mar', projects: 18, value: 320000, claims: 9 },
    { month: 'Apr', projects: 14, value: 290000, claims: 12 },
    { month: 'May', projects: 22, value: 380000, claims: 7 },
    { month: 'Jun', projects: 19, value: 340000, claims: 15 }
  ],
  projectsByStatus: [
    { status: 'Works in Progress', count: 28, value: 520000, color: 'bg-blue-500' },
    { status: 'Planning', count: 8, value: 180000, color: 'bg-purple-500' },
    { status: 'Survey Booked', count: 6, value: 140000, color: 'bg-orange-500' },
    { status: 'On Hold', count: 3, value: 45000, color: 'bg-yellow-500' },
    { status: 'Completed', count: 114, value: 1955000, color: 'bg-green-500' }
  ],
  topPerformers: [
    { name: 'Sarah Johnson', role: 'Claims Manager', projects: 24, value: 450000, rating: 4.8 },
    { name: 'Michael Chen', role: 'Surveyor', projects: 19, value: 380000, rating: 4.7 },
    { name: 'Emma Thompson', role: 'Project Manager', projects: 16, value: 320000, rating: 4.6 },
    { name: 'David Wilson', role: 'Contractor', projects: 14, value: 290000, rating: 4.5 }
  ]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}k`
  }
  return formatCurrency(amount)
}

function ReportsAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('last-6-months')
  const [selectedView, setSelectedView] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setRefreshing(false)
  }

  const { overview } = mockAnalyticsData

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Reports & Analytics</h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive insights into your project performance and business metrics
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-3-months">Last 3 months</SelectItem>
                <SelectItem value="last-6-months">Last 6 months</SelectItem>
                <SelectItem value="last-12-months">Last 12 months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-3xl font-bold">{overview.totalProjects}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.activeProjects} active
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold">{formatCompactCurrency(overview.totalValue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <p className="text-xs text-green-600">+12.5% vs last period</p>
                  </div>
                </div>
                <PoundSterling className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold">{overview.completionRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-purple-500" />
                    <p className="text-xs text-purple-600">+2.1% vs target</p>
                  </div>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                  <p className="text-3xl font-bold">{overview.customerSatisfaction}/5</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-orange-500" />
                    <p className="text-xs text-orange-600">Excellent rating</p>
                  </div>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <PoundSterling className="w-4 h-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Project Status Distribution
                  </CardTitle>
                  <CardDescription>Current status breakdown across all projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAnalyticsData.projectsByStatus.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded ${item.color}`} />
                          <span className="text-sm font-medium">{item.status}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{item.count}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCompactCurrency(item.value)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Monthly Performance Trends
                  </CardTitle>
                  <CardDescription>Project volume and value trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAnalyticsData.monthlyTrends.slice(-6).map((month, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium">{month.month}</div>
                          <div className="text-sm text-muted-foreground">
                            {month.projects} projects
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCompactCurrency(month.value)}</div>
                          <div className="text-xs text-muted-foreground">
                            {month.claims} claims
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Analytics</CardTitle>
                <CardDescription>Detailed insights into project performance and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Average Completion Time</span>
                    </div>
                    <div className="text-2xl font-bold">28 days</div>
                    <div className="text-xs text-muted-foreground">3 days faster than target</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">On-Time Delivery</span>
                    </div>
                    <div className="text-2xl font-bold">89%</div>
                    <div className="text-xs text-muted-foreground">Above industry average</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Risk Projects</span>
                    </div>
                    <div className="text-2xl font-bold">7</div>
                    <div className="text-xs text-muted-foreground">Require attention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Revenue, costs, and profitability analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCompactCurrency(overview.totalValue)}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">+15.2% YoY</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Avg Project Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(overview.avgProjectValue)}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600">+8.1% vs target</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Gross Margin</div>
                    <div className="text-2xl font-bold">34.5%</div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-purple-600">Healthy margin</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Outstanding</div>
                    <div className="text-2xl font-bold text-orange-600">£186k</div>
                    <div className="text-xs text-muted-foreground">12 invoices pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Team members delivering exceptional results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalyticsData.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {performer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium">{performer.name}</div>
                          <div className="text-sm text-muted-foreground">{performer.role}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold">{performer.projects} projects</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCompactCurrency(performer.value)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="text-xs font-medium">⭐ {performer.rating}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Report Actions</CardTitle>
            <CardDescription>Generate and download comprehensive reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                <FileText className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Monthly Summary</div>
                  <div className="text-sm text-muted-foreground">Comprehensive monthly report</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                <PoundSterling className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Financial Report</div>
                  <div className="text-sm text-muted-foreground">Revenue and cost analysis</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                <Users className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Team Performance</div>
                  <div className="text-sm text-muted-foreground">Individual and team metrics</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                <Target className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">KPI Dashboard</div>
                  <div className="text-sm text-muted-foreground">Key performance indicators</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withErrorBoundary(ReportsAnalytics)