'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  PoundSterling, 
  TrendingUp, 
  TrendingDown, 
  Building2,
  Calculator,
  CheckSquare,
  Clock,
  RefreshCw,
  AlertTriangle,
  FileText,
  MessageSquare,
  Calendar,
  Users,
  ArrowUpRight,
  Plus,
  Activity,
  Target,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Types
interface DashboardOverview {
  projects: {
    total: number
    active: number
    completed: number
    onHold: number
  }
  finances: {
    totalBudget: number
    totalSpent: number
    utilizationRate: number
    averageProjectValue: number
  }
  tasks: {
    total: number
    pending: number
    overdue: number
    completedThisWeek: number
  }
  communications: {
    unreadMessages: number
    activeThreads: number
    recentActivity: number
  }
  alerts: {
    overdueInvoices: number
    pendingQuotes: number
    criticalIssues: number
    upcomingDeadlines: number
  }
}

interface RecentActivity {
  id: string
  type: 'project' | 'task' | 'message' | 'financial'
  title: string
  description: string
  timestamp: string
  status?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

// API Functions
const fetchDashboardOverview = async (): Promise<DashboardOverview> => {
  try {
    // Fetch all projects with their status
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status, created_at')

    // Fetch financial summaries
    const { data: financials } = await supabase
      .from('project_financials')
      .select('budget_total, budget_spent')

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_date, created_at')

    // Fetch messages/threads
    const { data: messages } = await supabase
      .from('messages')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: threads } = await supabase
      .from('threads')
      .select('id')

    // Fetch invoices for alerts
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, status, due_date')

    // Fetch quotes for alerts
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status')

    // Calculate project metrics
    const totalProjects = projects?.length || 0
    const activeProjects = projects?.filter(p => 
      ['works_in_progress', 'survey_booked', 'planning', 'awaiting_agreement'].includes(p.status)
    ).length || 0
    const completedProjects = projects?.filter(p => p.status === 'closed').length || 0
    const onHoldProjects = projects?.filter(p => p.status === 'on_hold').length || 0

    // Calculate financial metrics
    const totalBudget = financials?.reduce((sum, f) => sum + (f.budget_total || 0), 0) || 0
    const totalSpent = financials?.reduce((sum, f) => sum + (f.budget_spent || 0), 0) || 0
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const averageProjectValue = financials?.length ? totalBudget / financials.length : 0

    // Calculate task metrics
    const totalTasks = tasks?.length || 0
    const pendingTasks = tasks?.filter(t => t.status !== 'done').length || 0
    const overdueTasks = tasks?.filter(t => 
      t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
    ).length || 0
    const completedThisWeek = tasks?.filter(t => 
      t.status === 'done' && 
      new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length || 0

    // Calculate communication metrics
    const unreadMessages = 0 // TODO: implement when read status is available
    const activeThreads = threads?.length || 0
    const recentActivity = messages?.filter(m => 
      new Date(m.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length || 0

    // Calculate alerts
    const overdueInvoices = invoices?.filter(i => 
      i.status === 'overdue' || (i.status === 'sent' && new Date(i.due_date) < new Date())
    ).length || 0
    const pendingQuotes = quotes?.filter(q => q.status === 'submitted').length || 0
    const criticalIssues = overdueTasks + overdueInvoices
    const upcomingDeadlines = tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      const dueDate = new Date(t.due_date)
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      return dueDate <= threeDaysFromNow && dueDate > new Date()
    }).length || 0

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects
      },
      finances: {
        totalBudget,
        totalSpent,
        utilizationRate,
        averageProjectValue
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completedThisWeek
      },
      communications: {
        unreadMessages,
        activeThreads,
        recentActivity
      },
      alerts: {
        overdueInvoices,
        pendingQuotes,
        criticalIssues,
        upcomingDeadlines
      }
    }
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    // Return empty state on error
    return {
      projects: { total: 0, active: 0, completed: 0, onHold: 0 },
      finances: { totalBudget: 0, totalSpent: 0, utilizationRate: 0, averageProjectValue: 0 },
      tasks: { total: 0, pending: 0, overdue: 0, completedThisWeek: 0 },
      communications: { unreadMessages: 0, activeThreads: 0, recentActivity: 0 },
      alerts: { overdueInvoices: 0, pendingQuotes: 0, criticalIssues: 0, upcomingDeadlines: 0 }
    }
  }
}

