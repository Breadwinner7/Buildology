'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, 
  Building2, Users, Calendar, PoundSterling, MessageSquare,
  FileText, Camera, MapPin, Phone, Mail, Settings, Plus,
  Activity, Target, Zap, BarChart3, ArrowRight, RefreshCw,
  Bell, Star, Filter, Search, Download, Eye, HardHat,
  Wrench, Home, AlertCircle, CheckSquare, UserCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Enhanced Dashboard Components
export default function DashboardPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1500)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
      {/* Enhanced Header */}
      <DashboardHeader user={user} onRefresh={handleRefresh} refreshing={refreshing} />

      {/* KPI Overview */}
      <EnhancedKPIGrid />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          <ProjectOverview />
          <ProjectProgress />
        </div>
        <div className="space-y-6 flex flex-col">
          <QuickActions />
          <RecentActivity />
          <UpcomingDeadlines />
        </div>
      </div>

      {/* Secondary Grid – adjusted columns & height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-h-0">
        <div className="h-full flex flex-col"><EnhancedUnreadMessages /></div>
        <div className="h-full flex flex-col"><RecentDocuments /></div>
        <div className="h-full flex flex-col"><TeamPerformance /></div>
        <div className="lg:col-span-2 xl:col-span-1 h-full flex flex-col"><RegionalOverview /></div>
      </div>
    </div>
  </div>
)

}

// Dashboard Header Component
function DashboardHeader({ user, onRefresh, refreshing }: any) {
  const currentTime = new Date().toLocaleString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name || 'there'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">{currentTime}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>
    </div>
  )
}

// Enhanced KPI Grid
function EnhancedKPIGrid() {
  const kpis = [
    { 
      label: 'Total Projects', 
      value: 24, 
      change: +3, 
      trend: 'up',
      icon: Building2,
      color: 'blue',
      description: 'Active projects'
    },
    { 
      label: 'In Progress', 
      value: 12, 
      change: +2, 
      trend: 'up',
      icon: Activity,
      color: 'orange',
      description: 'Currently active'
    },
    { 
      label: 'Completed', 
      value: 8, 
      change: +1, 
      trend: 'up',
      icon: CheckCircle2,
      color: 'green',
      description: 'This month'
    },
    { 
      label: 'On Hold', 
      value: 4, 
      change: -1, 
      trend: 'down',
      icon: AlertTriangle,
      color: 'red',
      description: 'Require attention'
    },
    { 
      label: 'Total Value', 
      value: '£485k', 
      change: '+12%', 
      trend: 'up',
      icon: PoundSterling,
      color: 'emerald',
      description: 'Portfolio value'
    },
    { 
      label: 'This Month', 
      value: '£125k', 
      change: '+8%', 
      trend: 'up',
      icon: TrendingUp,
      color: 'purple',
      description: 'Revenue generated'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      red: 'bg-red-50 border-red-200 text-red-900',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      purple: 'bg-purple-50 border-purple-200 text-purple-900'
    }
    return colors[color as keyof typeof colors]
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={cn("hover:shadow-md transition-all cursor-pointer border-2", getColorClasses(kpi.color))}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <kpi.icon className="w-6 h-6" />
              <div className="flex items-center gap-1 text-xs">
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

// Project Overview with Charts
function ProjectOverview() {
  const projects = [
    { name: "Residential Extension - Oak Avenue", status: "In Progress", completion: 75, client: "Johnson Family", value: "£45,000", region: "London", urgent: false },
    { name: "Commercial Fit-out - High Street", status: "Planning", completion: 25, client: "Metro Retail Ltd", value: "£120,000", region: "Manchester", urgent: true },
    { name: "Insurance Claim - Maple Close", status: "Survey", completion: 10, client: "Sarah Mitchell", value: "£32,000", region: "Birmingham", urgent: false },
    { name: "New Build - Riverside", status: "In Progress", completion: 60, client: "Riverside Developments", value: "£280,000", region: "Leeds", urgent: false },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Planning': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Survey': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Complete': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Active Projects
            </CardTitle>
            <CardDescription>Current project portfolio overview</CardDescription>
          </div>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project, idx) => (
          <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{project.name}</h3>
                  {project.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <UserCircle className="w-3 h-3" />
                    {project.client}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {project.region}
                  </div>
                  <div className="flex items-center gap-1">
                    <PoundSterling className="w-3 h-3" />
                    {project.value}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{project.completion}%</span>
              </div>
              <Progress value={project.completion} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Project Progress Chart
function ProjectProgress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Project Progress Analytics
        </CardTitle>
        <CardDescription>Performance metrics and completion trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Average Completion Time</h4>
              <p className="text-2xl font-bold text-blue-600">14 weeks</p>
              <p className="text-xs text-blue-700">2 weeks faster than industry average</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">On-Time Delivery</h4>
              <p className="text-2xl font-bold text-green-600">92%</p>
              <p className="text-xs text-green-700">Above target of 85%</p>
            </div>
          </div>
          <div className="col-span-2">
            <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Progress Chart Placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Actions Panel
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

// Recent Activity Feed
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
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
            <div className={cn("p-2 rounded-full", 
              activity.color === 'blue' && 'bg-blue-100',
              activity.color === 'green' && 'bg-green-100',
              activity.color === 'orange' && 'bg-orange-100',
              activity.color === 'purple' && 'bg-purple-100'
            )}>
              <activity.icon className={cn("w-4 h-4",
                activity.color === 'blue' && 'text-blue-600',
                activity.color === 'green' && 'text-green-600',
                activity.color === 'orange' && 'text-orange-600',
                activity.color === 'purple' && 'text-purple-600'
              )} />
            </div>
            <div className="flex-1">
              <p className="text-sm">{activity.message}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Upcoming Deadlines
function UpcomingDeadlines() {
  const deadlines = [
    { task: 'Survey return - Flat 12', due: 'Today', urgent: true, project: 'Insurance Claim' },
    { task: 'Building control inspection', due: 'Tomorrow', urgent: false, project: 'Oak Avenue' },
    { task: 'Client presentation', due: 'Friday', urgent: false, project: 'High Street' },
    { task: 'Final account submission', due: 'Next week', urgent: false, project: 'Riverside' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.map((deadline, idx) => (
          <div key={idx} className={cn("p-3 rounded-lg border-l-4", deadline.urgent ? 'border-red-400 bg-red-50' : 'border-blue-400 bg-blue-50')}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{deadline.task}</p>
                <p className="text-xs text-gray-600">{deadline.project}</p>
              </div>
              <Badge variant={deadline.urgent ? 'destructive' : 'secondary'} className="text-xs">
                {deadline.due}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Enhanced Unread Messages
function EnhancedUnreadMessages() {
  const messages = [
    { thread: "Kitchen Ceiling Issue", sender: "John Doe", lastMessage: "Uploaded site photos for review", time: "1h ago", unreadCount: 2, priority: "high" },
    { thread: "Quote Approval", sender: "Sarah Client", lastMessage: "Can we reduce the tile costs?", time: "3h ago", unreadCount: 1, priority: "normal" },
    { thread: "Access Arrangements", sender: "Tom Site Lead", lastMessage: "No access available on Friday", time: "Yesterday", unreadCount: 3, priority: "urgent" },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-400'
      case 'high': return 'bg-orange-100 border-orange-400'
      default: return 'bg-blue-100 border-blue-400'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages
          </CardTitle>
          <Badge variant="outline" className="text-xs">{messages.length} unread</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("p-3 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer", getPriorityColor(msg.priority))}>
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-medium text-sm truncate">{msg.thread}</h4>
              <span className="text-xs text-gray-500">{msg.time}</span>
            </div>
            <p className="text-xs text-gray-600 truncate mb-2">
              <span className="font-medium">{msg.sender}</span>: {msg.lastMessage}
            </p>
            <Badge className="text-xs bg-blue-500 hover:bg-blue-600">{msg.unreadCount} unread</Badge>
          </div>
        ))}
        <div className="pt-2">
          <Link href="/messages" className="text-sm text-blue-600 hover:underline flex items-center">
            View all messages <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// Recent Documents with previews
function RecentDocuments() {
  const documents = [
    { name: "ScopeOfWorks.pdf", uploader: "Sarah Client", uploadedAt: "2h ago", type: "PDF", size: "2.4 MB", project: "Oak Avenue" },
    { name: "Kitchen_Tiles_Quote.jpg", uploader: "John Contractor", uploadedAt: "4h ago", type: "Image", size: "1.2 MB", project: "High Street" },
    { name: "Survey_Report.docx", uploader: "Michael Surveyor", uploadedAt: "Yesterday", type: "Document", size: "856 KB", project: "Maple Close" },
  ]

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-4 h-4 text-red-500" />
      case 'Image': return <Camera className="w-4 h-4 text-green-500" />
      case 'Document': return <FileText className="w-4 h-4 text-blue-500" />
      default: return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Documents
          </CardTitle>
          <Badge variant="outline" className="text-xs">{documents.length} uploaded</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc, idx) => (
          <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              {getFileIcon(doc.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{doc.project}</span>
                  <span>•</span>
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>{doc.uploadedAt}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="pt-2">
          <Link href="/documents" className="text-sm text-blue-600 hover:underline flex items-center">
            View all documents <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// Team Performance
function TeamPerformance() {
  const teamMembers = [
    { name: "Sarah Johnson", role: "Project Manager", activeProjects: 4, completionRate: 95, avatar: "SJ" },
    { name: "Mike Chen", role: "Surveyor", activeProjects: 6, completionRate: 88, avatar: "MC" },
    { name: "Emma Wilson", role: "Site Supervisor", activeProjects: 3, completionRate: 92, avatar: "EW" },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">{member.avatar}</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs">{member.activeProjects} projects</span>
                <span className="text-xs">•</span>
                <span className="text-xs">{member.completionRate}% completion</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Regional Overview
function RegionalOverview() {
  const regions = [
    { name: "London", projects: 8, value: "£180k", growth: "+12%" },
    { name: "Manchester", projects: 6, value: "£145k", growth: "+8%" },
    { name: "Birmingham", projects: 4, value: "£95k", growth: "+15%" },
    { name: "Leeds", projects: 6, value: "£165k", growth: "+5%" },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Regional Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {regions.map((region, idx) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">{region.name}</h4>
              <span className="text-xs text-green-600 font-medium">{region.growth}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-xs text-gray-600">
              <span>{region.projects} projects</span>
              <span>{region.value} value</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}