'use client'

import React, { useState, useMemo } from 'react'
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

// Mock data for insurance analytics (replace with real API data)
const mockClaimsData = [
  { month: 'Jan', approved: 120, pending: 35, rejected: 8, total: 163 },
  { month: 'Feb', approved: 145, pending: 42, rejected: 12, total: 199 },
  { month: 'Mar', approved: 132, pending: 28, rejected: 15, total: 175 },
  { month: 'Apr', approved: 167, pending: 51, rejected: 9, total: 227 },
  { month: 'May', approved: 189, pending: 38, rejected: 18, total: 245 },
  { month: 'Jun', approved: 203, pending: 45, rejected: 11, total: 259 }
]

const mockCostAnalysis = [
  { category: 'Water Damage', claims: 45, avgCost: 12500, totalCost: 562500, trend: 'up' },
  { category: 'Fire Damage', claims: 12, avgCost: 45000, totalCost: 540000, trend: 'down' },
  { category: 'Storm Damage', claims: 38, avgCost: 8200, totalCost: 311600, trend: 'up' },
  { category: 'Theft', claims: 23, avgCost: 3400, totalCost: 78200, trend: 'stable' },
  { category: 'Vandalism', claims: 16, avgCost: 2800, totalCost: 44800, trend: 'down' }
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

// Simple Chart Components (for production, use a proper charting library like Recharts or Chart.js)
const SimpleBarChart = ({ data, height = 200 }: { data: any[]; height?: number }) => (
  <div className="flex items-end gap-2 h-48 p-4">
    {data.map((item, index) => (
      <div key={index} className="flex-1 flex flex-col items-center gap-2">
        <div className="relative w-full bg-muted rounded-t-lg" style={{ height: height }}>
          <div 
            className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all duration-300"
            style={{ height: `${(item.total / Math.max(...data.map(d => d.total))) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium">{item.month}</span>
        <span className="text-xs text-muted-foreground">{item.total}</span>
      </div>
    ))}
  </div>
)

const SimpleLineChart = ({ data, height = 150 }: { data: any[]; height?: number }) => {
  const maxValue = Math.max(...data.map(d => d.approved))
  return (
    <div className="relative h-36 p-4">
      <svg width="100%" height="100%" className="overflow-visible">
        <polyline
          fill="none"
          stroke="rgb(59 130 246)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={data.map((item, index) => 
            `${(index / (data.length - 1)) * 100},${100 - (item.approved / maxValue) * 80}`
          ).join(' ')}
          transform="scale(1, 1)"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((item, index) => (
          <circle
            key={index}
            cx={`${(index / (data.length - 1)) * 100}%`}
            cy={`${100 - (item.approved / maxValue) * 80}%`}
            r="4"
            fill="rgb(59 130 246)"
            className="drop-shadow-sm"
          />
        ))}
      </svg>
    </div>
  )
}

interface InsuranceAnalyticsProps {
  className?: string
}

export function InsuranceAnalytics({ className }: InsuranceAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('6m')
  const [selectedView, setSelectedView] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

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

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <CardDescription>Monthly claims volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart data={mockClaimsData} />
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Approved Claims</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Cost Analysis
                </CardTitle>
                <CardDescription>Claims cost by damage type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCostAnalysis.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          index === 0 && "bg-blue-500",
                          index === 1 && "bg-purple-500", 
                          index === 2 && "bg-green-500",
                          index === 3 && "bg-orange-500",
                          index === 4 && "bg-red-500"
                        )} />
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

          {/* Monthly Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Monthly Claims Volume
              </CardTitle>
              <CardDescription>Comprehensive view of claims processing</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={mockClaimsData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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