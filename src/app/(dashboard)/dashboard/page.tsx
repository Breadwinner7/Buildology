'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useUser } from '@/hooks/useUser'
import { usePerformance, useDeepMemo } from '@/lib/performance'
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatsCard, FeatureCard, ProjectCard, MetricCard } from '@/components/ui/enhanced-card'
import { InsuranceAnalytics } from '@/components/charts/InsuranceAnalytics'
import { LoadingState, LoadingSpinner } from '@/components/ui/loading'
import { 
  Building2, 
  ClipboardList, 
  PoundSterling, 
  MessageSquare,
  Shield,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Eye,
  ArrowRight,
  Bell,
  Target,
  Activity,
  Zap,
  MapPin,
  User,
  Flag
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { cn } from '@/lib/utils'

// Utility functions
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

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'works_in_progress': 'bg-blue-500',
    'works_complete': 'bg-green-500',
    'closed': 'bg-green-500',
    'on_hold': 'bg-yellow-500',
    'planning': 'bg-purple-500',
    'survey_booked': 'bg-orange-500',
    'survey_complete': 'bg-orange-500',
    'awaiting_agreement': 'bg-amber-500',
    'scheduling_works': 'bg-cyan-500',
    'snagging': 'bg-pink-500',
    'final_accounts': 'bg-indigo-500'
  }
  return statusColors[status] || 'bg-gray-500'
}

const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'normal': return 'bg-blue-500'
    case 'low': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

const formatProjectStatus = (status: string) => {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Active'
}

// Loading skeleton for dashboard
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-mesh">
    <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-4 w-96 rounded-lg" />
      </div>
      <LoadingState type="stats" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LoadingState type="table" />
        </div>
        <div>
          <LoadingState type="card" count={1} />
        </div>
      </div>
    </div>
  </div>
)

