'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { AlertCircle, CalendarIcon, Loader2, Plus, UserCircle, Building2 } from 'lucide-react'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'

const PREDEFINED_TASKS = [
  'Speak to customer',
  'Obtain material choices', 
  'Book contractor visit',
  'Upload documents',
  'Confirm access date',
  'Follow-up with surveyor',
  'Schedule start date',
  'Site assessment',
  'Quote preparation',
  'Contract review',
  'Planning permission',
  'Building control notification',
  'Material ordering',
  'Quality inspection',
  'Final walkthrough',
  'Invoice preparation'
]

interface AddTaskModalProps {
  projectId?: string
  onTaskAdded?: () => void
  onTaskCreated?: () => void
  children?: React.ReactNode
}

export function AddTaskModal({ projectId, onTaskAdded, onTaskCreated, children }: AddTaskModalProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<{ id: string, email: string, full_name?: string, team_id?: string, role?: string }[]>([])
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [taskTitle, setTaskTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal')
  const [dueDate, setDueDate] = useState<Date | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('User not authenticated')
          return
        }

        // Get current user details
        const { data: currentUserData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (currentUserData) {
          setCurrentUser(currentUserData)
        }

        // If no projectId provided, fetch user's accessible projects
        if (!projectId) {
          const { data: userProjects } = await supabase
            .from('project_members')
            .select(`
              project_id,
              projects:project_id (
                id,
                name
              )
            `)
            .eq('user_id', user.id)

          const accessibleProjects = userProjects?.map(pm => pm.projects).filter(Boolean) || []
          setProjects(accessibleProjects)
        }

        // Fetch users for assignment - get all users from projects the current user has access to
        let userQuery = supabase
          .from('user_profiles')
          .select('id, email, full_name, team_id, role')

        if (projectId) {
          // If we have a specific project, get only members of that project
          const { data: projectMembers } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId)

          const memberIds = projectMembers?.map(pm => pm.user_id) || []
          if (memberIds.length > 0) {
            userQuery = userQuery.in('id', memberIds)
          }
        } else {
          // Get users from all accessible projects
          const { data: userProjects } = await supabase
            .from('project_members')
            .select('user_id, project_id')
            .eq('user_id', user.id)

          const projectIds = userProjects?.map(pm => pm.project_id) || []
          
          if (projectIds.length > 0) {
            const { data: allProjectMembers } = await supabase
              .from('project_members')
              .select('user_id')
              .in('project_id', projectIds)

            const allMemberIds = [...new Set(allProjectMembers?.map(pm => pm.user_id) || [])]
            if (allMemberIds.length > 0) {
              userQuery = userQuery.in('id', allMemberIds)
            }
          }
        }

        const { data: usersData } = await userQuery
        if (usersData) {
          setUsers(usersData)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load data')
      }
    }
    
    if (open) {
      fetchData()
    }
  }, [open, projectId])

  const handleCreateTask = async () => {
    setError(null)
    setLoading(true)
    
    try {
      // Validate required fields
      if (!taskTitle && !customTitle.trim()) {
        setError('Please select a predefined task or enter a custom title')
        return
      }

      if (!selectedProjectId && !projectId) {
        setError('Please select a project')
        return
      }

      const finalProjectId = selectedProjectId || projectId
      
      // Check if user has access to the selected project
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      const { data: memberCheck } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', finalProjectId)
        .eq('user_id', user.id)
        .single()

      if (!memberCheck) {
        setError('You do not have permission to create tasks in this project')
        return
      }

      // Create the task title
      let fullTitle = ''
      if (taskTitle && customTitle.trim()) {
        fullTitle = `${taskTitle}: ${customTitle.trim()}`
      } else if (taskTitle) {
        fullTitle = taskTitle
      } else {
        fullTitle = customTitle.trim()
      }

      // Get the team_id from the assigned user if available
      const assignedUser = users.find(u => u.id === assignedTo)
      const teamId = assignedUser?.team_id || currentUser?.team_id || null

      const taskData = {
        title: fullTitle,
        description: description.trim() || null,
        assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
        due_date: dueDate ? dueDate.toISOString() : null,
        priority,
        project_id: finalProjectId,
        team_id: teamId,
        status: 'todo'
      }

      console.log('Creating task with data:', taskData)

      const { error: insertError, data } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      console.log('Task created successfully:', data)

      // Reset form
      resetForm()
      setOpen(false)

      // Call callbacks
      onTaskAdded?.()
      onTaskCreated?.()
      
    } catch (error: any) {
      console.error('Error creating task:', error)
      setError(error.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTaskTitle('')
    setCustomTitle('')
    setDescription('')
    setAssignedTo(null)
    setPriority('Normal')
    setDueDate(null)
    setSelectedProjectId(projectId || '')
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Predefined Task Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Predefined Task</Label>
            <Select onValueChange={setTaskTitle} value={taskTitle}>
              <SelectTrigger>
                <SelectValue placeholder="Select a predefined task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None - Custom Task Only</SelectItem>
                {PREDEFINED_TASKS.map(task => (
                  <SelectItem key={task} value={task}>{task}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {taskTitle ? 'Additional Details (optional)' : 'Task Title'}
              {!taskTitle && <span className="text-red-500">*</span>}
            </Label>
            <Input
              placeholder={taskTitle ? "e.g., 'about roof tiles' or 'for kitchen extension'" : "Enter custom task title"}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
            {taskTitle && customTitle && (
              <p className="text-xs text-muted-foreground">
                Full title will be: "{taskTitle}: {customTitle}"
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              placeholder="Add detailed task description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Project Selection - only show if projectId is not provided */}
          {!projectId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Project <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignment and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assign to</Label>
              <Select onValueChange={setAssignedTo} value={assignedTo || 'unassigned'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      Unassigned
                    </div>
                  </SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-xs">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{user.full_name || user.email}</span>
                        {user.role && (
                          <span className="text-xs text-muted-foreground">({user.role})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select onValueChange={(val) => setPriority(val as 'Low' | 'Normal' | 'High' | 'Urgent')} value={priority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="Normal">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Normal
                    </div>
                  </SelectItem>
                  <SelectItem value="High">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="Urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select due date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate || undefined}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={loading || (!taskTitle && !customTitle.trim())}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}