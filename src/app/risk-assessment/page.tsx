'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useRiskAssessments,
  RISK_LEVELS,
  getRiskLevelColor,
  getRiskLevelLabel,
  type EnhancedRiskAssessment,
  type RiskFilters
} from '@/hooks/useCompliance'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Plus,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  BarChart3,
  PieChart,
  Target,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const RISK_CATEGORIES = [
  { value: 'operational', label: 'Operational', color: 'bg-blue-500' },
  { value: 'conduct', label: 'Conduct', color: 'bg-purple-500' },
  { value: 'financial', label: 'Financial', color: 'bg-green-500' },
  { value: 'regulatory', label: 'Regulatory', color: 'bg-red-500' },
  { value: 'reputational', label: 'Reputational', color: 'bg-orange-500' },
  { value: 'strategic', label: 'Strategic', color: 'bg-gray-500' }
] as const

// Risk assessment card component
function RiskAssessmentCard({ 
  assessment, 
  onView 
}: { 
  assessment: EnhancedRiskAssessment
  onView: () => void
}) {
  const category = RISK_CATEGORIES.find(cat => cat.value === assessment.assessment_type) || { value: assessment.assessment_type, label: assessment.assessment_type, color: 'bg-gray-500' }
  const reviewDate = assessment.review_date ? parseISO(assessment.review_date) : null
  const isOverdue = reviewDate ? reviewDate < new Date() : false
  const riskReduction = false // Cannot determine without inherent vs residual risk fields

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      isOverdue && "border-orange-200 bg-orange-50/50",
      assessment.risk_level === 'critical' && "border-red-300 bg-red-50/50",
      assessment.risk_level === 'high' && "border-orange-200 bg-orange-50/30"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs text-white", category?.color)}>
                  {category?.label}
                </Badge>
                <Badge className={cn("text-xs text-white", getRiskLevelColor(assessment.risk_level))}>
                  {getRiskLevelLabel(assessment.risk_level)} Risk
                </Badge>
                {riskReduction && (
                  <Badge variant="secondary" className="text-xs">
                    Mitigated
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-2">
                {Array.isArray(assessment.identified_risks) ? assessment.identified_risks.join(', ') : 'Risk assessment details'}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assessment Type:</span>
              <Badge variant="secondary" className="text-xs">
                {category.label}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={assessment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {assessment.status}
              </Badge>
            </div>

            {reviewDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Review Date:</span>
                <span className={isOverdue ? "text-orange-600 font-medium" : ""}>
                  {format(reviewDate, 'MMM d, yyyy')}
                  {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                </span>
              </div>
            )}
          </div>

          {assessment.risk_level === 'critical' || assessment.risk_level === 'high' && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="w-3 h-3" />
              <span>High risk - mitigation required</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            {assessment.project && (
              <Badge variant="secondary" className="text-xs">
                {assessment.project.name}
              </Badge>
            )}
            
            {assessment.assessor_user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-xs">
                    {assessment.assessor_user.first_name?.[0]}{assessment.assessor_user.surname?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{assessment.assessor_user.first_name} {assessment.assessor_user.surname}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Risk metrics component
function RiskMetricsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: number | string
  change?: { value: number; trend: 'up' | 'down' }
  icon: any
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            {change && (
              <div className={cn("flex items-center gap-1 text-xs mt-1", 
                change.trend === 'up' ? "text-red-600" : "text-green-600"
              )}>
                {change.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{change.value}% vs last month</span>
              </div>
            )}
          </div>
          <Icon className={cn("w-8 h-8", color)} />
        </div>
      </CardContent>
    </Card>
  )
}

// Risk heat map component
function RiskHeatMap({ assessments }: { assessments: EnhancedRiskAssessment[] }) {
  const categoryRisks = useMemo(() => {
    const risks = RISK_CATEGORIES.map(category => {
      const categoryAssessments = assessments.filter(a => a.risk_category === category.value)
      const avgRisk = categoryAssessments.length > 0 
        ? categoryAssessments.reduce((sum, a) => {
            const riskValue = RISK_LEVELS.findIndex(r => r.value === a.residual_risk) + 1
            return sum + riskValue
          }, 0) / categoryAssessments.length
        : 0

      return {
        ...category,
        count: categoryAssessments.length,
        avgRisk: Math.round(avgRisk),
        riskLevel: RISK_LEVELS[Math.round(avgRisk) - 1]?.value || 'very_low'
      }
    })

    return risks.filter(r => r.count > 0)
  }, [assessments])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Risk Heat Map
        </CardTitle>
        <CardDescription>Risk distribution across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categoryRisks.map(category => (
            <div key={category.value} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", category.color)} />
                  <span className="text-sm font-medium">{category.label}</span>
                  <Badge variant="secondary" className="text-xs">{category.count}</Badge>
                </div>
                <Badge className={cn("text-xs", getRiskLevelColor(category.riskLevel))}>
                  {getRiskLevelLabel(category.riskLevel)}
                </Badge>
              </div>
              <Progress 
                value={(category.avgRisk / RISK_LEVELS.length) * 100} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function RiskAssessmentPage() {
  const { user } = useUser()
  
  const [filters, setFilters] = useState<Partial<RiskFilters>>({
    search: '',
    category: [],
    inherentRisk: [],
    residualRisk: []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [viewAssessment, setViewAssessment] = useState<EnhancedRiskAssessment | null>(null)

  // Data fetching
  const riskAssessmentsQuery = useRiskAssessments(filters)
  const assessments = riskAssessmentsQuery.data || []
  const isLoading = riskAssessmentsQuery.isLoading

  // Statistics
  const stats = useMemo(() => {
    const totalRisks = assessments.length
    const criticalRisks = assessments.filter(a => a.residual_risk === 'critical').length
    const highRisks = assessments.filter(a => a.residual_risk === 'high').length
    const actionRequired = assessments.filter(a => a.action_required).length
    const overdueReviews = assessments.filter(a => parseISO(a.next_review_date) < new Date()).length
    const effectiveControls = assessments.filter(a => a.control_effectiveness === 'effective').length
    const controlEffectiveness = totalRisks > 0 ? Math.round((effectiveControls / totalRisks) * 100) : 0
    const averageRisk = totalRisks > 0 
      ? assessments.reduce((sum, a) => {
          const riskValue = RISK_LEVELS.findIndex(r => r.value === a.residual_risk) + 1
          return sum + riskValue
        }, 0) / totalRisks
      : 0

    return {
      totalRisks,
      criticalRisks,
      highRisks,
      actionRequired,
      overdueReviews,
      controlEffectiveness,
      averageRiskLevel: RISK_LEVELS[Math.round(averageRisk) - 1]?.label || 'Very Low'
    }
  }, [assessments])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Risk Assessment</h1>
            <p className="text-muted-foreground">
              Monitor and assess organizational risks across all categories
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => riskAssessmentsQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <RiskMetricsCard
            title="Total Risk Assessments"
            value={stats.totalRisks}
            icon={Shield}
            color="text-blue-600"
          />
          
          <RiskMetricsCard
            title="Critical Risks"
            value={stats.criticalRisks}
            change={{ value: 12, trend: 'up' }}
            icon={Zap}
            color="text-red-600"
          />
          
          <RiskMetricsCard
            title="High Risks"
            value={stats.highRisks}
            change={{ value: 5, trend: 'down' }}
            icon={AlertTriangle}
            color="text-orange-600"
          />
          
          <RiskMetricsCard
            title="Action Required"
            value={stats.actionRequired}
            icon={Target}
            color="text-purple-600"
          />
          
          <RiskMetricsCard
            title="Control Effectiveness"
            value={`${stats.controlEffectiveness}%`}
            change={{ value: 8, trend: 'up' }}
            icon={CheckCircle}
            color="text-green-600"
          />
          
          <RiskMetricsCard
            title="Average Risk Level"
            value={stats.averageRiskLevel}
            icon={Activity}
            color="text-gray-600"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="assessments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assessments">
              <Shield className="w-4 h-4 mr-2" />
              Risk Assessments ({assessments.length})
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <BarChart3 className="w-4 h-4 mr-2" />
              Heat Map
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search risk assessments..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10 max-w-md"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>

                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by inherent risk" />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by residual risk" />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Assessments Grid */}
            {assessments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assessments.map((assessment) => (
                  <RiskAssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    onView={() => setViewAssessment(assessment)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No risk assessments found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first risk assessment to get started.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Risk Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskHeatMap assessments={assessments} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Risk Trend Analysis</CardTitle>
                  <CardDescription>Risk levels over time</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Trend analysis coming soon</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Breakdown by risk level and category</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <PieChart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Risk analytics coming soon</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Control Effectiveness</CardTitle>
                  <CardDescription>Assessment of risk mitigation controls</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Control analysis coming soon</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}