'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Plus, 
  Send, 
  MoreVertical, 
  Search, 
  Users, 
  Hash,
  Clock,
  CheckCheck,
  Paperclip,
  Smile,
  Edit,
  Trash2
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'

interface Thread {
  id: string
  title: string
  project_id: string
  created_at: string
  last_message?: {
    content: string
    created_at: string
    sender_name: string
  }
  unread_count?: number
}

interface Message {
  id: string
  content: string
  sender_id: string
  thread_id: string
  created_at: string
  sender?: {
    full_name: string
    email: string
    role: string
  }
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
}

export default function MessagingModule({ projectId }: { projectId: string }) {
  const { user, isAdmin } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadDialogOpen, setNewThreadDialogOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState('')
  const [projectUsers, setProjectUsers] = useState<UserProfile[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch project users
  useEffect(() => {
    const fetchProjectUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role')
          .order('full_name')

        if (error) throw error
        setProjectUsers(data || [])
      } catch (error) {
        console.error('Error fetching project users:', error)
      }
    }

    fetchProjectUsers()
  }, [])

  // Fetch threads - simplified to avoid any potential joins
  const fetchThreads = async () => {
    try {
      // Simple query without any joins that might reference thread_participants
      const { data: threadsData, error: threadsError } = await supabase
        .from('threads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (threadsError) throw threadsError

      // Get last message for each thread separately
      const processedThreads = await Promise.all(
        (threadsData || []).map(async (thread) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(`
              content,
              created_at,
              sender:user_profiles(full_name, email)
            `)
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...thread,
            last_message: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_name: lastMessage.sender?.full_name || lastMessage.sender?.email || 'Unknown'
            } : undefined
          }
        })
      )

      setThreads(processedThreads)
      
      // Auto-select first thread if none selected
      if (processedThreads.length > 0 && !selectedThreadId) {
        setSelectedThreadId(processedThreads[0].id)
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
      toast({
        title: "Error",
        description: "Failed to load conversation threads",
        variant: "destructive"
      })
    }
  }

  // Fetch messages for selected thread
  const fetchMessages = async (threadId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles(full_name, email, role)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: "Error", 
        description: "Failed to load messages",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedThreadId) return

    const subscription = supabase
      .channel(`messages:${selectedThreadId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_id=eq.${selectedThreadId}`
        }, 
        (payload) => {
          // Fetch the complete message with sender info
          const fetchNewMessage = async () => {
            const { data, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:user_profiles(full_name, email, role)
              `)
              .eq('id', payload.new.id)
              .single()

            if (!error && data) {
              setMessages(prev => [...prev, data])
            }
          }
          
          fetchNewMessage()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedThreadId])

  // Load initial data
  useEffect(() => {
    if (projectId) {
      fetchThreads()
    }
  }, [projectId])

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId)
    }
  }, [selectedThreadId])

  // Create new thread
  const createThread = async () => {
    if (!newThreadTitle.trim()) return

    try {
      // Check if user is authenticated
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      console.log('👤 Current user check:', { currentUser: currentUser?.id, userError })

      if (!currentUser) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create threads",
          variant: "destructive"
        })
        return
      }

      console.log('🔍 Creating thread:', {
        title: newThreadTitle.trim(),
        project_id: projectId,
        user: user?.id
      })

      const { data, error } = await supabase
        .from('threads')
        .insert({
          title: newThreadTitle.trim(),
          project_id: projectId
        })
        .select()
        .single()

      console.log('📤 Thread creation result:', { data, error })

      if (error) {
        console.error('❌ Thread creation error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      toast({
        title: "Thread Created",
        description: `"${newThreadTitle}" has been created`,
      })

      setNewThreadTitle('')
      setNewThreadDialogOpen(false)
      fetchThreads()
      setSelectedThreadId(data.id)
    } catch (error: any) {
      console.error('💥 Thread creation error:', error)
      toast({
        title: "Error",
        description: `Failed to create thread: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedThreadId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          thread_id: selectedThreadId,
        })
        .select(`
          *,
          sender:user_profiles(full_name, email, role)
        `)
        .single()

      if (error) throw error

      setNewMessage('')
      inputRef.current?.focus()
      
      // The message will be added via real-time subscription
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  // Edit message
  const startEdit = (message: Message) => {
    setEditingMessage(message)
    setEditContent(message.content)
  }

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editContent.trim() })
        .eq('id', editingMessage.id)

      if (error) throw error

      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id 
          ? { ...msg, content: editContent.trim() }
          : msg
      ))

      setEditingMessage(null)
      setEditContent('')

      toast({
        title: "Message Updated",
        description: "Your message has been updated",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update message: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      setMessages(prev => prev.filter(msg => msg.id !== messageId))

      toast({
        title: "Message Deleted",
        description: "The message has been deleted",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete message: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`
    } else {
      return format(date, 'MMM d, HH:mm')
    }
  }

  // Get user initials for avatar
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Filter threads based on search
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads
    return threads.filter(thread => 
      thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [threads, searchQuery])

  const selectedThread = threads.find(t => t.id === selectedThreadId)

  return (
    <div className="flex h-[600px] border rounded-lg bg-background shadow-sm">
      {/* Threads Sidebar */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </h2>
            <Dialog open={newThreadDialogOpen} onOpenChange={setNewThreadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Conversation</DialogTitle>
                  <DialogDescription>
                    Create a new conversation thread for this project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Thread Title</Label>
                    <Input
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      placeholder="Enter conversation topic..."
                      onKeyDown={(e) => e.key === 'Enter' && createThread()}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNewThreadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createThread} disabled={!newThreadTitle.trim()}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
        </div>

        {/* Threads List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start a new conversation to get started</p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors mb-1",
                    selectedThreadId === thread.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm truncate">{thread.title}</h3>
                      </div>
                      {thread.last_message && (
                        <div className="text-xs text-muted-foreground">
                          <p className="truncate mb-1">
                            <span className="font-medium">{thread.last_message.sender_name}:</span>{' '}
                            {thread.last_message.content}
                          </p>
                          <p>{formatDistanceToNow(new Date(thread.last_message.created_at), { addSuffix: true })}</p>
                        </div>
                      )}
                    </div>
                    {thread.unread_count && thread.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {thread.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedThread.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Users className="w-4 h-4 mr-2" />
                      View Participants
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Search className="w-4 h-4 mr-2" />
                      Search in Thread
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Thread
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Be the first to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user?.id
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id
                    const senderName = message.sender?.full_name || message.sender?.email || 'Unknown User'

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwnMessage && (
                          <div className="flex flex-col items-center">
                            {showAvatar ? (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-primary/10 text-xs">
                                  {getUserInitials(message.sender?.full_name, message.sender?.email)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-8 h-8" />
                            )}
                          </div>
                        )}

                        <div className={cn(
                          "flex flex-col max-w-[70%]",
                          isOwnMessage ? "items-end" : "items-start"
                        )}>
                          {showAvatar && !isOwnMessage && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{senderName}</span>
                              <Badge variant="outline" className="text-xs">
                                {message.sender?.role || 'user'}
                              </Badge>
                            </div>
                          )}

                          <div className="group relative">
                            {editingMessage?.id === message.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEdit}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={cn(
                                    "px-4 py-2 rounded-2xl relative",
                                    isOwnMessage
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  )}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>

                                {/* Message actions */}
                                {isOwnMessage && (
                                  <div className="absolute top-0 right-0 -mr-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                          <MoreVertical className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => startEdit(message)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => deleteMessage(message.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwnMessage && (
                              <CheckCheck className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isOwnMessage && (
                          <div className="flex flex-col items-center">
                            {showAvatar && user && (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {getUserInitials(user.user_metadata?.full_name, user.email)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none pr-12"
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a thread from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}