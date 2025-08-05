'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRole } from '@/hooks/useRole'
import { useRealtime } from '@/hooks/useRealtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  project_id: string
  title: string
  description?: string | null
  status: string
  assigned_to: string | null
  due_date: string | null
  created_at: string
}

interface User {
  id: string
  email: string
}

const PREDEFINED_TASKS = [
  'Speak to customer',
  'Obtain material choices',
  'Book contractor visit',
  'Upload documents',
  'Confirm access date',
  'Follow-up with surveyor',
  'Schedule start date'
]

export default function TasksModule({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const role = useRole()

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (!error) setTasks(data)
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email')

    if (!error) setUsers(data)
  }

  useEffect(() => {
    fetchTasks()
    fetchUsers()
  }, [projectId])

  useRealtime({
    table: 'tasks',
    filterColumn: 'project_id',
    filterValue: projectId,
    onInsert: (task) => setTasks(prev => [task, ...prev]),
    onUpdate: (task) => setTasks(prev => prev.map(t => (t.id === task.id ? task : t))),
    onDelete: (task) => setTasks(prev => prev.filter(t => t.id !== task.id)),
  })

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done') return false
    const due = new Date(task.due_date)
    return due < new Date()
  }

  const createTask = async () => {
    if (!taskTitle.trim()) return

    const fullTitle = customTitle.trim() ? `${taskTitle}: ${customTitle}` : taskTitle

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: fullTitle,
        description: taskDesc || null,
        assigned_to: assignedTo,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        project_id: projectId
      }])
      .select()
      .single()

    if (!error && data) {
      setTasks(prev => [data, ...prev])
      setTaskTitle('')
      setCustomTitle('')
      setTaskDesc('')
      setDueDate(null)
      setAssignedTo(null)
    }
  }

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)
      .select()
      .single()

    if (!error && data) {
      setTasks(prev => prev.map(t => (t.id === data.id ? data : t)))
    }
  }

  const filteredTasks = tasks.filter(task =>
    filterStatus === 'all' ? true : task.status === filterStatus
  )

  return (
    <div className="space-y-6 p-4 border rounded-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">📋 Project Tasks</h2>
          <p className="text-sm text-muted-foreground">Manage and assign key actions</p>
        </div>
        <Select onValueChange={setFilterStatus} defaultValue="all">
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {['admin', 'staff'].includes(role || '') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select onValueChange={setTaskTitle}>
            <SelectTrigger>
              <SelectValue placeholder="Predefined task" />
            </SelectTrigger>
            <SelectContent>
              {PREDEFINED_TASKS.map(task => (
                <SelectItem key={task} value={task}>{task}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Optional custom title (e.g. 'about roof tiles')"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />

          <Select onValueChange={setAssignedTo}>
            <SelectTrigger>
              <SelectValue placeholder="Assign to" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('text-left font-normal', !dueDate && 'text-muted-foreground')}
              >
                {dueDate ? format(dueDate, 'dd MMM yyyy') : 'Select due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
              />
            </PopoverContent>
          </Popover>

          <Textarea
            className="col-span-full"
            placeholder="Task description (optional)"
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
          />

          <div className="col-span-full">
            <Button onClick={createTask}>➕ Add Task</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Assigned</TableHead>
            <TableHead className="hidden md:table-cell">Due</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map(task => (
            <TableRow key={task.id} className={isOverdue(task) ? 'bg-red-50' : ''}>
              <TableCell>
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={() => toggleStatus(task)}
                />
              </TableCell>
              <TableCell className={cn('text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>
                <div>{task.title}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground">{task.description}</div>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {users.find(u => u.id === task.assigned_to)?.email || '-'}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-gray-500">
                {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : '-'}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-gray-400">
                {format(new Date(task.created_at), 'dd MMM')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredTasks.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">No tasks found.</p>
      )}
    </div>
  )
}
