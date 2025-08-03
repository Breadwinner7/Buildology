'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  Plus, Search, Edit2, Save, X, ChevronLeft, ChevronRight, 
  AlertCircle, Loader2, RefreshCw, Filter, Calendar, Clock,
  CheckCircle2, AlertTriangle, Target, Users, Building2,
  UserCircle, MapPin, ArrowRight, FileText, Activity,
  BarChart3, TrendingUp, ListTodo, ArrowUpDown
} from 'lucide-react'

interface Task {
  id: string
  title: string
  project_id: string
  project_name?: string
  description?: string
  assigned_to: string | null
  assigned_email?: string
  status: string
  due_date: string | null
  priority?: string
  created_at: string
  team_id?: string
  team_name?: string
}

interface User {
  id: string
  email: string
  role?: string
  team_id?: string
  team_name?: string
  full_name?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status?: string
}

interface EditingTask {
  id: string
  field: string
  value: string
}

const ITEMS_PER_PAGE = 20

export default function ProjectTasksPage() {
  const params = useParams()
  // Handle both string and string[] types that useParams might return
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id as string
  
  // Debug log to check what we're getting
  useEffect(() => {
    console.log('Project ID from params:', projectId, 'Full params:', params)
  }, [projectId, params])

  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtering states
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [showOverdue, setShowOverdue] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  // Inline editing
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingFullTask, setEditingFullTask] = useState<Partial<Task> | null>(null)

  const fetchProjectData = async () => {
    // Check if we have a valid projectId first
    if (!projectId) {
      console.error('No project ID found')
      setError('No project ID provided')
      setLoading(false)
      return
    }

    console.log('Fetching data for project:', projectId)
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      // Fetch all data in parallel
      const [
        projectResponse,
        tasksResponse,
        projectMembersResponse,
        currentUserResponse
      ] = await Promise.all([
        // Fetch project details
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        
        // Fetch project tasks
        supabase
          .from('tasks')
          .select(`
            *,
            user_profiles:assigned_to (
              id,
              email,
              role,
              team_id,
              full_name
            )
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        
        // Fetch project members - simplified query
        supabase
          .from('project_members')
          .select('user_id, role')
          .eq('project_id', projectId),
        
        // Fetch current user
        user ? supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single() : { data: null, error: null }
      ])

      // Handle errors
      if (projectResponse.error) {
        console.error('Project fetch error:', projectResponse.error)
        throw projectResponse.error
      }
      if (tasksResponse.error) {
        console.error('Tasks fetch error:', tasksResponse.error)
        throw tasksResponse.error
      }
      if (projectMembersResponse.error) {
        console.error('Project members fetch error:', projectMembersResponse.error)
        throw projectMembersResponse.error
      }

      // Set project data
      if (projectResponse.data) {
        setProject(projectResponse.data)
      }

      // Process tasks data
      if (tasksResponse.data) {
        const formatted = tasksResponse.data.map((t: any) => ({
          ...t,
          assigned_email: t.user_profiles?.email,
          assigned_name: t.user_profiles?.full_name,
          project_name: projectResponse.data?.name,
          team_name: t.user_profiles?.team_name,
        }))
        setTasks(formatted)
      }

      // Fetch user profiles for project members
      if (projectMembersResponse.data && projectMembersResponse.data.length > 0) {
        const userIds = projectMembersResponse.data.map(pm => pm.user_id)
        const { data: userProfiles, error: userProfilesError } = await supabase
          .from('user_profiles')
          .select('id, email, role, team_id, full_name')
          .in('id', userIds)

        if (!userProfilesError && userProfiles) {
          const members = userProfiles.map((profile: any) => {
            const memberData = projectMembersResponse.data.find(pm => pm.user_id === profile.id)
            return {
              id: profile.id,
              email: profile.email,
              role: memberData?.role || profile.role,
              team_id: profile.team_id,
              full_name: profile.full_name,
            }
          })
          setUsers(members)
        }
      }
      
      if (currentUserResponse.data) setCurrentUser(currentUserResponse.data)
      
    } catch (error: any) {
      console.error('Error fetching project data:', error)
      setError(error.message || 'Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  // Real-time subscription
  useEffect(() => {
    if (!projectId || loading) return
    
    const subscription = supabase
      .channel(`project_tasks_${projectId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          fetchProjectData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [projectId, loading])

  // Inline editing functions
  const handleInlineEdit = (taskId: string, field: string, currentValue: string) => {
    setEditingTask({ id: taskId, field, value: currentValue })
  }

  const handleInlineSave = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ [editingTask.field]: editingTask.value })
        .eq('id', editingTask.id)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, [editingTask.field]: editingTask.value }
          : task
      ))
      
      setEditingTask(null)
    } catch (error: any) {
      console.error('Error updating task:', error)
      setError(error.message)
    }
  }

  const handleFullEdit = (task: Task) => {
    setEditingFullTask({ ...task })
    setEditDialogOpen(true)
  }

  const handleFullSave = async () => {
    if (!editingFullTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingFullTask.title,
          description: editingFullTask.description,
          status: editingFullTask.status,
          priority: editingFullTask.priority,
          due_date: editingFullTask.due_date,
          assigned_to: editingFullTask.assigned_to,
        })
        .eq('id', editingFullTask.id)

      if (error) throw error

      await fetchProjectData()
      setEditDialogOpen(false)
      setEditingFullTask(null)
    } catch (error: any) {
      console.error('Error updating task:', error)
      setError(error.message)
    }
  }

  // Toggle task status
  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id)

      if (error) throw error

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ))
    } catch (error: any) {
      console.error('Error updating task status:', error)
      setError(error.message)
    }
  }

  // Enhanced filtering and sorting
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.assigned_email?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      
      // User filter
      if (filterUser !== 'all') {
        if (filterUser === 'unassigned') {
          if (task.assigned_to !== null) return false
        } else {
          if (task.assigned_to !== filterUser) return false
        }
      }
      
      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false
      
      // Overdue filter
      if (showOverdue) {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
        if (!isOverdue) return false
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let compareValue = 0
      
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) compareValue = 0
          else if (!a.due_date) compareValue = 1
          else if (!b.due_date) compareValue = -1
          else compareValue = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
          
        case 'priority':
          const priorityOrder = { 'Urgent': 0, 'High': 1, 'Normal': 2, 'Low': 3 }
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
          compareValue = aPriority - bPriority
          break
          
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    return filtered
  }, [tasks, searchQuery, filterStatus, filterUser, filterPriority, showOverdue, sortBy, sortOrder])

  // Task statistics
  const taskStats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const todo = tasks.filter(t => t.status === 'todo').length
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
    const unassigned = tasks.filter(t => !t.assigned_to).length
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    // Tasks by user
    const tasksByUser = users.map(user => ({
      user,
      count: tasks.filter(t => t.assigned_to === user.id).length,
      completed: tasks.filter(t => t.assigned_to === user.id && t.status === 'done').length,
    })).sort((a, b) => b.count - a.count)

    return { total, completed, inProgress, todo, overdue, unassigned, completionRate, tasksByUser }
  }, [tasks, users])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedTasks, currentPage])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterUser, filterPriority, showOverdue])

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Urgent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>
      case 'Low':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Low</Badge>
      case 'Normal':
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Normal</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Done</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>
      case 'todo':
      default:
        return <Badge variant="outline">To Do</Badge>
    }
  }

  const renderEditableCell = (task: Task, field: keyof Task, value: string | null) => {
    const isEditing = editingTask?.id === task.id && editingTask?.field === field
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editingTask.value}
            onChange={(e) => setEditingTask(prev => prev ? { ...prev, value: e.target.value } : null)}
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave()
              if (e.key === 'Escape') setEditingTask(null)
            }}
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={handleInlineSave}>
            <Save className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingTask(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )
    }

    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
        onClick={() => handleInlineEdit(task.id, field, value || '')}
      >
        <span>{value || '-'}</span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  }

  const clearFilters = () => {
    setFilterStatus('all')
    setFilterUser('all')
    setFilterPriority('all')
    setShowOverdue(false)
    setSearchQuery('')
  }

  const hasActiveFilters = filterStatus !== 'all' || filterUser !== 'all' || filterPriority !== 'all' || showOverdue || searchQuery

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Project not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-blue-600" />
              Tasks
            </h1>
            <p className="text-muted-foreground">
              Manage tasks for {project.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProjectData}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <AddTaskModal 
              projectId={projectId}
              onTaskCreated={fetchProjectData}
            >
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </AddTaskModal>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
              <ListTodo className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <Progress value={taskStats.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
              </div>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">{taskStats.unassigned}</p>
              </div>
              <UserCircle className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {taskStats.tasksByUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskStats.tasksByUser.slice(0, 5).map(({ user, count, completed }) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-xs">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{count} tasks</p>
                      <p className="text-xs text-muted-foreground">{completed} completed</p>
                    </div>
                    <Progress 
                      value={count > 0 ? (completed / count) * 100 : 0} 
                      className="w-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select onValueChange={setFilterStatus} value={filterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned To</Label>
              <Select onValueChange={setFilterUser} value={filterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select onValueChange={setFilterPriority} value={filterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <Select 
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder]
                  setSortBy(field)
                  setSortOrder(order)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date-asc">Due Date (Earliest)</SelectItem>
                  <SelectItem value="due_date-desc">Due Date (Latest)</SelectItem>
                  <SelectItem value="priority-asc">Priority (High to Low)</SelectItem>
                  <SelectItem value="priority-desc">Priority (Low to High)</SelectItem>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              id="overdue" 
              checked={showOverdue} 
              onCheckedChange={setShowOverdue} 
            />
            <Label htmlFor="overdue" className="text-sm font-medium">
              Show only overdue tasks
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {filteredAndSortedTasks.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTasks.length)} of {filteredAndSortedTasks.length} tasks
            {filteredAndSortedTasks.length !== tasks.length && (
              <span className="ml-2 text-blue-600">
                (filtered from {tasks.length} total)
              </span>
            )}
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 bg-background rounded border">
                {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Task Table */}
      {filteredAndSortedTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {tasks.length === 0 
                ? "Get started by creating your first task"
                : "Try adjusting your filters or search criteria"
              }
            </p>
            {tasks.length === 0 && (
              <AddTaskModal projectId={projectId} onTaskCreated={fetchProjectData}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              </AddTaskModal>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-muted">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold">Task</TableHead>
                  <TableHead className="font-semibold">Assigned To</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.map((task) => {
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                  const isDueToday = task.due_date && 
                    new Date(task.due_date).toDateString() === new Date().toDateString()
                  const assignedUser = users.find(u => u.id === task.assigned_to)
                  
                  return (
                    <TableRow
                      key={task.id}
                      className={cn(
                        'group hover:bg-muted/50 transition-colors',
                        isOverdue && 'bg-red-50 border-l-4 border-l-red-400',
                        isDueToday && !isOverdue && 'bg-orange-50 border-l-4 border-l-orange-400',
                        task.status === 'done' && 'opacity-60'
                      )}
                    >
                      <TableCell className="py-4">
                        <div className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                          <div className="font-medium">
                            {renderEditableCell(task, 'title', task.title)}
                          </div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-md">
                              {task.description.length > 80 
                                ? `${task.description.slice(0, 80)}...` 
                                : task.description
                              }
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {assignedUser ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-xs">
                                  {(assignedUser.full_name || assignedUser.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {assignedUser.full_name || assignedUser.email}
                                </p>
                                {assignedUser.team_name && (
                                  <p className="text-xs text-muted-foreground">
                                    {assignedUser.team_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-2">
                              <UserCircle className="w-4 h-4" />
                              Unassigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(task.status)}
                      </TableCell>
                      
                      <TableCell>
                        {getPriorityBadge(task.priority)}
                      </TableCell>
                      
                      <TableCell>
                        {task.due_date ? (
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "font-medium",
                              isOverdue && 'text-red-600',
                              isDueToday && !isOverdue && 'text-orange-600'
                            )}>
                              {format(new Date(task.due_date), 'dd MMM yyyy')}
                            </span>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs w-fit">
                                Overdue
                              </Badge>
                            )}
                            {isDueToday && !isOverdue && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs w-fit">
                                Due Today
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No due date
                          </span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFullEdit(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Task
            </DialogTitle>
          </DialogHeader>
          {editingFullTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={editingFullTask.title || ''}
                  onChange={(e) => setEditingFullTask(prev => prev ? {...prev, title: e.target.value} : null)}
                  placeholder="Enter task title"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingFullTask.description || ''}
                  onChange={(e) => setEditingFullTask(prev => prev ? {...prev, description: e.target.value} : null)}
                  placeholder="Add task description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editingFullTask.status}
                    onValueChange={(value) => setEditingFullTask(prev => prev ? {...prev, status: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={editingFullTask.priority || 'Normal'}
                    onValueChange={(value) => setEditingFullTask(prev => prev ? {...prev, priority: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={editingFullTask.due_date ? new Date(editingFullTask.due_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingFullTask(prev => prev ? {...prev, due_date: e.target.value} : null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Assign to Team Member</Label>
                <Select
                  value={editingFullTask.assigned_to || 'unassigned'}
                  onValueChange={(value) => setEditingFullTask(prev => prev ? {...prev, assigned_to: value === 'unassigned' ? null : value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                        {user.team_name && (
                          <span className="text-muted-foreground ml-2">({user.team_name})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFullSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}