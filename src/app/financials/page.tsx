'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  PoundSterling, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Building2,
  Calculator,
  CheckSquare,
  Clock,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  BarChart3,
  FileText,
  ArrowUpRight
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

// Types
interface ProjectFinancials {
  id: string
  project_id: string
  budget_total: number
  budget_allocated: number
  budget_spent: number
  budget_remaining: number
  contract_value: number
  invoice_total: number
  payment_received: number
  payment_outstanding: number
  currency: string
  created_at: string
  updated_at: string
  projects?: {
    name: string
    status: string
    contact_name?: string
  }
}

interface DashboardMetrics {
  totalProjects: number
  activeProjects: number
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  pendingTasks: number
  overdueTasks: number
  overdueInvoices: number
  pendingQuotes: number
  completedPayments: number
}

interface CreateProjectFinancialData {
  project_id: string
  budget_total: number
  budget_allocated: number
  contract_value: number
  currency: string
}

// API Functions
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    // Fetch projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status')

    // Fetch project financials
    const { data: financials } = await supabase
      .from('project_financials')
      .select('budget_total, budget_spent, budget_remaining')

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_date')

    // Fetch invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, status, due_date')

    // Fetch quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status')

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, status')

    // Calculate metrics
    const totalProjects = projects?.length || 0
    const activeProjects = projects?.filter(p => 
      ['works_in_progress', 'survey_booked', 'planning'].includes(p.status)
    ).length || 0

    const totalBudget = financials?.reduce((sum, f) => sum + (f.budget_total || 0), 0) || 0
    const totalSpent = financials?.reduce((sum, f) => sum + (f.budget_spent || 0), 0) || 0
    const totalRemaining = financials?.reduce((sum, f) => sum + (f.budget_remaining || 0), 0) || 0

    const pendingTasks = tasks?.filter(t => t.status !== 'done').length || 0
    const overdueTasks = tasks?.filter(t => 
      t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
    ).length || 0

    const overdueInvoices = invoices?.filter(i => 
      i.status === 'overdue' || (i.status === 'sent' && new Date(i.due_date) < new Date())
    ).length || 0

    const pendingQuotes = quotes?.filter(q => q.status === 'submitted').length || 0
    const completedPayments = payments?.filter(p => p.status === 'completed').length || 0

    return {
      totalProjects,
      activeProjects,
      totalBudget,
      totalSpent,
      totalRemaining,
      pendingTasks,
      overdueTasks,
      overdueInvoices,
      pendingQuotes,
      completedPayments
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return {
      totalProjects: 0,
      activeProjects: 0,
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      overdueInvoices: 0,
      pendingQuotes: 0,
      completedPayments: 0
    }
  }
}

