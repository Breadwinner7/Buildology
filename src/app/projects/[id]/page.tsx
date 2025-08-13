'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { 
  Calendar, MapPin, PoundSterling, User, Phone, Mail, Clock,
  AlertTriangle, Building, TrendingUp, CheckCircle, 
  FileText, MessageSquare, Edit2, X, 
  Shield, Activity, Users, Plus, ExternalLink,
  ChevronRight, Star, Zap, Upload,
  History, MoreHorizontal, Trash2, ArrowLeft,
  BarChart3, DollarSign, Timer, Archive,
  Eye, Download, Share, Filter, Search, RefreshCw, ChevronDown,
  CalendarDays, Hammer, Package, Receipt, Scale,
  Home, Briefcase, FolderOpen, UserCheck, PlayCircle, PauseCircle,
  StopCircle, BookOpen, FileImage, Loader2, ClipboardList
} from 'lucide-react'
import { ProjectOverviewPanel } from '@/components/features/projects/ProjectOverviewPanel'

// Types
type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type Document = Database['public']['Tables']['documents']['Row']
type Claim = Database['public']['Tables']['claims']['Row']
type ProjectMember = Database['public']['Tables']['project_members']['Row'] & {
  user_profiles: Database['public']['Tables']['user_profiles']['Row']
}
type ProjectFinancial = Database['public']['Tables']['project_financials']['Row']

// Enhanced project interface
interface EnhancedProject extends Project {
  project_financials?: ProjectFinancial[]
  project_members?: ProjectMember[]
  tasks?: Task[]
  claims?: Claim[]
  documents?: Document[]
  _counts?: {
    tasks: number
    completed_tasks: number
    claims: number
    documents: number
    appointments: number
  }
}

// Status configurations
const PROJECT_STATUSES = {
  planning: { label: 'Planning', color: 'bg-blue-500', icon: BookOpen },
  active: { label: 'Active', color: 'bg-green-500', icon: PlayCircle },
  on_hold: { label: 'On Hold', color: 'bg-yellow-500', icon: PauseCircle },
  completed: { label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: StopCircle },
  archived: { label: 'Archived', color: 'bg-gray-500', icon: Archive }
} as const