const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
  try {
    // This would typically combine multiple tables, for now just return recent projects
    const { data: recentProjects } = await supabase
      .from('projects')
      .select('id, name, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)

    return recentProjects?.map(project => ({
      id: project.id,
      type: 'project' as const,
      title: project.name,
      description: `Status: ${project.status}`,
      timestamp: project.updated_at || project.created_at,
      status: project.status
    })) || []
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

// Utility functions
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}k`
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'works_in_progress':
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'planning':
    case 'survey_booked':
      return 'bg-blue-100 text-blue-800'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800'
    case 'closed':
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Quick Stats Card Component
interface QuickStatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: { direction: 'up' | 'down'; value: string }
  icon: React.ReactNode
  color: string
  href?: string
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
  href
}) => {
  const CardComponent = href ? Link : 'div'
  const cardProps = href ? { href } : {}

  return (
    <CardComponent {...cardProps} className={href ? "block" : ""}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={cn("p-3 rounded-full", color.replace('text-', 'bg-').replace('-600', '-100'))}>
              {icon}
            </div>
          </div>
          {trend && (
            <div className="flex items-center mt-4 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trend.value}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </CardComponent>
  )
}

// Project Status Overview Component
const ProjectStatusOverview: React.FC<{ projects: DashboardOverview['projects'] }> = ({ projects }) => {
  const total = projects.total
  const activePercentage = total > 0 ? (projects.active / total) * 100 : 0
  const completedPercentage = total > 0 ? (projects.completed / total) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Status Overview</CardTitle>
        <CardDescription>{total} total projects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center space-y-2">
            <p className="text-3xl font-bold text-green-600">{projects.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl font-bold text-blue-600">{projects.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Active Projects</span>
            <span>{activePercentage.toFixed(0)}%</span>
          </div>
          <Progress value={activePercentage} className="h-2" />
          
          <div className="flex justify-between text-sm">
            <span>Completion Rate</span>
            <span>{completedPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={completedPercentage} className="h-2" />
        </div>

        {projects.onHold > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {projects.onHold} project{projects.onHold !== 1 ? 's' : ''} on hold
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href="/projects">
              <Building2 className="w-4 h-4 mr-2" />
              View All Projects
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Recent Activity Component
const RecentActivityCard: React.FC<{ activities: RecentActivity[] }> = ({ activities }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/activity">
            <Activity className="w-4 h-4 mr-2" />
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-1 bg-blue-100 rounded">
                  {activity.type === 'project' && <Building2 className="w-3 h-3 text-blue-600" />}
                  {activity.type === 'task' && <CheckSquare className="w-3 h-3 text-green-600" />}
                  {activity.type === 'message' && <MessageSquare className="w-3 h-3 text-purple-600" />}
                  {activity.type === 'financial' && <PoundSterling className="w-3 h-3 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(activity.timestamp).toLocaleDateString('en-GB')}
                  </p>
                </div>
                {activity.status && (
                  <Badge className={getStatusColor(activity.status)} variant="secondary">
                    {activity.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick Actions Component
const QuickActionsCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full justify-start">
          <Link href="/projects?action=create">
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/tasks">
            <CheckSquare className="w-4 h-4 mr-2" />
            View All Tasks
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/financials">
            <PoundSterling className="w-4 h-4 mr-2" />
            Financial Overview
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            View Messages
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export default function OverviewDashboard() {
  const [refreshing, setRefreshing] = useState(false)

  // Data fetching
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboardOverview,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  })

  const { data: recentActivity = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: fetchRecentActivity,
    staleTime: 1 * 60 * 1000 // 1 minute
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchOverview(), refetchActivity()])
    } finally {
      setRefreshing(false)
    }
  }

  const isLoading = overviewLoading || activityLoading

  if (isLoading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of all your construction projects and activities
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Alert Bar for Critical Items */}
      {overview && overview.alerts.criticalIssues > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">
                    {overview.alerts.criticalIssues} critical item{overview.alerts.criticalIssues !== 1 ? 's' : ''} need attention
                  </p>
                  <p className="text-sm text-red-700">
                    {overview.alerts.overdueInvoices} overdue invoices • {overview.alerts.upcomingDeadlines} upcoming deadlines
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" asChild>
                <Link href="/alerts">
                  View Details
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatsCard
          title="Total Projects"
          value={overview?.projects.total || 0}
          subtitle={`${overview?.projects.active || 0} active`}
          icon={<Building2 className="w-6 h-6 text-blue-600" />}
          color="text-blue-600"
          href="/projects"
        />

        <QuickStatsCard
          title="Budget Overview"
          value={formatCurrency(overview?.finances.totalBudget || 0)}
          subtitle={`${overview?.finances.utilizationRate.toFixed(1) || 0}% utilized`}
          icon={<PoundSterling className="w-6 h-6 text-green-600" />}
          color="text-green-600"
          href="/financials"
        />

        <QuickStatsCard
          title="Pending Tasks"
          value={overview?.tasks.pending || 0}
          subtitle={`${overview?.tasks.overdue || 0} overdue`}
          trend={overview?.tasks.overdue ? { direction: 'down', value: `${overview.tasks.overdue} overdue` } : undefined}
          icon={<CheckSquare className="w-6 h-6 text-purple-600" />}
          color="text-purple-600"
          href="/tasks"
        />

        <QuickStatsCard
          title="Messages"
          value={overview?.communications.activeThreads || 0}
          subtitle={`${overview?.communications.recentActivity || 0} recent`}
          icon={<MessageSquare className="w-6 h-6 text-orange-600" />}
          color="text-orange-600"
          href="/messages"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProjectStatusOverview projects={overview?.projects || { total: 0, active: 0, completed: 0, onHold: 0 }} />
        <RecentActivityCard activities={recentActivity} />
        <QuickActionsCard />
      </div>
    </div>
  )
}