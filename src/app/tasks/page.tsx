'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { 
  useTasks, 
  useMyTasks, 
  useAssignableUsers, 
  useTaskProjects,
  useTaskMutations,
  getTaskStatusColor,
  getTaskPriorityColor,
  getTaskStatusLabel,
  getTaskPriorityLabel,
  isTaskOverdue,
  getTaskUrgency,
  type EnhancedTask,
  type TaskFilters,
  type CreateTaskData,
  type UpdateTaskData
} from '@/hooks/useTaskManagement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Toggle } from '@/components/ui/toggle'
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  Building2,
  Flag,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  MoreHorizontal,
  Users,
  Timer,
  CheckSquare,
  XCircle,
  Play,
  Pause,
  Loader2,
  Grid3X3,
  List,
  Kanban,
  SortAsc,
  SortDesc,
  Filter as FilterIcon,
  X,
  Eye,
  Calendar as CalendarIcon,
  ArrowUpDown
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types/database'

type ViewMode = 'cards' | 'list' | 'kanban'
type SortField = 'created_at' | 'due_date' | 'priority' | 'status' | 'title'
type SortOrder = 'asc' | 'desc'

const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'done', label: 'Completed', color: 'bg-green-500' }
]

const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
]

// World-class task creation/edit modal with guided UX
function TaskDialog({ 
  task, 
  open, 
  onOpenChange 
}: { 
  task?: EnhancedTask
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    project_id: task?.project_id || '',
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date?.split('T')[0] || '', // Convert to date input format
    priority: task?.priority || 'normal' as TaskPriority
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: projects = [] } = useTaskProjects()
  const { data: users = [] } = useAssignableUsers()
  const { createTask, updateTask } = useTaskMutations()

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {}
    
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Task title is required'
      if (!formData.project_id) newErrors.project_id = 'Please select a project'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return
    
    setIsSubmitting(true)
    
    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
      }

      if (task) {
        await updateTask.mutateAsync({ taskId: task.id, updates: taskData })
      } else {
        await createTask.mutateAsync(taskData as CreateTaskData)
      }
      
      // Reset form and close modal
      setFormData({
        project_id: '',
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        priority: 'normal'
      })
      setCurrentStep(1)
      setErrors({})
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving task:', error)
      setErrors({ submit: 'Failed to save task. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      project_id: task?.project_id || '',
      title: task?.title || '',
      description: task?.description || '',
      assigned_to: task?.assigned_to || '',
      due_date: task?.due_date?.split('T')[0] || '',
      priority: task?.priority || 'normal'
    })
    setCurrentStep(1)
    setErrors({})
  }

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, task])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and assignments.' : 'Create a new task and assign it to a team member.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description and requirements"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project*</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.first_name?.[0]}{user.surname?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {user.first_name} {user.surname}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
              {createTask.isPending || updateTask.isPending ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Professional task card component
function TaskCard({ 
  task, 
  onEdit, 
  onStatusChange, 
  onDelete,
  isSelected,
  onSelect
}: { 
  task: EnhancedTask
  onEdit: () => void
  onStatusChange: (status: TaskStatus) => void
  onDelete: () => void
  isSelected?: boolean
  onSelect?: (selected: boolean, ctrlKey?: boolean) => void
}) {
  const urgency = getTaskUrgency(task)
  const isOverdue = isTaskOverdue(task.due_date, task.status)
  const router = useRouter()

  const getUrgencyBadge = () => {
    switch (urgency) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs font-medium">URGENT</Badge>
      case 'high':
        return <Badge className="bg-orange-500 text-white text-xs font-medium">HIGH</Badge>
      case 'overdue':
        return <Badge variant="destructive" className="text-xs font-medium animate-pulse">OVERDUE</Badge>
      case 'due_soon':
        return <Badge className="bg-amber-500 text-white text-xs font-medium">DUE SOON</Badge>
      default:
        return null
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      onSelect?.(!isSelected, true)
    }
  }

  const handleStatusChange = (e: React.MouseEvent, newStatus: TaskStatus) => {
    e.stopPropagation()
    onStatusChange(newStatus)
  }

  return (
    <Card 
      className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer relative",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/50",
        task.status === 'done' && "opacity-80",
        isOverdue && task.status !== 'done' && "border-red-200 bg-red-50/30"
      )}
      onClick={handleCardClick}
    >
      {isSelected && (
        <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-none truncate mb-2" title={task.title}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            {getUrgencyBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'todo')}>
                  <XCircle className="w-4 h-4 mr-2" />
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'in_progress')}>
                  <Play className="w-4 h-4 mr-2" />
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'done')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Status and Priority Row */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium",
                task.status === 'todo' && "border-gray-300 text-gray-700",
                task.status === 'in_progress' && "border-blue-300 text-blue-700 bg-blue-50",
                task.status === 'done' && "border-green-300 text-green-700 bg-green-50"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mr-1.5",
                task.status === 'todo' && "bg-gray-400",
                task.status === 'in_progress' && "bg-blue-500",
                task.status === 'done' && "bg-green-500"
              )} />
              {getTaskStatusLabel(task.status)}
            </Badge>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium",
                task.priority === 'low' && "border-gray-300 text-gray-600",
                task.priority === 'normal' && "border-blue-300 text-blue-600",
                task.priority === 'high' && "border-orange-300 text-orange-600 bg-orange-50",
                task.priority === 'urgent' && "border-red-300 text-red-600 bg-red-50"
              )}
            >
              <Flag className="w-3 h-3 mr-1" />
              {getTaskPriorityLabel(task.priority)}
            </Badge>
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              isOverdue && task.status !== 'done' ? "text-red-600" : "text-muted-foreground"
            )}>
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isToday(new Date(task.due_date)) 
                  ? 'Due Today'
                  : isTomorrow(new Date(task.due_date))
                  ? 'Due Tomorrow'
                  : `Due ${format(new Date(task.due_date), 'MMM d, yyyy')}`
                }
              </span>
              {isOverdue && task.status !== 'done' && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
          )}

          {/* Project */}
          {task.project && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span 
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/projects/${task.project?.id}`)
                }} 
                className="hover:text-blue-600 cursor-pointer font-medium"
              >
                {task.project.name}
              </span>
            </div>
          )}

          {/* Assignee */}
          {task.assigned_user && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="w-4 h-4">
                <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                <AvatarFallback className="text-xs font-medium">
                  {task.assigned_user.first_name?.[0]}{task.assigned_user.surname?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{task.assigned_user.first_name} {task.assigned_user.surname}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status !== 'done' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 px-2 text-xs"
                onClick={(e) => handleStatusChange(e, 'done')}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-2 text-xs"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Professional task list component
function TaskListView({ 
  tasks,
  onEdit,
  onStatusChange,
  onDelete,
  selectedTasks,
  onSelectTasks
}: {
  tasks: EnhancedTask[]
  onEdit: (task: EnhancedTask) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  selectedTasks: string[]
  onSelectTasks: (taskIds: string[]) => void
}) {
  const router = useRouter()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectTasks(tasks.map(task => task.id))
    } else {
      onSelectTasks([])
    }
  }

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      onSelectTasks([...selectedTasks, taskId])
    } else {
      onSelectTasks(selectedTasks.filter(id => id !== taskId))
    }
  }

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <Flag className="w-4 h-4 text-red-500" />
      case 'high': return <Flag className="w-4 h-4 text-orange-500" />
      case 'normal': return <Flag className="w-4 h-4 text-blue-500" />
      case 'low': return <Flag className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return <XCircle className="w-4 h-4 text-gray-500" />
      case 'in_progress': return <Timer className="w-4 h-4 text-blue-500" />
      case 'done': return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="font-semibold">Task</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold">Due Date</TableHead>
            <TableHead className="font-semibold">Project</TableHead>
            <TableHead className="font-semibold">Assignee</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const isOverdue = isTaskOverdue(task.due_date, task.status)
            const isSelected = selectedTasks.includes(task.id)
            
            return (
              <TableRow 
                key={task.id} 
                className={cn(
                  "group cursor-pointer hover:bg-muted/50",
                  isSelected && "bg-blue-50 hover:bg-blue-100",
                  task.status === 'done' && "opacity-70",
                  isOverdue && task.status !== 'done' && "bg-red-50/50"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                    aria-label={`Select task ${task.title}`}
                  />
                </TableCell>
                
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <span className="text-sm font-medium">{getTaskStatusLabel(task.status)}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(task.priority)}
                    <span className="text-sm font-medium">{getTaskPriorityLabel(task.priority)}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {task.due_date ? (
                    <div className={cn(
                      "text-sm flex items-center gap-1",
                      isOverdue && task.status !== 'done' && "text-red-600 font-medium"
                    )}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {isToday(new Date(task.due_date))
                          ? 'Today'
                          : isTomorrow(new Date(task.due_date))
                          ? 'Tomorrow'
                          : format(new Date(task.due_date), 'MMM d, yyyy')
                        }
                      </span>
                      {isOverdue && task.status !== 'done' && (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No due date</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {task.project ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span 
                        onClick={() => router.push(`/projects/${task.project?.id}`)}
                        className="text-sm hover:text-blue-600 cursor-pointer font-medium"
                      >
                        {task.project.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No project</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {task.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assigned_user.first_name?.[0]}{task.assigned_user.surname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {task.assigned_user.first_name} {task.assigned_user.surname}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'todo')}>
                        <XCircle className="w-4 h-4 mr-2" />
                        To Do
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                        <Play className="w-4 h-4 mr-2" />
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'done')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

// Main tasks page
export default function TasksPage() {
  const { user } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filters, setFilters] = useState<Partial<TaskFilters>>({
    search: '',
    status: [],
    priority: [],
    assignee: [],
    project: [],
    overdue: false,
    myTasks: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EnhancedTask | undefined>()

  // Data fetching
  const allTasksQuery = useTasks(activeTab === 'all' ? filters : undefined)
  const myTasksQuery = useMyTasks()
  
  const { data: projects = [] } = useTaskProjects()
  const { data: users = [] } = useAssignableUsers()
  const { updateTask, deleteTask, bulkUpdate } = useTaskMutations()

  const currentTasks = activeTab === 'my' ? myTasksQuery.data || [] : allTasksQuery.data || []
  const isLoading = activeTab === 'my' ? myTasksQuery.isLoading : allTasksQuery.isLoading
  const error = activeTab === 'my' ? myTasksQuery.error : allTasksQuery.error

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = currentTasks.filter(task => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const searchableText = [
          task.title,
          task.description,
          task.project?.name,
          task.assigned_user?.first_name,
          task.assigned_user?.surname
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
      }

      if (filters.status && filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false
      }

      if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false
      }

      if (filters.assignee && filters.assignee.length > 0) {
        if (filters.assignee.includes('unassigned')) {
          if (!task.assigned_to && !filters.assignee.some(id => id !== 'unassigned'))
            return true
        }
        if (task.assigned_to && !filters.assignee.includes(task.assigned_to))
          return false
        if (!task.assigned_to && !filters.assignee.includes('unassigned'))
          return false
      }

      if (filters.project && filters.project.length > 0) {
        if (!task.project_id || !filters.project.includes(task.project_id))
          return false
      }

      if (filters.overdue && !isTaskOverdue(task.due_date, task.status)) {
        return false
      }

      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'status':
          const statusOrder = { 'todo': 0, 'in_progress': 1, 'done': 2 }
          aValue = statusOrder[a.status]
          bValue = statusOrder[b.status]
          break
        case 'priority':
          const priorityOrder = { 'low': 0, 'normal': 1, 'high': 2, 'urgent': 3 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date) : new Date(8640000000000000) // Far future for no due date
          bValue = b.due_date ? new Date(b.due_date) : new Date(8640000000000000)
          break
        case 'created_at':
        default:
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [currentTasks, filters, sortField, sortOrder])

  // Task statistics
  const taskStats = useMemo(() => {
    const total = filteredTasks.length
    const todo = filteredTasks.filter(t => t.status === 'todo').length
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length
    const done = filteredTasks.filter(t => t.status === 'done').length
    const overdue = filteredTasks.filter(t => isTaskOverdue(t.due_date, t.status)).length
    const urgent = filteredTasks.filter(t => t.priority === 'urgent').length

    return { total, todo, inProgress, done, overdue, urgent }
  }, [filteredTasks])

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ taskId, updates: { status } })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await deleteTask.mutateAsync(taskId)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (selectedTasks.length === 0) return
    
    try {
      await bulkUpdate.mutateAsync({ taskIds: selectedTasks, updates: { status } })
      setSelectedTasks([])
    } catch (error) {
      console.error('Error updating tasks:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-48" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground">
              Organize and track tasks across all your projects
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => allTasksQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load tasks. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{taskStats.total}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">To Do</p>
                  <p className="text-2xl font-bold">{taskStats.todo}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{taskStats.inProgress}</p>
                </div>
                <Timer className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{taskStats.done}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">{taskStats.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold">{taskStats.urgent}</p>
                </div>
                <Flag className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <TabsList>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    All Tasks
                  </TabsTrigger>
                  <TabsTrigger value="my" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    My Tasks
                  </TabsTrigger>
                </TabsList>
                
                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="px-3"
                    onClick={() => setViewMode('cards')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="px-3"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10 w-64"
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
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={filters.status?.join(',') || ''}
                        onValueChange={(value) => 
                          setFilters({ ...filters, status: value ? value.split(',') as TaskStatus[] : [] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {TASK_STATUSES.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", status.color)} />
                                {status.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={filters.priority?.join(',') || ''}
                        onValueChange={(value) => 
                          setFilters({ ...filters, priority: value ? value.split(',') as TaskPriority[] : [] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All priorities</SelectItem>
                          {TASK_PRIORITIES.map(priority => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                                {priority.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 mt-6">
                      <Checkbox
                        id="overdue"
                        checked={filters.overdue || false}
                        onCheckedChange={(checked) => 
                          setFilters({ ...filters, overdue: !!checked })
                        }
                      />
                      <Label htmlFor="overdue">Show only overdue tasks</Label>
                    </div>

                    <div className="flex items-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({})}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions */}
            {selectedTasks.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChange('todo')}
                        disabled={bulkUpdate.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Mark as To Do
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChange('in_progress')}
                        disabled={bulkUpdate.isPending}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Mark In Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChange('done')}
                        disabled={bulkUpdate.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark as Done
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTasks([])}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task Content with view modes */}
            <TabsContent value="all" className="mt-6">
              {filteredTasks.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onSelect={(selected, ctrlKey) => {
                          if (ctrlKey) {
                            if (selected) {
                              setSelectedTasks([...selectedTasks, task.id])
                            } else {
                              setSelectedTasks(selectedTasks.filter(id => id !== task.id))
                            }
                          }
                        }}
                        onEdit={() => setEditingTask(task)}
                        onStatusChange={(status) => handleStatusChange(task.id, status)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <TaskListView
                    tasks={filteredTasks}
                    onEdit={setEditingTask}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    selectedTasks={selectedTasks}
                    onSelectTasks={setSelectedTasks}
                  />
                )
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                    <p className="text-muted-foreground mb-6">
                      {filters.search || (filters.status && filters.status.length > 0) || (filters.priority && filters.priority.length > 0) || filters.overdue
                        ? "No tasks match your current filters."
                        : "Get started by creating your first task."
                      }
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="my" className="mt-6">
              {(myTasksQuery.data || []).length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {(myTasksQuery.data || []).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onSelect={(selected, ctrlKey) => {
                          if (ctrlKey) {
                            if (selected) {
                              setSelectedTasks([...selectedTasks, task.id])
                            } else {
                              setSelectedTasks(selectedTasks.filter(id => id !== task.id))
                            }
                          }
                        }}
                        onEdit={() => setEditingTask(task)}
                        onStatusChange={(status) => handleStatusChange(task.id, status)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <TaskListView
                    tasks={myTasksQuery.data || []}
                    onEdit={setEditingTask}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    selectedTasks={selectedTasks}
                    onSelectTasks={setSelectedTasks}
                  />
                )
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No tasks assigned to you</h3>
                    <p className="text-muted-foreground mb-6">
                      You don't have any tasks assigned to you at the moment.
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <TaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <TaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(undefined)}
        />
      </div>
    </div>
  )
}