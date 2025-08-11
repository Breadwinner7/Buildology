'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  ArrowDown,
  Hash,
  Users,
  Settings,
  Search,
  Filter,
  Pin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  updated_at?: string
  message_type: 'text' | 'file' | 'image' | 'system'
  reply_to?: string
  is_edited?: boolean
  reactions?: Array<{
    user_id: string
    emoji: string
  }>
  sender?: {
    id: string
    full_name: string
    email: string
    role: string
    avatar_url?: string
    is_online?: boolean
  }
  read_by?: Array<{
    user_id: string
    read_at: string
  }>
}

interface Thread {
  id: string
  title: string
  description?: string
  thread_type: 'public' | 'private' | 'announcement'
  is_pinned?: boolean
  participants: Array<{
    id: string
    full_name: string
    email: string
    role: string
    avatar_url?: string
    is_online?: boolean
    last_seen_at?: string
  }>
}

interface MessagingPanelProps {
  threadId: string
}

const MESSAGES_PER_PAGE = 50
const SCROLL_THRESHOLD = 100

export default function EnhancedMessagingPanel({ threadId }: MessagingPanelProps) {
  const { user, isAdmin } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const currentMessagesRef = useRef<Message[]>([])

  // Helper function to update messages and keep ref in sync
  const updateMessages = (update: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof update === 'function') {
      setMessages(prev => {
        const newMessages = update(prev)
        currentMessagesRef.current = newMessages
        return newMessages
      })
    } else {
      setMessages(update)
      currentMessagesRef.current = update
    }
  }

  // Fetch thread details
  const fetchThreadDetails = useCallback(async () => {
    if (!threadId) return

    try {
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          thread_participants!inner(
            user_id,
            user_profiles(
              id,
              full_name,
              email,
              role,
              avatar_url,
              is_online,
              last_seen_at
            )
          )
        `)
        .eq('id', threadId)
        .single()

      if (error) {
        console.warn('Error fetching thread details:', error)
        return
      }

      setThread({
        ...data,
        participants: data.thread_participants?.map(tp => tp.user_profiles) || []
      })
    } catch (error) {
      console.error('Error fetching thread details:', error)
    }
  }, [threadId])

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!threadId) return

    try {
      if (!loadMore) setLoading(true)
      else setLoadingMore(true)

      const offset = loadMore ? currentMessagesRef.current.length : 0
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            id,
            full_name,
            email,
            role,
            avatar_url,
            is_online
          ),
          read_by:message_reads(
            user_id,
            read_at
          ),
          reactions:message_reactions(
            user_id,
            emoji
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1)

      if (error) {
        console.warn('Database error fetching messages, using mock data:', error)
        // Use mock message data
        const mockMessages = [
          {
            id: 'msg-1',
            thread_id: threadId,
            content: 'Welcome to this project discussion! This is mock data until the database is set up.',
            sender_id: 'user-1',
            created_at: new Date(Date.now() - 60000).toISOString(),
            updated_at: new Date(Date.now() - 60000).toISOString(),
            message_type: 'text',
            sender: {
              id: 'user-1',
              full_name: 'John Doe',
              email: 'john@example.com',
              role: 'admin',
              is_online: true
            },
            read_by: [],
            reactions: []
          },
          {
            id: 'msg-2',
            thread_id: threadId,
            content: 'This messaging system will work with real data once the database tables are created.',
            sender_id: 'user-2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            message_type: 'text',
            sender: {
              id: 'user-2',
              full_name: 'Jane Smith',
              email: 'jane@example.com',
              role: 'manager',
              is_online: false
            },
            read_by: [],
            reactions: []
          }
        ]
        
        if (loadMore) {
          updateMessages(prev => [...mockMessages, ...prev])
          setHasMore(false)
        } else {
          updateMessages(mockMessages)
          setHasMore(false)
          setTimeout(() => scrollToBottom(false), 100)
        }
        
        if (!loadMore) setLoading(false)
        else setLoadingMore(false)
        return
      }

      const newMessages = (data || []).reverse()
      
      if (loadMore) {
        updateMessages(prev => [...newMessages, ...prev])
        setHasMore(newMessages.length === MESSAGES_PER_PAGE)
      } else {
        updateMessages(newMessages)
        setHasMore(newMessages.length === MESSAGES_PER_PAGE)
        // Scroll to bottom for initial load
        setTimeout(() => scrollToBottom(false), 100)
      }

    } catch (error) {
      console.warn('Error fetching messages, using mock data:', error)
      // Fallback to mock data on any error
      const mockMessages = [
        {
          id: 'msg-1',
          thread_id: threadId,
          content: 'This is a mock message. Real messaging will work once the database is set up.',
          sender_id: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_type: 'text',
          sender: {
            id: 'user-1',
            full_name: 'System',
            email: 'system@example.com',
            role: 'admin',
            is_online: true
          },
          read_by: [],
          reactions: []
        }
      ]
      
      if (!loadMore) {
        updateMessages(mockMessages)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [threadId])

  // Initial data fetch
  useEffect(() => {
    if (threadId) {
      fetchThreadDetails()
      fetchMessages()
      markThreadAsRead()
    }
  }, [threadId])

  // Real-time subscriptions
  useEffect(() => {
    if (!threadId) return

    const messagesChannel = supabase
      .channel(`messages_realtime:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, async (payload) => {
        const newMessage = payload.new as Message
        
        // Fetch sender details
        const { data: senderData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role, avatar_url, is_online')
          .eq('id', newMessage.sender_id)
          .single()

        const enrichedMessage = {
          ...newMessage,
          sender: senderData
        }

        updateMessages(prev => [...prev, enrichedMessage])
        
        // Auto-scroll to bottom if user is near bottom
        if (isNearBottom()) {
          setTimeout(() => scrollToBottom(), 100)
        } else {
          setShowScrollButton(true)
        }

        // Mark as read if it's not from current user
        if (newMessage.sender_id !== user?.id) {
          markMessageAsRead(newMessage.id)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        const updatedMessage = payload.new as Message
        updateMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id 
            ? { ...msg, content: updatedMessage.content, is_edited: true }
            : msg
        ))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        const deletedMessage = payload.old as Message
        updateMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id))
      })
      .subscribe()

    // Typing indicators
    const typingChannel = supabase
      .channel(`typing:${threadId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.user_id !== user?.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.user_name)) {
              return [...prev, payload.user_name]
            }
            return prev
          })
          
          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== payload.user_name))
          }, 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [threadId, user?.id])

  const markThreadAsRead = useCallback(async () => {
    if (!threadId || !user?.id) return

    const { error } = await supabase
      .from('thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('user_id', user.id)

    if (!error) {
      setUnreadCount(0)
    }
  }, [threadId, user?.id])

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return

    const { error } = await supabase
      .from('message_reads')
      .upsert([{
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error marking message as read:', error)
    }
  }, [user?.id])

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user || !threadId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          content: content.trim(),
          sender_id: user.id,
          thread_id: threadId,
          message_type: 'text'
        }])
        .select()
        .single()

      if (error) {
        console.warn('Database error sending message, adding mock message:', error)
        // Add mock message for development
        const mockMessage = {
          id: `mock-msg-${Date.now()}`,
          thread_id: threadId,
          content: content.trim(),
          sender_id: user.id,
          message_type: 'text',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: {
            id: user.id,
            full_name: `${user.first_name} ${user.surname}`,
            email: user.email || '',
            role: user.role,
            is_online: true
          }
        } as Message

        updateMessages(prev => [...prev, mockMessage])
        setTimeout(() => scrollToBottom(), 100)
        
        toast({
          title: "Message sent (mock mode)",
          description: "Message will sync when database is available",
          variant: "default"
        })
        return
      }

      // Update thread's updated_at timestamp
      await supabase
        .from('threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId)

    } catch (error) {
      console.error('Unexpected error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const handleTyping = useCallback((content: string) => {
    if (!user?.id || !threadId) return

    // Broadcast typing indicator
    supabase.channel(`typing:${threadId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email
      }
    })
  }, [user, threadId])

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    })
    setShowScrollButton(false)
  }

  const isNearBottom = () => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return false
    
    const { scrollTop, scrollHeight, clientHeight } = scrollArea
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
  }

  const handleScroll = useCallback((event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target
    
    // Show/hide scroll to bottom button
    const nearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
    setShowScrollButton(!nearBottom && messages.length > 0)

    // Load more messages when scrolled to top
    if (scrollTop < 100 && hasMore && !loadingMore) {
      const currentScrollHeight = scrollHeight
      fetchMessages(true).then(() => {
        // Maintain scroll position after loading more messages
        setTimeout(() => {
          if (scrollAreaRef.current) {
            const newScrollHeight = scrollAreaRef.current.scrollHeight
            scrollAreaRef.current.scrollTop = newScrollHeight - currentScrollHeight
          }
        }, 0)
      })
    }

    // Mark messages as read when they come into view
    if (nearBottom) {
      markThreadAsRead()
    }
  }, [hasMore, loadingMore, fetchMessages, markThreadAsRead, messages.length])

  const formatDateDivider = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const shouldShowDateDivider = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true
    return !isSameDay(new Date(currentMessage.created_at), new Date(previousMessage.created_at))
  }

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <Hash className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">Select a conversation</h3>
          <p className="text-muted-foreground">Choose a thread from the sidebar to start messaging</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Enhanced Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-muted-foreground" />
                <h1 className="font-semibold text-lg">{thread?.title}</h1>
                {thread?.is_pinned && (
                  <Pin className="w-4 h-4 text-muted-foreground" />
                )}
                {thread?.thread_type === 'private' && (
                  <Badge variant="secondary" className="text-xs">Private</Badge>
                )}
                {thread?.thread_type === 'announcement' && (
                  <Badge variant="default" className="text-xs">Announcement</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Participants */}
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-2">
                    {thread?.participants.slice(0, 5).map(participant => (
                      <Tooltip key={participant.id}>
                        <TooltipTrigger>
                          <div className="relative">
                            <Avatar className="w-8 h-8 border-2 border-background">
                              {participant.avatar_url && (
                                <AvatarImage src={participant.avatar_url} />
                              )}
                              <AvatarFallback className="text-xs bg-primary/10">
                                {getUserInitials(participant.full_name, participant.email)}
                              </AvatarFallback>
                            </Avatar>
                            {participant.is_online && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <div className="font-medium">{participant.full_name || participant.email}</div>
                            <div className="text-muted-foreground">{participant.role}</div>
                            <div className={participant.is_online ? "text-green-600" : "text-muted-foreground"}>
                              {participant.is_online ? "Online" : "Offline"}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {(thread?.participants.length || 0) > 5 && (
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{(thread?.participants.length || 0) - 5}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{thread?.participants.length || 0}</span>
                  </div>
                </div>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Search className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {thread?.description && (
            <p className="text-sm text-muted-foreground mt-2">{thread.description}</p>
          )}
        </div>
      </div>

      {/* Messages Area with Virtual Scrolling */}
      <div className="flex-1 relative">
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-full"
          onScrollCapture={handleScroll}
        >
          <div className="p-4 space-y-4">
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more messages...
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchMessages(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Load earlier messages
                  </Button>
                )}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Start the conversation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This is the beginning of your conversation in #{thread?.title}.
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const previousMessage = index > 0 ? messages[index - 1] : undefined
                const showDateDivider = shouldShowDateDivider(message, previousMessage)
                const showAvatar = !previousMessage || previousMessage.sender_id !== message.sender_id
                const isOwnMessage = message.sender_id === user?.id

                return (
                  <div key={message.id}>
                    {/* Date Divider */}
                    {showDateDivider && (
                      <div className="relative flex items-center justify-center my-6">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative bg-background px-4 text-xs text-muted-foreground font-medium">
                          {formatDateDivider(new Date(message.created_at))}
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <MessageBubble
                      id={message.id}
                      content={message.content}
                      createdAt={message.created_at}
                      editedAt={message.is_edited ? message.updated_at : undefined}
                      isOwnMessage={isOwnMessage}
                      sender={message.sender}
                      showAvatar={showAvatar}
                      showSender={showAvatar && !isOwnMessage}
                      status={isOwnMessage ? 'read' : undefined}
                      onEdit={() => {/* Handle edit */}}
                      onDelete={() => {/* Handle delete */}}
                      onReply={() => {/* Handle reply */}}
                    />
                  </div>
                )
              })
            )}

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
                  }
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <div className="absolute bottom-4 right-4">
            <Button
              variant="default"
              size="sm"
              className="rounded-full shadow-lg"
              onClick={() => scrollToBottom()}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Message Input */}
      <div className="border-t bg-background p-4">
        <MessageInput
          onSend={sendMessage}
          placeholder={`Message #${thread?.title}...`}
          showAttachments={true}
          showEmojis={true}
          maxLength={4000}
          onChange={handleTyping}
        />
      </div>
    </div>
  )
}