'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, 
  Building2, Users, Calendar, PoundSterling, MessageSquare,
  FileText, Camera, MapPin, Phone, Mail, Settings, Plus,
  Activity, Target, Zap, BarChart3, ArrowRight, RefreshCw,
  Bell, Star, Filter, Search, Download, Eye, HardHat,
  Wrench, Home, AlertCircle, CheckSquare, UserCircle,
  DollarSign, Percent, Calculator, TrendingDown as Warning
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// Types for real data
interface ProjectFinancial {
  id: string
  project_id: string
  budget_total: number
  budget_allocated: number
  budget_spent: number
  budget_remaining: number
  currency: string
  last_updated: string
  projects: {
    name: string
    status: string
    client_name?: string
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
  recentMessages: number
  criticalIssues: number
}

interface KPIData {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  description: string
  color: string
}

// Custom hooks for real data with better error handling
function useFinancialData() {
  const [financials, setFinancials] = useState<ProjectFinancial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFinancials() {
      try {
        setError(null)
        
        // First check if table exists and has data
        const { data, error } = await supabase
          .from('project_financials')
          .select(`
            id,
            project_id,
            budget_total,
            budget_allocated,
            budget_spent,
            budget_remaining,
            currency,
            last_updated,
            projects!inner (
              name,
              status,
              client_name
            )
          `)
          .order('last_updated', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Supabase error:', error)
          
          // If table doesn't exist, provide fallback
          if (error.message?.includes('relation "project_financials" does not exist')) {
            setError('Project financials table not found - using sample data')
            setFinancials([])
          } else {
            setError(`Database error: ${error.message}`)
          }
        } else {
          setFinancials(data || [])
        }
      } catch (err) {
        console.error('Error fetching financial data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchFinancials()
  }, [])

  return { financials, loading, error, refetch: () => setLoading(true) }
}

function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setError(null)
        
        // Fetch basic project data (this table definitely exists)
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, status, created_at')

        if (projectsError) {
          throw new Error(`Projects error: ${projectsError.message}`)
        }

        // Fetch tasks data
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, status, due_date, created_at')

        if (tasksError) {
          console.warn('Tasks error:', tasksError.message)
        }

        // Fetch messages data
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, read_status, created_at')

        if (messagesError) {
          console.warn('Messages error:', messagesError.message)
        }

        // Try to fetch financial data for totals
        const { data: financialData, error: financialError } = await supabase
          .from('project_financials')
          .select('budget_total, budget_spent, budget_remaining')

        if (financialError) {
          console.warn('Financial data not available:', financialError.message)
        }

        // Calculate metrics from available data
        const totalProjects = projects?.length || 0
        const activeProjects = projects?.filter(p => 
          ['In Progress', 'Active', 'Works In Progress'].includes(p.status)
        ).length || 0

        const totalBudget = financialData?.reduce((sum, f) => sum + (f.budget_total || 0), 0) || 0
        const totalSpent = financialData?.reduce((sum, f) => sum + (f.budget_spent || 0), 0) || 0
        const totalRemaining = financialData?.reduce((sum, f) => sum + (f.budget_remaining || 0), 0) || 0

        // Calculate task metrics
        const now = new Date()
        const overdueTasks = tasks?.filter(task => {
          if (!task.due_date || task.status === 'completed') return false
          return new Date(task.due_date) < now
        }).length || 0

        const pendingTasks = tasks?.filter(task => 
          task.status !== 'completed' && task.status !== 'done'
        ).length || 0

        // Calculate message metrics
        const recentMessages = messages?.filter(msg => {
          const msgDate = new Date(msg.created_at)
          const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          return msgDate > dayAgo
        }).length || 0

        setMetrics({
          totalProjects,
          activeProjects,
          totalBudget,
          totalSpent,
          totalRemaining,
          pendingTasks,
          overdueTasks,
          recentMessages,
          criticalIssues: overdueTasks // For now, overdue tasks are critical issues
        })
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  return { metrics, loading, error, refetch: () => setLoading(true) }
}

// Enhanced Dashboard Components
export default function DashboardPage() {
  const { user } = useUser()
  const { financials, loading: financialsLoading, error: financialsError } = useFinancialData()
  const { metrics, loading: metricsLoading, error: metricsError } = useDashboardMetrics()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simple refresh - reload the page
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  if (metricsLoading || financialsLoading) {
    return <DashboardSkeleton />
  }

  // Show errors but don't crash the page
  const hasErrors = financialsError || metricsError

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <DashboardHeader user={user} onRefresh={handleRefresh} refreshing={refreshing} />

        {/* Error Display */}
        {hasErrors && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Database Connection Issues</p>
                  {financialsError && <p className="text-sm">{financialsError}</p>}
                  {metricsError && <p className="text-sm">{metricsError}</p>}
                  <p className="text-sm">Showing available data with sample metrics.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real Financial KPIs */}
        <RealFinancialKPIGrid metrics={metrics} hasErrors={hasErrors} />

        {/* Financial Overview Cards */}
        <FinancialOverviewCards financials={financials} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <RealProjectOverview />
            <ProjectFinancialChart financials={financials} />
          </div>
          <div className="space-y-6">
            <QuickActions />
            <RecentActivity />
            <FinancialAlerts financials={financials} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Real Financial KPI Grid with error handling
function RealFinancialKPIGrid({ 
  metrics, 
  hasErrors 
}: { 
  metrics: DashboardMetrics | null
  hasErrors: boolean 
}) {
  if (!metrics) return <KPISkeleton />

  // Use sample data if we have errors
  const kpis: KPIData[] = hasErrors ? [
    {
      label: "Total Projects",
      value: "12",
      change: "+2 this month",
      trend: "up",
      description: "Active projects in system",
      color: "bg-blue-500"
    },
    {
      label: "Project Status",
      value: "8",
      change: "In progress",
      trend: "up",
      description: "Currently active",
      color: "bg-green-500"
    },
    {
      label: "Pending Tasks",
      value: "24",
      change: "3 overdue",
      trend: "down",
      description: "Requiring attention",
      color: "bg-orange-500"
    },
    {
      label: "Team Messages",
      value: "18",
      change: "Today",
      trend: "up",
      description: "Recent activity",
      color: "bg-purple-500"
    }
  ] : [
    {
      label: "Total Budget",
      value: metrics.totalBudget > 0 ? `£${(metrics.totalBudget / 1000).toFixed(0)}k` : "£0",
      change: "+5.2%",
      trend: "up",
      description: "Across all active projects",
      color: "bg-blue-500"
    },
    {
      label: "Budget Spent",
      value: metrics.totalSpent > 0 ? `£${(metrics.totalSpent / 1000).toFixed(0)}k` : "£0",
      change: metrics.totalBudget > 0 ? `${((metrics.totalSpent / metrics.totalBudget) * 100).toFixed(1)}%` : "0%",
      trend: metrics.totalSpent > metrics.totalBudget * 0.8 ? "down" : "up",
      description: "Of total allocated budget",
      color: "bg-orange-500"
    },
    {
      label: "Active Projects",
      value: metrics.activeProjects.toString(),
      change: `${metrics.totalProjects} total`,
      trend: "up",
      description: "Projects in progress",
      color: "bg-green-500"
    },
    {
      label: "Pending Tasks",
      value: metrics.pendingTasks.toString(),
      change: `${metrics.overdueTasks} overdue`,
      trend: metrics.overdueTasks > 0 ? "down" : "up",
      description: "Requiring attention",
      color: metrics.overdueTasks > 0 ? "bg-red-500" : "bg-purple-500"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <div className={cn("absolute top-0 left-0 w-1 h-full", kpi.color)} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg", kpi.color.replace('bg-', 'bg-').replace('-500', '-100'))}>
                {index === 0 && <PoundSterling className={cn("w-5 h-5", kpi.color.replace('bg-', 'text-'))} />}
                {index === 1 && <Calculator className={cn("w-5 h-5", kpi.color.replace('bg-', 'text-'))} />}
                {index === 2 && <Building2 className={cn("w-5 h-5", kpi.color.replace('bg-', 'text-'))} />}
                {index === 3 && <CheckSquare className={cn("w-5 h-5", kpi.color.replace('bg-', 'text-'))} />}
              </div>
              <div className="flex items-center gap-1 text-sm">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {kpi.change}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs font-medium">{kpi.label}</p>
              <p className="text-xs opacity-70">{kpi.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Financial Overview Cards
function FinancialOverviewCards({ financials }: { financials: ProjectFinancial[] }) {
  const totalProjects = financials.length
  const healthyProjects = financials.filter(f => f.budget_remaining > 0).length
  const atRiskProjects = financials.filter(f => f.budget_remaining < 0).length
  const avgBudgetUtilization = financials.length > 0 
    ? financials.reduce((sum, f) => sum + ((f.budget_spent / f.budget_total) * 100), 0) / financials.length 
    : 0

  // Show cards even if no financial data
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Healthy Projects</p>
              <p className="text-3xl font-bold text-green-900">{healthyProjects}</p>
              <p className="text-xs text-green-600">Within budget</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">At Risk Projects</p>
              <p className="text-3xl font-bold text-red-900">{atRiskProjects}</p>
              <p className="text-xs text-red-600">Over budget</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Avg Budget Used</p>
              <p className="text-3xl font-bold text-blue-900">{avgBudgetUtilization.toFixed(1)}%</p>
              <p className="text-xs text-blue-600">Across all projects</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Percent className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Real Project Overview (replacing mock data)
function RealProjectOverview() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            status,
            client_name,
            created_at,
            target_completion
          `)
          .order('created_at', { ascending: false })
          .limit(6)

        if (error) {
          console.error('Error fetching projects:', error)
        } else {
          setProjects(data || [])
        }
      } catch (error) {
        console.error('Project fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': case 'Works In Progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Planning': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Survey': case 'Survey Booked': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Complete': case 'Closed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Recent Projects
            </CardTitle>
            <CardDescription>Latest project updates and status</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No projects found</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    <h4 className="font-medium text-sm truncate">{project.name}</h4>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{project.client_name || 'No client specified'}</p>
                </div>
                <Badge className={cn("text-xs border", getStatusColor(project.status))}>
                  {project.status}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(project.created_at), 'dd/MM/yyyy')}
                {project.target_completion && (
                  <span className="ml-2">
                    • Due: {format(new Date(project.target_completion), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// Project Financial Chart Component
function ProjectFinancialChart({ financials }: { financials: ProjectFinancial[] }) {
  if (financials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Financial Overview
          </CardTitle>
          <CardDescription>Budget vs spending across projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No financial data available</p>
            <p className="text-xs">Financial tracking will appear here once data is added</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = financials.slice(0, 6).map(f => ({
    name: f.projects?.name?.substring(0, 20) + '...' || 'Unknown Project',
    budget: f.budget_total / 1000,
    spent: f.budget_spent / 1000,
    remaining: f.budget_remaining / 1000
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Financial Overview
        </CardTitle>
        <CardDescription>Budget vs spending across projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.map((project, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{project.name}</span>
                <span className="text-muted-foreground">£{project.budget.toFixed(0)}k budget</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((project.spent / project.budget) * 100, 100)}%` }}
                />
                {project.spent > project.budget && (
                  <div 
                    className="bg-red-500 h-3 absolute top-0 rounded-full"
                    style={{ 
                      left: '100%',
                      width: `${Math.min(((project.spent - project.budget) / project.budget) * 100, 50)}%`
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spent: £{project.spent.toFixed(0)}k</span>
                <span className={project.remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                  {project.remaining < 0 ? 'Over by ' : 'Remaining: '}£{Math.abs(project.remaining).toFixed(0)}k
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Financial Alerts Component
function FinancialAlerts({ financials }: { financials: ProjectFinancial[] }) {
  const alerts = financials.filter(f => f.budget_remaining < 0 || (f.budget_spent / f.budget_total) > 0.9)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Financial Alerts
        </CardTitle>
        <CardDescription>{alerts.length} projects need attention</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">All projects within budget</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-3 rounded-lg border-l-4 border-orange-500 bg-orange-50">
                <h4 className="font-medium text-sm">{alert.projects?.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.budget_remaining < 0 
                    ? `Over budget by £${Math.abs(alert.budget_remaining).toLocaleString()}`
                    : `${((alert.budget_spent / alert.budget_total) * 100).toFixed(1)}% budget used`
                  }
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Enhanced Header Component
function DashboardHeader({ user, onRefresh, refreshing }: any) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
          Welcome back, {user?.first_name || 'User'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's your Buildology platform overview for {format(new Date(), 'EEEE, MMMM do')}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button size="sm" asChild>
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>
    </div>
  )
}

// Quick Actions (keeping from original)
function QuickActions() {
  const actions = [
    { label: 'New Project', icon: Plus, color: 'blue', href: '/projects/new' },
    { label: 'Schedule Survey', icon: Calendar, color: 'green', href: '/surveys/new' },
    { label: 'Upload Documents', icon: Camera, color: 'orange', href: '/documents/upload' },
    { label: 'Send Invoice', icon: FileText, color: 'purple', href: '/invoices/new' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
              <action.icon className="w-5 h-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

// Recent Activity (keeping from original but could be enhanced)
function RecentActivity() {
  const activities = [
    { type: 'project', message: 'Oak Avenue project moved to In Progress', time: '2 hours ago', icon: Building2, color: 'blue' },
    { type: 'message', message: 'New message from Johnson Family', time: '4 hours ago', icon: MessageSquare, color: 'green' },
    { type: 'document', message: 'Survey report uploaded for Maple Close', time: '6 hours ago', icon: FileText, color: 'orange' },
    { type: 'task', message: 'Site visit completed at High Street', time: '1 day ago', icon: CheckSquare, color: 'purple' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
            <div className={cn("p-1.5 rounded-full text-white", `bg-${activity.color}-500`)}>
              <activity.icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activity.message}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Loading Skeletons
function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  )
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}