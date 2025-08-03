'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
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
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  Plus, Search, Edit2, Save, X, ChevronLeft, ChevronRight, 
  AlertCircle, Loader2, RefreshCw, Filter, Calendar, Clock,
  CheckCircle2, AlertTriangle, Target, Users, Building2,
  UserCircle, MapPin, ArrowRight, FileText, Activity
} from 'lucide-react'
import Link from 'next/link'

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
  user_profiles?: {
    id: string
    email: string
    full_name?: string
    role?: string
    team_id?: string
  }
  projects?: {
    id: string
    name: string
  }
  teams?: {
    id: string
    name: string
  }
}

interface User {
  id: string
  email: string
  role?: string
  team_id?: string
  team_name?: string
  full_name?: string
}

interface EditingTask {
  id: string
  field: string
  value: string
}

const ITEMS_PER_PAGE = 15

export default function AllTasksOverview() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtering states
  const [activeView, setActiveView] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [groupByProject, setGroupByProject] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  // Inline editing
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingFullTask, setEditingFullTask] = useState<Partial<Task> | null>(null)

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Get projects user has access to first
      const { data: userProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      const projectIds = userProjects?.map(p => p.project_id) || []

      if (projectIds.length === 0) {
        setTasks([])
        setLoading(false)
        return
      }
      
      const [
        tasksResponse,
        usersResponse,
        projectsResponse,
        teamsResponse,
        currentUserResponse
      ] = await Promise.all([
        // Fetch tasks with proper joins - only from projects user has access to
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
            ),
            projects:project_id (
              id,
              name
            ),
            teams:team_id (
              id,
              name
            )
          `)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }),
          
        // Fetch all user profiles for assignment dropdown
        supabase
          .from('user_profiles')
          .select(`
            id, 
            email, 
            role, 
            team_id, 
            full_name,
            teams:team_id (
              name
            )
          `),
          
        // Fetch projects user has access to
        supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds),
          
        supabase
          .from('teams')
          .select('id, name'),
          
        supabase
          .from('user_profiles')
          .select(`
            *, 
            teams:team_id (
              name
            )
          `)
          .eq('id', user.id)
          .single()
      ])

      // Check for errors
      if (tasksResponse.error) {
        console.error('Tasks fetch error:', tasksResponse.error)
        throw tasksResponse.error
      }
      if (usersResponse.error) {
        console.error('Users fetch error:', usersResponse.error)
        throw usersResponse.error
      }

      // Process tasks data
      if (tasksResponse.data) {
        const formatted = tasksResponse.data.map((t: any) => ({
          ...t,
          assigned_email: t.user_profiles?.email,
          assigned_name: t.user_profiles?.full_name,
          project_name: t.projects?.name,
          team_name: t.teams?.name,
        }))
        setTasks(formatted)
      }

      // Process users data
      if (usersResponse.data) {
        const formattedUsers = usersResponse.data.map((u: any) => ({
          ...u,
          team_name: u.teams?.name,
        }))
        setUsers(formattedUsers)
      }
      
      if (projectsResponse.data) setProjects(projectsResponse.data)
      if (teamsResponse.data) setTeams(teamsResponse.data)
      if (currentUserResponse.data) setCurrentUser(currentUserResponse.data)
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchAllData()
  }, [])

  // Real-time subscription
  useEffect(() => {
    if (loading) return
    
    const subscription = supabase
      .channel('all_tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          fetchAllData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loading])

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

      await fetchAllData()
      setEditDialogOpen(false)
      setEditingFullTask(null)
    } catch (error: any) {
      console.error('Error updating task:', error)
      setError(error.message)
    }
  }

  // Enhanced filtering and search logic
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.assigned_email?.toLowerCase().includes(searchLower) ||
          task.project_name?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // View-based filtering
      const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
      const dueToday = task.due_date && 
        new Date(task.due_date).toDateString() === new Date().toDateString()
      const dueThisWeek = task.due_date && 
        new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      if (activeView === 'overdue' && !overdue) return false
      if (activeView === 'today' && !dueToday) return false
      if (activeView === 'week' && !dueThisWeek) return false
      if (activeView === 'assigned' && task.assigned_to !== currentUser?.id) return false

      // Other filters
      if (overdueOnly && !overdue) return false
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (filterUser !== 'all' && task.assigned_to !== filterUser) return false
      if (filterProject !== 'all' && task.project_id !== filterProject) return false
      if (filterTeam !== 'all' && task.team_id !== filterTeam) return false
      
      // Role-based filtering
      if (filterRole !== 'all') {
        const assignedUser = users.find(u => u.id === task.assigned_to)
        if (!assignedUser || assignedUser.role !== filterRole) return false
      }

      return true
    })

    // Sort by priority and due date
    return filtered.sort((a, b) => {
      // Overdue tasks first
      const aOverdue = a.due_date && new Date(a.due_date) < new Date()
      const bOverdue = b.due_date && new Date(b.due_date) < new Date()
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      // Then by priority
      const priorityOrder = { 'Urgent': 0, 'High': 1, 'Normal': 2, 'Low': 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
      if (aPriority !== bPriority) return aPriority - bPriority

      // Finally by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      
      return 0
    })
  }, [tasks, searchQuery, activeView, filterStatus, filterUser, filterProject, filterTeam, filterRole, overdueOnly, users, currentUser?.id])

  // Task statistics
  const taskStats = useMemo(() => {
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
    const dueToday = tasks.filter(t => t.due_date && 
      new Date(t.due_date).toDateString() === new Date().toDateString()).length
    const dueThisWeek = tasks.filter(t => t.due_date && 
      new Date(t.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    const myTasks = tasks.filter(t => t.assigned_to === currentUser?.id).length

    return { overdue, dueToday, dueThisWeek, myTasks }
  }, [tasks, currentUser?.id])

  // Pagination logic
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTasks, currentPage])

  const groupTasks = groupByProject
    ? paginatedTasks.reduce<Record<string, Task[]>>((acc, task) => {
        const group = task.project_name || 'No Project'
        if (!acc[group]) acc[group] = []
        acc[group].push(task)
        return acc
      }, {})
    : { All: paginatedTasks }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Urgent':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        )
      case 'High':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            High
          </Badge>
        )
      case 'Low':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200">
            <Target className="w-3 h-3 mr-1" />
            Low
          </Badge>
        )
      case 'Normal':
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">
            <Activity className="w-3 h-3 mr-1" />
            Normal
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Done
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'todo':
      default:
        return (
          <Badge variant="outline">
            <Target className="w-3 h-3 mr-1" />
            To Do
          </Badge>
        )
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeView, filterStatus, filterUser, filterProject, filterTeam, filterRole, overdueOnly])

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
    setFilterProject('all')
    setFilterTeam('all')
    setFilterRole('all')
    setOverdueOnly(false)
    setGroupByProject(false)
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
              Task Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all project tasks across your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllData}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <AddTaskModal onTaskCreated={fetchAllData}>
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
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("cursor-pointer transition-colors", 
          activeView === 'overdue' && "ring-2 ring-red-500 bg-red-50"
        )} onClick={() => setActiveView(activeView === 'overdue' ? 'all' : 'overdue')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("cursor-pointer transition-colors", 
          activeView === 'today' && "ring-2 ring-orange-500 bg-orange-50"
        )} onClick={() => setActiveView(activeView === 'today' ? 'all' : 'today')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-orange-600">{taskStats.dueToday}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("cursor-pointer transition-colors", 
          activeView === 'week' && "ring-2 ring-blue-500 bg-blue-50"
        )} onClick={() => setActiveView(activeView === 'week' ? 'all' : 'week')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-blue-600">{taskStats.dueThisWeek}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("cursor-pointer transition-colors", 
          activeView === 'assigned' && "ring-2 ring-green-500 bg-green-50"
        )} onClick={() => setActiveView(activeView === 'assigned' ? 'all' : 'assigned')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Tasks</p>
                <p className="text-2xl font-bold text-green-600">{taskStats.myTasks}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, descriptions, assignees, or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4" />
                        {u.full_name || u.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project</Label>
              <Select onValueChange={setFilterProject} value={filterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Team</Label>
              <Select onValueChange={setFilterTeam} value={filterTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Select onValueChange={setFilterRole} value={filterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="surveyor">Surveyor</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex items-center gap-8 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch id="group" checked={groupByProject} onCheckedChange={setGroupByProject} />
              <Label htmlFor="group" className="text-sm font-medium">Group by project</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active View Indicator */}
      {activeView !== 'all' && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Active View</Badge>
            <span className="font-medium">
              {activeView === 'overdue' && 'Showing overdue tasks'}
              {activeView === 'today' && 'Showing tasks due today'}
              {activeView === 'week' && 'Showing tasks due this week'}
              {activeView === 'assigned' && 'Showing my assigned tasks'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveView('all')}>
            Show All Tasks
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <span>
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length} tasks
          {filteredTasks.length !== tasks.length && (
            <span className="ml-2 text-blue-600 font-medium">
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

      {/* Task Table */}
      {filteredTasks.length === 0 ? (
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
              <AddTaskModal onTaskCreated={fetchAllData}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              </AddTaskModal>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupTasks).map(([group, groupedTasks]) => (
          <div key={group} className="space-y-4">
            {groupByProject && group !== 'All' && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-semibold">{group}</h3>
                  <Badge variant="outline">{groupedTasks.length} tasks</Badge>
                </div>
                {groupedTasks.length > 0 && groupedTasks[0].project_id && (
                  <Link href={`/projects/${groupedTasks[0].project_id}`}>
                    <Button variant="outline" size="sm">
                      View Project
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-muted">
                      <TableHead className="w-12">Done</TableHead>
                      <TableHead className="font-semibold">Task</TableHead>
                      <TableHead className="font-semibold">Project</TableHead>
                      <TableHead className="font-semibold">Assigned</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Priority</TableHead>
                      <TableHead className="font-semibold">Due Date</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedTasks.map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                      const isDueToday = task.due_date && 
                        new Date(task.due_date).toDateString() === new Date().toDateString()
                      
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
                            <Checkbox
                              checked={task.status === 'done'}
                              onCheckedChange={() => toggleTaskStatus(task)}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </TableCell>
                          
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
                            {task.project_name ? (
                              <Link 
                                href={`/projects/${task.project_id}`}
                                className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                              >
                                <Building2 className="w-3 h-3" />
                                {task.project_name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                No Project
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {task.assigned_email ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-xs">
                                      {(task.assigned_name || task.assigned_email).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium">{task.assigned_name || task.assigned_email}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-2">
                                  <UserCircle className="w-4 h-4" />
                                  Unassigned
                                </span>
                              )}
                              {task.team_name && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  <Users className="w-3 h-3 mr-1" />
                                  {task.team_name}
                                </Badge>
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
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(task.due_date), 'HH:mm')}
                                </span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs w-fit">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                                {isDueToday && !isOverdue && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs w-fit">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Due Today
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
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
          </div>
        ))
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
                <Label>Due Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={editingFullTask.due_date ? new Date(editingFullTask.due_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingFullTask(prev => prev ? {...prev, due_date: e.target.value} : null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Assign to Team Member</Label>
                <Select
                  value={editingFullTask.assigned_to || ''}
                  onValueChange={(value) => setEditingFullTask(prev => prev ? {...prev, assigned_to: value || null} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          {user.full_name || user.email}
                          {user.team_name && (
                            <span className="text-muted-foreground">({user.team_name})</span>
                          )}
                        </div>
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