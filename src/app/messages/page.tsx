'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  useThreads,
  useMessagingUsers,
  useMessagingProjects,
  useMessagingMutations,
  getThreadPriorityColor,
  getThreadPriorityLabel,
  formatMessageTime,
  type Thread,
  type MessageFilters,
  type CreateThreadData
} from '@/hooks/useMessaging'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MessageSquare,
  Search,
  Filter,
  Plus,
  Users,
  Building2,
  Flag,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Mail,
  MailOpen,
  Archive,
  Star,
  Paperclip
} from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { cn } from '@/lib/utils'

const THREAD_PRIORITIES = [
  { value: 'low', label: 'Low Priority', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
] as const

// Create Thread Dialog
function CreateThreadDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formData, setFormData] = useState<CreateThreadData>({
    title: '',
    project_id: '',
    priority: 'normal',
    participant_ids: [],
    initial_message: ''
  })

  const { data: users = [] } = useMessagingUsers()
  const { data: projects = [] } = useMessagingProjects()
  const { createThread } = useMessagingMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createThread.mutateAsync(formData)
      onOpenChange(false)
      setFormData({
        title: '',
        project_id: '',
        priority: 'normal',
        participant_ids: [],
        initial_message: ''
      })
    } catch (error) {
      console.error('Error creating thread:', error)
    }
  }

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(userId)
        ? prev.participant_ids.filter(id => id !== userId)
        : [...prev.participant_ids, userId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Create a new thread and invite team members to collaborate
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Thread Title*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter conversation title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">No Project</SelectItem>
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
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THREAD_PRIORITIES.map(priority => (
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

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleParticipant(user.id)}
                >
                  <Checkbox
                    checked={formData.participant_ids.includes(user.id)}
                    onChange={() => toggleParticipant(user.id)}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.first_name?.[0]}{user.surname?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.first_name} {user.surname}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.participant_ids.length} participant{formData.participant_ids.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_message">Initial Message (Optional)</Label>
            <Textarea
              id="initial_message"
              value={formData.initial_message}
              onChange={(e) => setFormData({ ...formData, initial_message: e.target.value })}
              placeholder="Start the conversation..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createThread.isPending || !formData.title || formData.participant_ids.length === 0}
            >
              {createThread.isPending ? 'Creating...' : 'Start Conversation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Thread List Item
function ThreadListItem({ 
  thread, 
  onClick 
}: { 
  thread: Thread
  onClick: () => void
}) {
  const isUnread = thread.unread_count > 0

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all cursor-pointer",
        isUnread && "border-blue-200 bg-blue-50/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-medium text-sm truncate",
                  isUnread && "font-semibold"
                )}>
                  {thread.title}
                </h3>
                {isUnread && (
                  <Badge variant="default" className="text-xs px-1.5 py-0.5">
                    {thread.unread_count}
                  </Badge>
                )}
              </div>
              
              {thread.last_message && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium">
                    {thread.last_message.user?.first_name}:
                  </span>{' '}
                  {thread.last_message.content}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <div className={cn("w-3 h-3 rounded-full", getThreadPriorityColor(thread.priority))} />
              <Badge variant="outline" className="text-xs">
                <Flag className="w-3 h-3 mr-1" />
                {getThreadPriorityLabel(thread.priority)}
              </Badge>
            </div>
          </div>

          {/* Project */}
          {thread.project && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>{thread.project.name}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{thread.participants_count} participant{thread.participants_count !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatMessageTime(thread.updated_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Messages Page
export default function MessagesPage() {
  const { user } = useUser()
  const router = useRouter()
  
  const [filters, setFilters] = useState<Partial<MessageFilters>>({
    search: '',
    project_id: '',
    priority: [],
    unread_only: false,
    archived: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Data fetching
  const threadsQuery = useThreads(filters)
  const { data: projects = [] } = useMessagingProjects()

  const threads = threadsQuery.data || []
  const isLoading = threadsQuery.isLoading
  const error = threadsQuery.error

  // Filter threads based on search
  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const searchableText = [
          thread.title,
          thread.last_message?.content,
          thread.project?.name,
          thread.created_by_user?.first_name,
          thread.created_by_user?.surname
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
      }

      if (filters.unread_only && thread.unread_count === 0) {
        return false
      }

      return true
    })
  }, [threads, filters])

  // Message statistics
  const messageStats = useMemo(() => {
    const total = threads.length
    const unread = threads.filter(t => t.unread_count > 0).length
    const urgent = threads.filter(t => t.priority === 'urgent').length
    const highPriority = threads.filter(t => t.priority === 'high').length
    const archived = threads.filter(t => t.is_archived).length

    return { total, unread, urgent, highPriority, archived }
  }, [threads])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-48" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
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
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">
              Communicate and collaborate with your team
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => threadsQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load messages. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Threads</p>
                  <p className="text-2xl font-bold">{messageStats.total}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-blue-600">{messageStats.unread}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{messageStats.urgent}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">{messageStats.highPriority}</p>
                </div>
                <Flag className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Archived</p>
                  <p className="text-2xl font-bold text-gray-600">{messageStats.archived}</p>
                </div>
                <Archive className="w-8 h-8 text-gray-600" />
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
                placeholder="Search conversations..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 max-w-md"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={filters.unread_only ? "default" : "outline"}
                onClick={() => setFilters({ ...filters, unread_only: !filters.unread_only })}
                size="sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Unread Only
              </Button>
              
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select
                      value={filters.project_id || ''}
                      onValueChange={(value) => setFilters({ ...filters, project_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-projects">All Projects</SelectItem>
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
                    <Label>Priority</Label>
                    <Select
                      value={filters.priority?.join(',') || ''}
                      onValueChange={(value) => 
                        setFilters({ ...filters, priority: value ? value.split(',') as any : [] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-priorities">All Priorities</SelectItem>
                        {THREAD_PRIORITIES.map(priority => (
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

                  <div className="flex items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ search: '', project_id: '', priority: [], unread_only: false, archived: false })}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Thread List */}
        {filteredThreads.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredThreads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                onClick={() => router.push(`/messages/${thread.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No conversations found</h3>
              <p className="text-muted-foreground mb-6">
                {threads.length === 0 
                  ? "Start your first conversation with your team."
                  : "No conversations match your current filters."
                }
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Conversation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Thread Dialog */}
        <CreateThreadDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </div>
  )
}