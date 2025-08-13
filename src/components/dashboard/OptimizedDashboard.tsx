'use client'

import { memo, Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { 
  createMemoComponent, 
  useExpensiveCalculation,
  performanceMonitor,
  withPerformanceMonitoring 
} from '@/lib/performance/optimization-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  PoundSterling, 
  ClipboardList, 
  MessageSquare,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

// Lazy load heavy components
const InsuranceAnalytics = lazy(() => import('@/components/charts/InsuranceAnalytics'))
const ProjectFinancialDashboard = lazy(() => import('@/components/financials/ProjectFinancialDashboard'))

// Types for dashboard data
interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalReserves: number
  pendingApprovals: number
  unreadMessages: number
  overdueItems: number
}

interface RecentProject {
  id: string
  title: string
  status: string
  priority: string
  totalIncurred: number
  lastUpdated: Date
}

interface DashboardData {
  stats: DashboardStats
  recentProjects: RecentProject[]
  tasks: Array<{ id: string; title: string; dueDate: Date; priority: string }>
  notifications: Array<{ id: string; title: string; type: string }>
  isLoading: boolean
  error?: string
}

// Memoized stats cards
const StatsCard = memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  gradient, 
  trend 
}: {
  title: string
  value: string | number
  description: string
  icon: any
  gradient: string
  trend?: string
}) => {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
})

StatsCard.displayName = 'StatsCard'

// Memoized project card
const ProjectCard = memo(({ project }: { project: RecentProject }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{project.title}</CardTitle>
          <Badge 
            variant={project.priority === 'high' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {project.priority}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Status: {project.status}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">
            {formatCurrency(project.totalIncurred)}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(project.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ProjectCard.displayName = 'ProjectCard'

// Memoized KPI grid
const KpiGrid = memo(({ stats, isLoading }: { 
  stats: DashboardStats
  isLoading: boolean 
}) => {
  // Expensive calculation memoized
  const calculatedMetrics = useExpensiveCalculation(
    (data: DashboardStats) => ({
      projectsUtilization: (data.activeProjects / data.totalProjects) * 100,
      averageReservePerProject: data.totalReserves / data.totalProjects,
      urgentItemsRatio: data.overdueItems / data.totalProjects,
      communicationLoad: data.unreadMessages / data.activeProjects,
    }),
    stats
  )

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Projects"
        value={stats.totalProjects}
        description={`${stats.activeProjects} active`}
        icon={Building2}
        gradient="from-blue-500 to-blue-600"
        trend={`${calculatedMetrics.projectsUtilization.toFixed(1)}% utilization`}
      />
      <StatsCard
        title="Total Reserves"
        value={new Intl.NumberFormat('en-GB', { 
          style: 'currency', 
          currency: 'GBP',
          notation: 'compact'
        }).format(stats.totalReserves)}
        description={`£${calculatedMetrics.averageReservePerProject.toFixed(0)} avg per project`}
        icon={PoundSterling}
        gradient="from-green-500 to-green-600"
      />
      <StatsCard
        title="Pending Tasks"
        value={stats.pendingApprovals}
        description={`${stats.overdueItems} overdue items`}
        icon={ClipboardList}
        gradient="from-orange-500 to-orange-600"
        trend={stats.overdueItems > 0 ? 'Attention needed' : 'On track'}
      />
      <StatsCard
        title="Messages"
        value={stats.unreadMessages}
        description={`${calculatedMetrics.communicationLoad.toFixed(1)} per project`}
        icon={MessageSquare}
        gradient="from-purple-500 to-purple-600"
      />
    </div>
  )
})

KpiGrid.displayName = 'KpiGrid'

// Memoized recent projects list
const RecentProjects = memo(({ projects, isLoading }: { 
  projects: RecentProject[]
  isLoading: boolean 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>
        <CardDescription>Your latest active projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.slice(0, 5).map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

RecentProjects.displayName = 'RecentProjects'

// Main optimized dashboard component
const OptimizedDashboard = memo(({ data }: { data: DashboardData }) => {
  if (data.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Dashboard Overview</h2>
        <ErrorBoundary level="section">
          <KpiGrid stats={data.stats} isLoading={data.isLoading} />
        </ErrorBoundary>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <ErrorBoundary level="section">
            <RecentProjects 
              projects={data.recentProjects} 
              isLoading={data.isLoading} 
            />
          </ErrorBoundary>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                New Project
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                Create Task
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Preview */}
          <ErrorBoundary level="component">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analytics Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InsuranceAnalytics />
                </CardContent>
              </Card>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Financial Dashboard */}
      <ErrorBoundary level="section">
        <Suspense fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64" />
            </CardContent>
          </Card>
        }>
          <ProjectFinancialDashboard />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
})

OptimizedDashboard.displayName = 'OptimizedDashboard'

// Export with performance monitoring
export default withPerformanceMonitoring(OptimizedDashboard, 'OptimizedDashboard')