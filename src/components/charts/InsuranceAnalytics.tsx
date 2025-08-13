'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  DollarSign,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonAnalytics } from '@/components/ui/loading'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  ComposedChart,
  RadialBarChart,
  RadialBar
} from 'recharts'

// Mock data for insurance analytics (replace with real API data)
const mockClaimsData = [
  { month: 'Jan', approved: 120, pending: 35, rejected: 8, total: 163, revenue: 2400000 },
  { month: 'Feb', approved: 145, pending: 42, rejected: 12, total: 199, revenue: 2900000 },
  { month: 'Mar', approved: 132, pending: 28, rejected: 15, total: 175, revenue: 2640000 },
  { month: 'Apr', approved: 167, pending: 51, rejected: 9, total: 227, revenue: 3340000 },
  { month: 'May', approved: 189, pending: 38, rejected: 18, total: 245, revenue: 3780000 },
  { month: 'Jun', approved: 203, pending: 45, rejected: 11, total: 259, revenue: 4060000 }
]

const mockCostAnalysis = [
  { category: 'Water Damage', claims: 45, avgCost: 12500, totalCost: 562500, trend: 'up', color: '#8884d8' },
  { category: 'Fire Damage', claims: 12, avgCost: 45000, totalCost: 540000, trend: 'down', color: '#82ca9d' },
  { category: 'Storm Damage', claims: 38, avgCost: 8200, totalCost: 311600, trend: 'up', color: '#ffc658' },
  { category: 'Theft', claims: 23, avgCost: 3400, totalCost: 78200, trend: 'stable', color: '#ff7300' },
  { category: 'Vandalism', claims: 16, avgCost: 2800, totalCost: 44800, trend: 'down', color: '#00ff88' }
]

const mockRegionalData = [
  { region: 'London', claims: 156, avgProcessTime: 12.5, satisfaction: 4.2, revenue: 2450000 },
  { region: 'Manchester', claims: 89, avgProcessTime: 10.8, satisfaction: 4.5, revenue: 1340000 },
  { region: 'Birmingham', claims: 73, avgProcessTime: 11.2, satisfaction: 4.3, revenue: 1120000 },
  { region: 'Leeds', claims: 45, avgProcessTime: 9.7, satisfaction: 4.6, revenue: 780000 },
  { region: 'Newcastle', claims: 34, avgProcessTime: 11.8, satisfaction: 4.1, revenue: 560000 }
]

const mockSLAMetrics = [
  { metric: 'Initial Response', target: 2, actual: 1.8, unit: 'hours', status: 'good' },
  { metric: 'Assessment Complete', target: 48, actual: 52, unit: 'hours', status: 'warning' },
  { metric: 'Settlement Time', target: 14, actual: 11, unit: 'days', status: 'good' },
  { metric: 'Customer Satisfaction', target: 4.0, actual: 4.3, unit: '/5.0', status: 'excellent' }
]

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

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Professional Chart Components using Recharts
const EnhancedAreaChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <defs>
        <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="month" className="text-xs" />
      <YAxis className="text-xs" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Area 
        type="monotone" 
        dataKey="approved" 
        stackId="1"
        stroke="#8884d8" 
        fillOpacity={1} 
        fill="url(#colorApproved)" 
        name="Approved"
      />
      <Area 
        type="monotone" 
        dataKey="pending" 
        stackId="1"
        stroke="#ffc658" 
        fillOpacity={1} 
        fill="url(#colorPending)" 
        name="Pending"
      />
    </AreaChart>
  </ResponsiveContainer>
)

const EnhancedPieChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsPieChart>
      <Pie
        dataKey="totalCost"
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={5}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip />} />
      <Legend />
    </RechartsPieChart>
  </ResponsiveContainer>
)

const EnhancedBarChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="month" className="text-xs" />
      <YAxis className="text-xs" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="approved" fill="#8884d8" name="Approved" />
      <Bar dataKey="pending" fill="#ffc658" name="Pending" />
      <Bar dataKey="rejected" fill="#ff7c7c" name="Rejected" />
    </RechartsBarChart>
  </ResponsiveContainer>
)

const EnhancedComposedChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={350}>
    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="month" className="text-xs" />
      <YAxis yAxisId="left" className="text-xs" />
      <YAxis yAxisId="right" orientation="right" className="text-xs" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar yAxisId="left" dataKey="total" fill="#8884d8" name="Total Claims" />
      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ff7300" strokeWidth={3} name="Revenue (£)" />
    </ComposedChart>
  </ResponsiveContainer>
)