// Fetch project with details
const fetchProjectWithDetails = async (projectId: string): Promise<EnhancedProject | null> => {
  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Authentication required')
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_financials (*)
      `)
      .eq('id', projectId)
      .single()

    if (error) throw error

    // Fetch project members separately with proper auth context
    const { data: membersData } = await supabase
      .from('project_members')
      .select(`
        *,
        user_profiles!project_members_user_id_fkey1 (
          id,
          first_name,
          surname,
          email,
          avatar_url,
          full_name
        )
      `)
      .eq('project_id', projectId)

    // Fetch counts with error handling
    const [tasksRes, claimsRes, documentsRes, appointmentsRes] = await Promise.allSettled([
      supabase.from('tasks').select('id, status').eq('project_id', projectId),
      supabase.from('claims').select('id').eq('project_id', projectId),
      supabase.from('documents').select('id').eq('project_id', projectId),
      supabase.from('appointments').select('id').eq('project_id', projectId)
    ])

    const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : []
    const claims = claimsRes.status === 'fulfilled' ? (claimsRes.value.data || []) : []
    const documents = documentsRes.status === 'fulfilled' ? (documentsRes.value.data || []) : []
    const appointments = appointmentsRes.status === 'fulfilled' ? (appointmentsRes.value.data || []) : []
    
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length

    return {
      ...data,
      project_members: membersData || [],
      _counts: {
        tasks: tasks.length,
        completed_tasks: completedTasks,
        claims: claims.length,
        documents: documents.length,
        appointments: appointments.length
      }
    }
  } catch (error) {
    console.error('Error fetching project details:', error)
    throw error
  }
}

// Fetch tasks
const fetchProjectTasks = async (projectId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:user_profiles!tasks_assigned_to_fkey (
          id,
          first_name,
          surname,
          email,
          avatar_url,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching tasks:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.warn('Error in fetchProjectTasks:', error)
    return []
  }
}

// Fetch documents
const fetchProjectDocuments = async (projectId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by_user:user_profiles!documents_user_id_fkey (
          id,
          first_name,
          surname,
          email,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.warn('Error fetching documents:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.warn('Error in fetchProjectDocuments:', error)
    return []
  }
}

// Fetch claims
const fetchProjectClaims = async (projectId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching claims:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.warn('Error in fetchProjectClaims:', error)
    return []
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const projectId = id as string
  

  // Data fetching
  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectWithDetails(projectId),
    enabled: !!projectId
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
    enabled: !!projectId
  })

  const { data: documents = [] } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: () => fetchProjectDocuments(projectId),
    enabled: !!projectId
  })

  const { data: claims = [] } = useQuery({
    queryKey: ['project-claims', projectId],
    queryFn: () => fetchProjectClaims(projectId),
    enabled: !!projectId
  })

  // Computed values
  const projectStats = useMemo(() => {
    if (!project) return null
    
    const budget = project.project_financials?.[0]
    const taskCompletion = project._counts?.tasks ? 
      Math.round((project._counts.completed_tasks / project._counts.tasks) * 100) : 0
    const budgetProgress = budget?.budget_total ? 
      Math.round(((budget.budget_spent || 0) / budget.budget_total) * 100) : 0

    return {
      taskCompletion,
      budgetProgress,
      totalBudget: budget?.budget_total || 0,
      spentBudget: budget?.budget_spent || 0,
      remainingBudget: (budget?.budget_total || 0) - (budget?.budget_spent || 0),
      teamSize: project.project_members?.length || 0,
      ...project._counts
    }
  }, [project])

  // Helper functions
  const getStatusConfig = (status: string) => {
    return PROJECT_STATUSES[status as keyof typeof PROJECT_STATUSES] || PROJECT_STATUSES.active
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId)

      if (error) throw error
      await refetch()
      toast.success('Project status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto space-y-8">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load project. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(project.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant="outline" className="gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto p-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <Badge variant={projectStats?.taskCompletion >= 75 ? 'default' : 'secondary'}>
                  {projectStats?.taskCompletion >= 75 ? 'On Track' : 'In Progress'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Task Progress</p>
                <p className="text-2xl font-bold mb-2">{projectStats?.taskCompletion || 0}%</p>
                <Progress value={projectStats?.taskCompletion || 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {projectStats?.completed_tasks || 0} of {projectStats?.tasks || 0} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <Badge variant={projectStats?.budgetProgress >= 90 ? 'destructive' : 'default'}>
                  {projectStats?.budgetProgress || 0}% Used
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Budget</p>
                <p className="text-2xl font-bold">£{((projectStats?.totalBudget || 0) / 1000).toFixed(0)}k</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Spent: £{((projectStats?.spentBudget || 0) / 1000).toFixed(0)}k</span>
                  <span>Left: £{((projectStats?.remainingBudget || 0) / 1000).toFixed(0)}k</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <Button variant="ghost" size="sm" className="p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Team Members</p>
                <p className="text-2xl font-bold">{projectStats?.teamSize || 0}</p>
                <div className="flex -space-x-2 mt-2">
                  {project.project_members?.slice(0, 3).map((member, index) => (
                    <Avatar key={index} className="w-6 h-6 border-2 border-white">
                      <AvatarImage src={member.user_profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {member.user_profiles?.full_name ? member.user_profiles.full_name.split(' ').map(n => n[0]).join('') : member.user_profiles?.first_name?.[0] + member.user_profiles?.surname?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {(projectStats?.teamSize || 0) > 3 && (
                    <div className="w-6 h-6 bg-muted rounded-full border-2 border-white flex items-center justify-center text-xs">
                      +{(projectStats?.teamSize || 0) - 3}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Documents</p>
                <p className="text-2xl font-bold">{projectStats?.documents || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectStats?.claims || 0} claims filed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Overview - No duplicate tabs, focus on essential information */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Project Details and Contact Information */}
            <div className="space-y-6">
              <ProjectOverviewPanel project={project} />
            </div>
            
            {/* Project Status and Progress */}
            <div className="space-y-6">
              {/* Project Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Task Completion</span>
                      <span className="text-sm text-muted-foreground">{projectStats?.taskCompletion || 0}%</span>
                    </div>
                    <Progress value={projectStats?.taskCompletion || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectStats?.completed_tasks || 0} of {projectStats?.tasks || 0} tasks completed
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Budget Used</span>
                      <span className="text-sm text-muted-foreground">{projectStats?.budgetProgress || 0}%</span>
                    </div>
                    <Progress value={projectStats?.budgetProgress || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      £{((projectStats?.spentBudget || 0) / 1000).toFixed(0)}k of £{((projectStats?.totalBudget || 0) / 1000).toFixed(0)}k used
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{projectStats?.teamSize || 0}</p>
                      <p className="text-sm text-muted-foreground">Team Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{projectStats?.documents || 0}</p>
                      <p className="text-sm text-muted-foreground">Documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant="outline" className={`capitalize ${getStatusConfig(project.status).color.replace('bg-', 'border-')}`}>
                        {getStatusConfig(project.status).label}
                      </Badge>
                    </div>
                    
                    {project.current_stage && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Stage</span>
                        <span className="text-sm text-muted-foreground">{project.current_stage}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Updated</span>
                      <span className="text-sm text-muted-foreground">
                        {project.updated_at 
                          ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Created</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(project.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between" size="sm">
                        Change Status
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      {Object.entries(PROJECT_STATUSES).map(([key, config]) => {
                        const Icon = config.icon
                        return (
                          <DropdownMenuItem key={key} onClick={() => handleStatusUpdate(key)}>
                            <Icon className="w-4 h-4 mr-2" />
                            {config.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}