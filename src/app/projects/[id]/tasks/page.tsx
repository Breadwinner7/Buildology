'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { 
  useProjectTasks, 
  useAssignableUsers, 
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
  type UpdateTaskData,
  type TaskStatus,
  type TaskPriority
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  Target,
  Timer,
  CheckSquare,
  XCircle,
  Play,
  Pause
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

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

// Task creation/edit dialog
function TaskDialog({ 
  task, 
  open, 
  onOpenChange,
  projectId
}: { 
  task?: EnhancedTask
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date?.split('T')[0] || '', // Convert to date input format
    priority: task?.priority || 'normal' as TaskPriority
  })

  const { data: users = [] } = useAssignableUsers()
  const { createTask, updateTask } = useTaskMutations()

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return // Don't close the dialog if validation fails
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    const taskData = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
    }

    try {
      if (task) {
        await updateTask.mutateAsync({ taskId: task.id, updates: taskData })
      } else {
        await createTask.mutateAsync(taskData as CreateTaskData)
      }
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving task:', error)
      setErrors({ submit: error?.message || 'Failed to save task. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

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
          {errors.submit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">Task Title*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Clean task card matching documents page style
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
        return <Badge className="bg-red-500 text-white text-xs shadow-sm">URGENT</Badge>
      case 'high':
        return <Badge className="bg-orange-500 text-white text-xs shadow-sm">HIGH</Badge>
      case 'overdue':
        return <Badge className="bg-red-600 text-white text-xs shadow-sm">OVERDUE</Badge>
      case 'due_soon':
        return <Badge className="bg-amber-500 text-white text-xs shadow-sm">DUE SOON</Badge>
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

  const handleQuickAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (action === 'complete') {
      onStatusChange('done')
    } else if (action === 'edit') {
      onEdit()
    }
  }

  return (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-200 border-0 shadow-sm hover:scale-[1.02] cursor-pointer",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50",
        task.status === 'done' && "opacity-75"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4 h-full flex flex-col">
        {/* Status indicator section */}
        <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-xl mb-3 overflow-hidden relative shadow-inner">
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className={cn(
              "p-3 rounded-full mb-2 shadow-sm",
              task.status === 'todo' && "bg-gray-100 text-gray-600",
              task.status === 'in_progress' && "bg-blue-100 text-blue-600",
              task.status === 'done' && "bg-green-100 text-green-600"
            )}>
              {task.status === 'todo' && <ClipboardList className="w-6 h-6" />}
              {task.status === 'in_progress' && <Timer className="w-6 h-6" />}
              {task.status === 'done' && <CheckCircle className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium">{getTaskStatusLabel(task.status)}</span>
          </div>
          
          {/* Hover actions overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-4">
            <div className="flex gap-2">
              {task.status !== 'done' && (
                <Button size="sm" variant="secondary" onClick={(e) => handleQuickAction('complete', e)} className="shadow-lg">
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={(e) => handleQuickAction('edit', e)} className="shadow-lg">
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Priority and urgency indicators */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Badge variant="secondary" className="text-xs shadow-sm">
              {getTaskPriorityLabel(task.priority)}
            </Badge>
            {getUrgencyBadge()}
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Task info */}
        <div className="space-y-2 flex-1 flex flex-col">
          <h4 className="font-medium text-sm truncate" title={task.title}>
            {task.title}
          </h4>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getTaskStatusLabel(task.status)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getTaskPriorityLabel(task.priority)}
            </Badge>
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span title={format(new Date(task.due_date), 'PPpp')}>
                {isToday(new Date(task.due_date)) 
                  ? 'Today'
                  : isTomorrow(new Date(task.due_date))
                  ? 'Tomorrow'
                  : format(new Date(task.due_date), 'MMM d, yyyy • h:mm a')
                }
              </span>
            </div>
          )}

          {task.assigned_user && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{task.assigned_user.first_name} {task.assigned_user.surname}</span>
            </div>
          )}

          {/* Actions menu */}
          <div className="mt-auto pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange('todo') }}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange('in_progress') }}>
                  <Play className="w-4 h-4 mr-2" />
                  Mark in Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange('done') }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Done
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                      <span className="text-sm font-medium">
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

// Main project tasks page
export default function ProjectTasksPage() {
  const params = useParams()
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id as string
  const { user } = useUser()
  
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
  const projectTasksQuery = useProjectTasks(projectId)
  const { data: users = [] } = useAssignableUsers()
  const { updateTask, deleteTask, bulkUpdate } = useTaskMutations()

  const currentTasks = projectTasksQuery.data || []
  const isLoading = projectTasksQuery.isLoading
  const error = projectTasksQuery.error

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return currentTasks.filter(task => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const searchableText = [
          task.title,
          task.description,
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

      if (filters.overdue && !isTaskOverdue(task.due_date, task.status)) {
        return false
      }

      return true
    })
  }, [currentTasks, filters])

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
            <h1 className="text-3xl font-bold tracking-tight">Project Tasks</h1>
            <p className="text-muted-foreground">
              Manage tasks for this project
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => projectTasksQuery.refetch()}>
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

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 max-w-md"
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
        </div>

        {/* Task Content */}
        {filteredTasks.length > 0 ? (
          <TaskListView
            tasks={filteredTasks}
            onEdit={setEditingTask}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteTask}
            selectedTasks={selectedTasks}
            onSelectTasks={setSelectedTasks}
          />
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-6">
                {currentTasks.length === 0 
                  ? "Get started by creating your first task."
                  : "No tasks match your current filters."
                }
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <TaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
        />

        <TaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(undefined)}
          projectId={projectId}
        />
      </div>
    </div>
  )
}