const fetchProjectFinancials = async (): Promise<ProjectFinancials[]> => {
  const { data, error } = await supabase
    .from('project_financials')
    .select(`
      *,
      projects!inner (
        name,
        status,
        contact_name
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}

const fetchProjectsForDropdown = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .order('name')

  if (error) throw error
  return data || []
}

const createProjectFinancials = async (data: CreateProjectFinancialData) => {
  const { error } = await supabase
    .from('project_financials')
    .insert([{
      project_id: data.project_id,
      budget_total: data.budget_total,
      budget_allocated: data.budget_allocated,
      budget_spent: 0,
      contract_value: data.contract_value,
      invoice_total: 0,
      payment_received: 0,
      currency: data.currency
    }])

  if (error) throw error
}

// Utility functions
const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
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

// KPI Card Component
interface KPICardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'stable'
  description: string
  icon: React.ReactNode
  color: string
  onClick?: () => void
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  description,
  icon,
  color,
  onClick
}) => {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm transition-all hover:shadow-xl",
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      <div className={cn("absolute top-0 left-0 w-1 h-full", color)} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", color.replace('bg-', 'bg-').replace('-500', '-100'))}>
            {icon}
          </div>
          {change && trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-3 h-3 text-red-600" />
              ) : null}
              <span className={
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs font-medium">{title}</p>
          <p className="text-xs opacity-70">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Create Financial Data Dialog
const CreateFinancialDialog: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<CreateProjectFinancialData>({
    project_id: '',
    budget_total: 0,
    budget_allocated: 0,
    contract_value: 0,
    currency: 'GBP'
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: fetchProjectsForDropdown
  })

  const createMutation = useMutation({
    mutationFn: createProjectFinancials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['project-financials'] })
      toast({
        title: 'Success',
        description: 'Project financial data created successfully'
      })
      setOpen(false)
      setFormData({
        project_id: '',
        budget_total: 0,
        budget_allocated: 0,
        contract_value: 0,
        currency: 'GBP'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create financial data',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = () => {
    if (!formData.project_id || !formData.budget_total) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }
    createMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Project Financials
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project Financial Data</DialogTitle>
          <DialogDescription>
            Set up financial tracking for a project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={formData.project_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, project_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_total">Total Budget (£)</Label>
              <Input
                id="budget_total"
                type="number"
                value={formData.budget_total || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  budget_total: Number(e.target.value) 
                }))}
                placeholder="85000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_allocated">Allocated (£)</Label>
              <Input
                id="budget_allocated"
                type="number"
                value={formData.budget_allocated || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  budget_allocated: Number(e.target.value) 
                }))}
                placeholder="75000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_value">Contract Value (£)</Label>
            <Input
              id="contract_value"
              type="number"
              value={formData.contract_value || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                contract_value: Number(e.target.value) 
              }))}
              placeholder="82000"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Recent Financial Activity Component
const RecentFinancialActivity: React.FC<{ financials: ProjectFinancials[] }> = ({ financials }) => {
  if (!financials.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Financial Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No financial data available</p>
            <div className="mt-4">
              <CreateFinancialDialog />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Financial Activity</CardTitle>
          <CardDescription>Latest project financial updates</CardDescription>
        </div>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {financials.slice(0, 5).map((financial) => {
            const utilizationRate = financial.budget_total > 0 
              ? (financial.budget_spent / financial.budget_total) * 100 
              : 0

            return (
              <div key={financial.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{financial.projects?.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {financial.projects?.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Budget: {formatCurrency(financial.budget_total, financial.currency)}</span>
                    <span>Spent: {formatCurrency(financial.budget_spent, financial.currency)}</span>
                    <span className={utilizationRate > 90 ? 'text-amber-600' : 'text-green-600'}>
                      {utilizationRate.toFixed(1)}% used
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Financial Health Overview
const FinancialHealthOverview: React.FC<{ financials: ProjectFinancials[] }> = ({ financials }) => {
  const healthyProjects = financials.filter(f => f.budget_remaining > 0).length
  const atRiskProjects = financials.filter(f => f.budget_remaining < 0).length
  const totalProjects = financials.length

  const avgBudgetUtilization = financials.length > 0 
    ? financials.reduce((sum, f) => sum + (f.budget_total > 0 ? (f.budget_spent / f.budget_total) * 100 : 0), 0) / financials.length
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Health Overview</CardTitle>
        <CardDescription>{totalProjects} projects with financial tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-green-600">{healthyProjects}</p>
            <p className="text-xs text-muted-foreground">Healthy</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{totalProjects - healthyProjects - atRiskProjects}</p>
            <p className="text-xs text-muted-foreground">Watch List</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-red-600">{atRiskProjects}</p>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Average Budget Utilization</span>
            <span className="font-medium">{avgBudgetUtilization.toFixed(1)}%</span>
          </div>
          <Progress value={avgBudgetUtilization} className="h-2" />
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Quick Actions</span>
          <div className="flex gap-2">
            <CreateFinancialDialog />
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export default function RealDashboardPage() {
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Data fetching
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  })

  const { data: financials = [], isLoading: financialsLoading, error: financialsError, refetch: refetchFinancials } = useQuery({
    queryKey: ['project-financials'],
    queryFn: fetchProjectFinancials,
    staleTime: 5 * 60 * 1000
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchMetrics(), refetchFinancials()])
      toast({
        title: 'Dashboard Refreshed',
        description: 'All data has been updated'
      })
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Some data could not be refreshed',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const isLoading = metricsLoading || financialsLoading
  const hasErrors = metricsError || financialsError

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time overview of your construction projects and finances
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <CreateFinancialDialog />
          </div>
        </div>

        {/* Error Display */}
        {hasErrors && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Some data could not be loaded</p>
                  <p className="text-sm">Showing available data. Check your connection and try refreshing.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <KPICard
            title="Total Budget"
            value={formatCompactCurrency(metrics?.totalBudget || 0)}
            change={`${metrics?.totalProjects || 0} projects`}
            trend="stable"
            description="Across all active projects"
            icon={<PoundSterling className="w-5 h-5 text-blue-600" />}
            color="bg-blue-500"
          />

          <KPICard
            title="Budget Spent"
            value={formatCompactCurrency(metrics?.totalSpent || 0)}
            change={metrics?.totalBudget ? `${((metrics.totalSpent / metrics.totalBudget) * 100).toFixed(1)}%` : '0%'}
            trend={metrics?.totalSpent && metrics?.totalBudget && (metrics.totalSpent / metrics.totalBudget) > 0.8 ? 'down' : 'up'}
            description="Of total allocated budget"
            icon={<Calculator className="w-5 h-5 text-orange-600" />}
            color="bg-orange-500"
          />

          <KPICard
            title="Active Projects"
            value={metrics?.activeProjects || 0}
            change={`${metrics?.totalProjects || 0} total`}
            trend="up"
            description="Projects currently in progress"
            icon={<Building2 className="w-5 h-5 text-green-600" />}
            color="bg-green-500"
          />

          <KPICard
            title="Pending Items"
            value={metrics?.pendingTasks || 0}
            change={`${metrics?.overdueTasks || 0} overdue`}
            trend={metrics?.overdueTasks && metrics.overdueTasks > 0 ? 'down' : 'up'}
            description="Tasks requiring attention"
            icon={<CheckSquare className="w-5 h-5 text-purple-600" />}
            color="bg-purple-500"
          />
        </div>

        {/* Alert Cards */}
        {(metrics?.overdueInvoices && metrics.overdueInvoices > 0) || (metrics?.pendingQuotes && metrics.pendingQuotes > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.overdueInvoices > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">{metrics.overdueInvoices} Overdue Invoice{metrics.overdueInvoices !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-red-700">Require immediate attention</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {metrics.pendingQuotes > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{metrics.pendingQuotes} Pending Quote{metrics.pendingQuotes !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-blue-700">Awaiting approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <RecentFinancialActivity financials={financials} />
          </div>
          <div className="space-y-6">
            <FinancialHealthOverview financials={financials} />
          </div>
        </div>
      </div>
    </div>
  )
}