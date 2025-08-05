'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { 
  Hash, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  MessageSquare,
  Users,
  Clock,
  Pin,
  Archive,
  Star,
  Filter,
  Settings,
  UserPlus,
  Crown,
  Activity
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import CreateThreadModal from './CreateThreadModal'

interface Participant {
  id: string
  full_name: string
  email: string
  role: string
  avatar?: string
  last_seen?: string
  is_online: boolean
}

interface ThreadSidebarProps {
  projectId: string
  selectedThreadId: string | null
  onSelectThread: (id: string) => void
}

interface Thread {
  id: string
  title: string
  created_at: string
  updated_at?: string
  is_pinned?: boolean
  is_archived?: boolean
  thread_type?: 'public' | 'private' | 'announcement'
  participants: Participant[]
  last_message?: {
    content: string
    created_at: string
    sender_name: string
    sender_id: string
    message_type?: 'text' | 'file' | 'image'
  }
  message_count?: number
  unread_count?: number
}

type ThreadFilter = 'all' | 'unread' | 'pinned' | 'archived' | 'mentions'

export default function EnhancedThreadSidebar({
  projectId,
  selectedThreadId,
  onSelectThread,
}: ThreadSidebarProps) {
  const { user, isAdmin } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null)

  const fetchThreads = async () => {
    if (!projectId) {
      console.error('❌ ProjectId is undefined or empty:', projectId)
      return
    }

    try {
      console.log('🔍 Fetching threads for projectId:', projectId)
      setLoading(true)
      
      // Use the most basic query that matches your original working code
      const { data: threadsData, error: threadsError } = await supabase
        .from('threads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }) // Use created_at instead of updated_at

      if (threadsError) {
        console.error('Error fetching threads:', threadsError)
        
        // Try even simpler fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('threads')
          .select('id, title, created_at, project_id')
          .eq('project_id', projectId)
        
        if (fallbackError) {
          toast({
            title: "Error",
            description: "Failed to load conversation threads",
            variant: "destructive"
          })
          return
        }
        
        console.log('📊 Using fallback data:', fallbackData?.length || 0)
        // Set basic threads without enrichment
        setThreads((fallbackData || []).map(thread => ({
          ...thread,
          participants: [],
          message_count: 0,
          unread_count: 0,
          last_message: undefined
        })))
        return
      }

      console.log('📊 Fetched threads:', threadsData?.length || 0)

      // For now, just use basic thread data without complex enrichment
      const basicThreads = (threadsData || []).map(thread => ({
        ...thread,
        participants: [],
        message_count: 0,
        unread_count: 0,
        last_message: undefined
      }))

      setThreads(basicThreads)

      // Optionally enrich with additional data in the background
      enrichThreadsInBackground(threadsData || [])

    } catch (error) {
      console.error('Unexpected error fetching threads:', error)
      toast({
        title: "Error", 
        description: "An unexpected error occurred while loading threads",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Background enrichment to avoid blocking the main UI
  const enrichThreadsInBackground = async (basicThreads: any[]) => {
    try {
      const enrichedThreads = await Promise.all(
        basicThreads.map(async (thread) => {
          try {
            // Get message count
            const { count: messageCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)

            // Get last message (simple version)
            const { data: lastMessageData } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('thread_id', thread.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            // Get sender name if we have a last message
            let senderName = 'Unknown'
            if (lastMessageData?.sender_id) {
              const { data: senderData } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('id', lastMessageData.sender_id)
                .single()
              
              senderName = senderData?.full_name || senderData?.email || 'Unknown'
            }

            return {
              ...thread,
              participants: [], // We'll add this later
              message_count: messageCount || 0,
              unread_count: 0, // We'll calculate this later
              last_message: lastMessageData ? {
                content: lastMessageData.content,
                created_at: lastMessageData.created_at,
                sender_name: senderName,
                sender_id: lastMessageData.sender_id
              } : undefined
            }
          } catch (error) {
            console.error('Error enriching thread:', thread.id, error)
            return {
              ...thread,
              participants: [],
              message_count: 0,
              unread_count: 0,
              last_message: undefined
            }
          }
        })
      )

      console.log('✅ Background enrichment complete')
      setThreads(enrichedThreads)
    } catch (error) {
      console.error('Background enrichment failed:', error)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchThreads()
    }
  }, [projectId])

  // Real-time updates
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`enhanced_project_messaging:${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'threads',
        filter: `project_id=eq.${projectId}`
      }, () => fetchThreads())
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, () => fetchThreads())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_participants'
      }, () => fetchThreads())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [projectId])

  const handleNewThread = (newThreadId: string) => {
    fetchThreads()
    onSelectThread(newThreadId)
  }

  const togglePin = async (threadId: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('threads')
      .update({ is_pinned: !isPinned, updated_at: new Date().toISOString() })
      .eq('id', threadId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive"
      })
    } else {
      fetchThreads()
    }
  }

  const archiveThread = async (threadId: string, isArchived: boolean) => {
    const { error } = await supabase
      .from('threads')
      .update({ is_archived: !isArchived, updated_at: new Date().toISOString() })
      .eq('id', threadId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to archive thread",
        variant: "destructive"
      })
    } else {
      fetchThreads()
      if (selectedThreadId === threadId && !isArchived) {
        onSelectThread('')
      }
    }
  }

  const deleteThread = async (threadId: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete threads",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete thread",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Thread Deleted",
        description: "The conversation thread has been deleted",
      })

      if (selectedThreadId === threadId) {
        onSelectThread('')
      }

      fetchThreads()
    } catch (error) {
      console.error('Unexpected error deleting thread:', error)
    } finally {
      setDeleteDialogOpen(false)
      setThreadToDelete(null)
    }
  }

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d')
    }
  }

  // Filter threads based on active filter and search
  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    switch (activeFilter) {
      case 'unread':
        return matchesSearch && (thread.unread_count || 0) > 0
      case 'pinned':
        return matchesSearch && thread.is_pinned
      case 'archived':
        return matchesSearch && thread.is_archived
      case 'mentions':
        // This would require additional logic to track mentions
        return matchesSearch
      default:
        return matchesSearch && !thread.is_archived
    }
  })

  const getThreadIcon = (thread: Thread) => {
    if (thread.thread_type === 'announcement') return '📢'
    if (thread.thread_type === 'private') return '🔒'
    if (thread.is_pinned) return '📌'
    return '#'
  }

  const renderParticipantAvatars = (participants: Participant[]) => {
    const maxVisible = 3
    const visibleParticipants = participants.slice(0, maxVisible)
    const remainingCount = Math.max(0, participants.length - maxVisible)

    return (
      <TooltipProvider>
        <div className="flex items-center -space-x-1">
          {visibleParticipants.map(participant => (
            <Tooltip key={participant.id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="w-5 h-5 border border-background">
                    {participant.avatar && <AvatarImage src={participant.avatar} />}
                    <AvatarFallback className="text-xs bg-primary/10">
                      {participant.full_name?.charAt(0) || participant.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {participant.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{participant.full_name || participant.email}</div>
                  <div className="text-muted-foreground">{participant.role}</div>
                  {participant.is_online ? (
                    <div className="text-green-600">Online</div>
                  ) : participant.last_seen && (
                    <div>Last seen {formatDistanceToNow(new Date(participant.last_seen), { addSuffix: true })}</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{remainingCount}</span>
            </div>
          )}
        </div>
      </TooltipProvider>
    )
  }

  if (!projectId) {
    return (
      <aside className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Invalid project ID</p>
        </div>
      </aside>
    )
  }

  return (
    <>
      <aside className="w-80 border-r flex flex-col bg-muted/30">
        {/* Enhanced Header */}
        <div className="p-4 border-b bg-background space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 flex-1 min-w-0">
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Conversations</span>
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CreateThreadModal projectId={projectId} onThreadCreated={handleNewThread} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Members
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Filter className="w-4 h-4 mr-2" />
                    Manage Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All', icon: MessageSquare },
              { key: 'unread', label: 'Unread', icon: Activity },
              { key: 'pinned', label: 'Pinned', icon: Pin },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setActiveFilter(key as ThreadFilter)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Enhanced Threads List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No conversations found</p>
                    <p className="text-xs">Try adjusting your search terms</p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs">Create your first conversation to get started</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredThreads.map(thread => (
                  <div
                    key={thread.id}
                    className={cn(
                      "group p-3 rounded-lg cursor-pointer transition-all duration-200 relative border",
                      selectedThreadId === thread.id
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "hover:bg-muted/50 border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={(e) => {
                      console.log('🔥 Thread clicked:', thread.id, thread.title)
                      onSelectThread(thread.id)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        {/* Thread Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{getThreadIcon(thread)}</span>
                          <h3 className={cn(
                            "text-sm truncate flex-1",
                            selectedThreadId === thread.id ? "font-semibold" : "font-medium"
                          )}>
                            {thread.title}
                          </h3>
                          {thread.unread_count && thread.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-5 h-5">
                              {thread.unread_count > 99 ? '99+' : thread.unread_count}
                            </Badge>
                          )}
                        </div>

                        {/* Last Message Preview */}
                        {thread.last_message && (
                          <div className="text-xs text-muted-foreground mb-2">
                            <p className="truncate">
                              <span className="font-medium">{thread.last_message.sender_name}:</span>{' '}
                              {thread.last_message.message_type === 'image' ? '📷 Image' : 
                               thread.last_message.message_type === 'file' ? '📎 File' : 
                               thread.last_message.content}
                            </p>
                          </div>
                        )}

                        {/* Participants and Activity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderParticipantAvatars(thread.participants)}
                            <span className="text-xs text-muted-foreground">
                              {thread.participants.length} member{thread.participants.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {thread.message_count && thread.message_count > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {thread.message_count}
                              </Badge>
                            )}
                            {thread.last_message ? (
                              <span>{formatLastActivity(thread.last_message.created_at)}</span>
                            ) : (
                              <span>{formatLastActivity(thread.created_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Thread Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              togglePin(thread.id, !!thread.is_pinned)
                            }}>
                              <Pin className="w-4 h-4 mr-2" />
                              {thread.is_pinned ? 'Unpin' : 'Pin'} Thread
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              archiveThread(thread.id, !!thread.is_archived)
                            }}>
                              <Archive className="w-4 h-4 mr-2" />
                              {thread.is_archived ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="w-4 h-4 mr-2" />
                              Rename Thread
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setThreadToDelete(thread.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Thread
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Enhanced Footer */}
        {!loading && threads.length > 0 && (
          <div className="p-3 border-t bg-background">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filteredThreads.length} of {threads.length} conversation{threads.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3" />
                <span>
                  {threads.reduce((acc, t) => acc + t.participants.length, 0)} participants
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will permanently remove all messages in this thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => threadToDelete && deleteThread(threadToDelete)}
            >
              Delete Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}