interface InsuranceAnalyticsProps {
  className?: string
}

export function InsuranceAnalytics({ className }: InsuranceAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('6m')
  const [selectedView, setSelectedView] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const totalClaims = useMemo(() => 
    mockClaimsData.reduce((sum, month) => sum + month.total, 0), 
    []
  )

  const averageProcessingTime = useMemo(() => 
    mockRegionalData.reduce((sum, region) => sum + region.avgProcessTime, 0) / mockRegionalData.length,
    []
  )

  const totalRevenue = useMemo(() => 
    mockCostAnalysis.reduce((sum, category) => sum + category.totalCost, 0),
    []
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }
  
  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (initialLoading) {
    return <SkeletonAnalytics className={className} />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Insurance Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                <p className="text-3xl font-bold">{totalClaims.toLocaleString()}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12% from last period
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
                <p className="text-3xl font-bold">{averageProcessingTime.toFixed(1)}<span className="text-lg">d</span></p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -8% improvement
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCompactCurrency(totalRevenue)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +15% growth
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                <p className="text-3xl font-bold">94.2<span className="text-lg">%</span></p>
                <p className="text-sm text-orange-600 flex items-center mt-1">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Below target (95%)
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims">Claims Analysis</TabsTrigger>
          <TabsTrigger value="regional">Regional Performance</TabsTrigger>
          <TabsTrigger value="sla">SLA Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claims Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Claims Trend
                </CardTitle>
                <CardDescription>Monthly claims volume and status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedAreaChart data={mockClaimsData} />
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Cost Analysis
                </CardTitle>
                <CardDescription>Claims cost distribution by damage type</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPieChart data={mockCostAnalysis} />
                <div className="mt-6 space-y-2">
                  {mockCostAnalysis.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCompactCurrency(item.totalCost)}</div>
                        <div className="text-sm text-muted-foreground">{item.claims} claims</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Combined Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Claims Volume & Revenue Analysis
              </CardTitle>
              <CardDescription>Combined view of claims processing and revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedComposedChart data={mockClaimsData} />
            </CardContent>
          </Card>
          
          {/* Detailed Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Monthly Claims Breakdown
              </CardTitle>
              <CardDescription>Detailed status breakdown of monthly claims</CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedBarChart data={mockClaimsData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {mockCostAnalysis.map((category, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{category.category}</h3>
                      <Badge variant={
                        category.trend === 'up' ? 'destructive' : 
                        category.trend === 'down' ? 'default' : 'secondary'
                      }>
                        {category.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                        {category.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                        {category.trend}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Claims</div>
                        <div className="text-2xl font-bold">{category.claims}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Cost</div>
                        <div className="text-2xl font-bold">{formatCompactCurrency(category.avgCost)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground text-sm">Total Cost</div>
                      <div className="text-lg font-semibold">{formatCompactCurrency(category.totalCost)}</div>
                      <Progress value={(category.totalCost / totalRevenue) * 100} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
              <CardDescription>Performance metrics by geographical region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRegionalData.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                        {region.region.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{region.region}</div>
                        <div className="text-sm text-muted-foreground">{region.claims} claims processed</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Process Time</div>
                        <div className="font-semibold">{region.avgProcessTime}d</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Satisfaction</div>
                        <div className="font-semibold">{region.satisfaction}/5.0</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="font-semibold">{formatCompactCurrency(region.revenue)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {mockSLAMetrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{metric.metric}</h3>
                      <Badge variant={
                        metric.status === 'excellent' ? 'default' :
                        metric.status === 'good' ? 'secondary' :
                        metric.status === 'warning' ? 'destructive' : 'secondary'
                      }>
                        {metric.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Target: {metric.target}{metric.unit}</span>
                        <span>Actual: {metric.actual}{metric.unit}</span>
                      </div>
                      <Progress 
                        value={Math.min((metric.actual / metric.target) * 100, 100)} 
                        className={cn(
                          "h-3",
                          metric.status === 'warning' && "[&>div]:bg-orange-500",
                          metric.status === 'excellent' && "[&>div]:bg-green-500"
                        )}
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Performance: {metric.actual < metric.target ? 'Above target' : 
                                  metric.actual === metric.target ? 'On target' : 'Below target'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}