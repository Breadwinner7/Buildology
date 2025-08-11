'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  useThread,
  useMessages,
  useMessagingMutations,
  formatMessageTime,
  type Message,
  type SendMessageData
} from '@/hooks/useMessaging'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Paperclip,
  MoreHorizontal,
  Users,
  Building2,
  Flag,
  Clock,
  Reply,
  Smile,
  Edit2,
  Trash2,
  Pin,
  Archive,
  Settings,
  Phone,
  Video,
  Info,
  X,
  AlertCircle
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'

// Message component
function MessageBubble({ 
  message, 
  isOwnMessage, 
  showAvatar = true,
  onReply,
  onEdit,
  onDelete,
  onReact
}: { 
  message: Message
  isOwnMessage: boolean
  showAvatar?: boolean
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onDelete: (message: Message) => void
  onReact: (message: Message, emoji: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`
    } else {
      return format(date, 'MMM dd, HH:mm')
    }
  }

  const commonEmojis = ['👍', '❤️', '😊', '😂', '😮', '😢', '👎', '🎉']

  return (
    <div 
      className={cn(
        "group flex gap-3 p-4 hover:bg-gray-50/50 transition-colors relative",
        isOwnMessage && "flex-row-reverse"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.user?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {message.user?.first_name?.[0]}{message.user?.surname?.[0]}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex-1 space-y-1", !showAvatar && "ml-11")}>
        {showAvatar && (
          <div className={cn(
            "flex items-center gap-2 text-sm",
            isOwnMessage && "flex-row-reverse"
          )}>
            <span className="font-medium">
              {message.user?.first_name} {message.user?.surname}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatMessageDate(message.created_at)}
            </span>
            {message.is_edited && (
              <Badge variant="secondary" className="text-xs">
                edited
              </Badge>
            )}
          </div>
        )}
        
        {message.reply_to_message && (
          <div className="bg-muted/50 border-l-2 border-blue-500 pl-3 py-2 text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-1">
              Replying to {message.reply_to_message.user?.first_name}
            </div>
            <div className="text-muted-foreground line-clamp-2">
              {message.reply_to_message.content}
            </div>
          </div>
        )}
        
        <div className={cn(
          "inline-block max-w-lg rounded-lg px-4 py-2 text-sm leading-relaxed",
          isOwnMessage 
            ? "bg-blue-600 text-white ml-auto" 
            : "bg-white border shadow-sm"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(attachment => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-black/10 rounded">
                  <Paperclip className="w-3 h-3" />
                  <span className="text-xs">{attachment.file_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.reduce((acc, reaction) => {
              const existing = acc.find(r => r.emoji === reaction.emoji)
              if (existing) {
                existing.count++
                existing.users.push(reaction.user!)
              } else {
                acc.push({
                  emoji: reaction.emoji,
                  count: 1,
                  users: [reaction.user!]
                })
              }
              return acc
            }, [] as { emoji: string; count: number; users: any[] }[]).map(({ emoji, count, users }) => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onReact(message, emoji)}
              >
                {emoji} {count}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {showActions && (
        <div className={cn(
          "absolute top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-lg shadow-lg p-1",
          isOwnMessage ? "left-2" : "right-2"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onReply(message)}
          >
            <Reply className="w-3 h-3" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Smile className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto p-2">
              <div className="flex gap-1">
                {commonEmojis.map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onReact(message, emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
              {isOwnMessage && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(message)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pin className="w-4 h-4 mr-2" />
                Pin Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

// Date separator component
function DateSeparator({ date }: { date: string }) {
  const messageDate = new Date(date)
  let displayText = format(messageDate, 'MMMM dd, yyyy')
  
  if (isToday(messageDate)) {
    displayText = 'Today'
  } else if (isYesterday(messageDate)) {
    displayText = 'Yesterday'
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="bg-gray-100 px-3 py-1 rounded-full text-xs text-muted-foreground font-medium">
        {displayText}
      </div>
    </div>
  )
}

// Main Thread Page
export default function MessageThreadPage() {
  const params = useParams()
  const threadId = Array.isArray(params.id) ? params.id[0] : params.id as string
  const router = useRouter()
  const { user } = useUser()
  
  const [messageText, setMessageText] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Data fetching
  const threadQuery = useThread(threadId)
  const messagesQuery = useMessages(threadId)
  const { sendMessage, markAsRead, addReaction, removeReaction } = useMessagingMutations()

  const thread = threadQuery.data
  const messages = messagesQuery.data || []
  const isLoading = threadQuery.isLoading || messagesQuery.isLoading

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark thread as read when opened
  useEffect(() => {
    if (threadId) {
      markAsRead.mutate(threadId)
    }
  }, [threadId])

  // Focus textarea
  useEffect(() => {
    if (textareaRef.current && !editingMessage) {
      textareaRef.current.focus()
    }
  }, [replyingTo, editingMessage])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !threadId) return

    const messageData: SendMessageData = {
      thread_id: threadId,
      content: messageText.trim(),
      reply_to_id: replyingTo?.id
    }

    try {
      await sendMessage.mutateAsync(messageData)
      setMessageText('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSendMessage()
    }
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    textareaRef.current?.focus()
  }

  const handleEdit = (message: Message) => {
    setEditingMessage(message)
    setMessageText(message.content)
  }

  const handleDelete = (message: Message) => {
    if (confirm('Are you sure you want to delete this message?')) {
      // TODO: Implement delete message API
      console.log('Delete message:', message.id)
    }
  }

  const handleReact = async (message: Message, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(
        r => r.emoji === emoji && r.user?.id === user?.id
      )

      if (existingReaction) {
        await removeReaction.mutateAsync({ messageId: message.id, emoji })
      } else {
        await addReaction.mutateAsync({ messageId: message.id, emoji })
      }
    } catch (error) {
      console.error('Error reacting to message:', error)
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Thread not found or you don't have access to it.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <Card className="rounded-none border-0 border-b">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/messages')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                <div className="flex-1">
                  <h1 className="font-semibold text-lg">{thread.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {thread.project && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{thread.project.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{thread.participants?.length} participant{thread.participants?.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      <span className="capitalize">{thread.priority}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" size="sm">
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Users className="w-4 h-4 mr-2" />
                      Manage Participants
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin Thread
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Thread
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-none">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <DateSeparator date={date} />
                {dateMessages.map((message, index) => {
                  const isOwnMessage = message.user_id === user?.id
                  const previousMessage = index > 0 ? dateMessages[index - 1] : null
                  const showAvatar = !previousMessage || previousMessage.user_id !== message.user_id
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwnMessage={isOwnMessage}
                      showAvatar={showAvatar}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReact={handleReact}
                    />
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <Card className="rounded-none border-0 border-t">
          <CardContent className="p-4">
            {replyingTo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-blue-700">
                      Replying to {replyingTo.user?.first_name}
                    </span>
                    <p className="text-muted-foreground line-clamp-1">
                      {replyingTo.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message... (Ctrl+Enter to send)"
                  rows={1}
                  className="min-h-[40px] max-h-32 resize-none"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}