function ComprehensiveDashboard() {
  // Performance monitoring
  usePerformance('ComprehensiveDashboard')
  const { user } = useUser()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  
  const {
    metrics,
    recentProjects,
    priorityTasks,
    recentActivity,
    complianceAlerts,
    upcomingAppointments,
    isLoading,
    hasErrors,
    refreshAll
  } = useDashboardData()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshAll()
    } finally {
      setRefreshing(false)
    }
  }, [refreshAll])

  // Memoize computed values for performance
  const welcomeMessage = useMemo(() => 
    user?.role === 'policyholder' 
      ? `Welcome back, ${user?.first_name || 'User'}`
      : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user?.first_name || 'User'}`
  , [user?.role, user?.first_name])

  // Memoize dashboard metrics for performance
  const memoizedMetrics = useDeepMemo(metrics, [metrics])
  const memoizedRecentProjects = useDeepMemo(recentProjects, [recentProjects])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  // Remove duplicate welcomeMessage (already memoized above)

  return (
    <div className="min-h-screen bg-mesh">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
        {/* Header Section with Animated Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gradient">
              {welcomeMessage}
            </h1>
            <p className="text-muted-foreground text-lg text-balance">
              {user?.role === 'policyholder' 
                ? 'Track your claims and manage your property projects'
                : 'Here\'s your comprehensive project overview and key metrics'
              }
            </p>
            {user?.role && (
              <Badge variant="outline" className="mt-2">
                {user.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={() => router.push('/projects')}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {hasErrors && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some dashboard data couldn't be loaded. The information below may be incomplete.
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced KPI Grid with Beautiful Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatsCard
            title="Active Projects"
            value={memoizedMetrics?.activeProjects || 0}
            description={`${memoizedMetrics?.totalProjects || 0} total projects`}
            icon={<Building2 className="w-5 h-5" />}
            gradient="blue"
            onClick={() => router.push('/projects')}
            className="animate-slide-in"
            style={{ animationDelay: '0ms' }}
          />

          <StatsCard
            title="Pending Tasks"
            value={memoizedMetrics?.myPendingTasks || 0}
            description={`${memoizedMetrics?.tasksThisWeek || 0} due this week`}
            icon={<ClipboardList className="w-5 h-5" />}
            gradient="green"
            change={memoizedMetrics?.overdueTasks ? {
              value: `${memoizedMetrics.overdueTasks} overdue`,
              trend: 'down' as const,
              label: 'Need attention'
            } : undefined}
            onClick={() => router.push('/tasks')}
            className="animate-slide-in"
            style={{ animationDelay: '100ms' }}
          />

          <StatsCard
            title="Total Budget"
            value={formatCompactCurrency(memoizedMetrics?.totalBudget || 0)}
            description={`${formatCompactCurrency(memoizedMetrics?.budgetSpent || 0)} spent`}
            icon={<PoundSterling className="w-5 h-5" />}
            gradient="purple"
            onClick={() => router.push('/financials')}
            className="animate-slide-in"
            style={{ animationDelay: '200ms' }}
          />

          <StatsCard
            title="Messages"
            value={memoizedMetrics?.unreadMessages || 0}
            description={`${memoizedMetrics?.activeThreads || 0} active threads`}
            icon={<MessageSquare className="w-5 h-5" />}
            gradient="orange"
            trend={memoizedMetrics?.unreadMessages && memoizedMetrics.unreadMessages > 0 ? 'up' : 'stable'}
            onClick={() => router.push('/messages')}
          />
        </div>

        {/* Secondary Metrics with Delayed Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Projects On Hold"
            value={memoizedMetrics?.projectsOnHold || 0}
            subValue="Require attention"
            change={memoizedMetrics?.projectsOnHold && memoizedMetrics.projectsOnHold > 0 ? {
              value: 'Action needed',
              period: 'immediate',
              trend: 'down' as const
            } : undefined}
            className="animate-slide-in"
            style={{ animationDelay: '300ms' }}
          />

          <MetricCard
            title="Today's Schedule"
            value={memoizedMetrics?.todaysAppointments || 0}
            subValue={`${memoizedMetrics?.upcomingAppointments || 0} upcoming`}
            className="animate-slide-in"
            style={{ animationDelay: '400ms' }}
          />

          <MetricCard
            title="Compliance Status"
            value={(memoizedMetrics?.complianceAlerts || 0) + (memoizedMetrics?.fcaReportingEvents || 0)}
            subValue="Regulatory matters"
            change={memoizedMetrics?.slaBreaches && memoizedMetrics.slaBreaches > 0 ? {
              value: `${memoizedMetrics.slaBreaches} SLA breach${memoizedMetrics.slaBreaches > 1 ? 'es' : ''}`,
              period: 'active',
              trend: 'down' as const
            } : undefined}
            className="animate-slide-in"
            style={{ animationDelay: '500ms' }}
          />

          <MetricCard
            title="Overdue Items"
            value={(memoizedMetrics?.overdueTasks || 0) + (memoizedMetrics?.overdueInvoices || 0)}
            subValue="Tasks and invoices"
            trend={((memoizedMetrics?.overdueTasks || 0) + (memoizedMetrics?.overdueInvoices || 0)) > 0 ? 'down' : 'stable'}
          />
        </div>

        {/* Advanced Insurance Analytics Section */}
        <div className="animate-slide-in" style={{ animationDelay: '600ms' }}>
          <InsuranceAnalytics />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Beautiful Recent Projects */}
            <Card className="card-elevated animate-slide-in" style={{ animationDelay: '800ms' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    Recent Projects
                  </CardTitle>
                  <CardDescription className="text-balance">
                    Latest project updates and status changes across your portfolio
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/projects')}
                  className="rounded-xl hover:shadow-md transition-shadow"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {memoizedRecentProjects.length > 0 ? (
                  <div className="container-grid">
                    {memoizedRecentProjects.slice(0, 6).map((project, index) => (
                      <div 
                        key={project.id}
                        className="animate-slide-in"
                        style={{ animationDelay: `${900 + index * 100}ms` }}
                      >
                        <ProjectCard
                          name={project.name}
                          description={project.contact_name ? `Contact: ${project.contact_name}` : undefined}
                          status={formatProjectStatus(project.status)}
                          priority={project.priority as any || 'medium'}
                          dueDate={project.target_completion_date ? format(new Date(project.target_completion_date), 'MMM dd, yyyy') : undefined}
                          team={project.vulnerability_flags?.length > 0 ? [
                            { name: 'Vulnerable Customer', initials: 'VC' }
                          ] : []}
                          onClick={() => router.push(`/projects/${project.id}`)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Recent Projects</h3>
                    <p className="text-sm">Projects will appear here once you create them</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="card-elevated animate-slide-in" style={{ animationDelay: '1200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-xl hover:shadow-md transition-shadow"
                  onClick={() => router.push('/projects?action=create')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-xl hover:shadow-md transition-shadow"
                  onClick={() => router.push('/tasks?action=create')}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Add New Task
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-xl hover:shadow-md transition-shadow"
                  onClick={() => router.push('/messages?action=create')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Conversation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-center pt-8">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="lg"
            className="rounded-2xl px-8 bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl transition-all"
          >
            <RefreshCw className={cn("w-5 h-5 mr-2", refreshing && "animate-spin")} />
            {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Export with error boundary wrapper for production-grade error handling
export default withErrorBoundary(ComprehensiveDashboard)