'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Reply,
  CheckCheck,
  Clock,
  Smile,
  Plus,
  Share,
  Bookmark,
  Flag,
  Pin,
  Quote,
  MessageSquare,
  Eye,
  Download,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Archive,
  Forward,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Sad,
  Lightbulb,
  Zap
} from 'lucide-react'

interface Sender {
  id: string
  name?: string
  email?: string
  role?: string
  avatar?: string
  is_online?: boolean
  last_seen?: string
}

interface Reaction {
  emoji: string
  count: number
  users: Array<{
    id: string
    name: string
  }>
  hasReacted: boolean
}

interface ReadReceipt {
  user_id: string
  user_name: string
  user_avatar?: string
  read_at: string
}

interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  thumbnail?: string
}

interface Reply {
  id: string
  content: string
  sender_name: string
  created_at: string
}

interface MessageBubbleProps {
  id?: string
  content: string
  createdAt: string
  editedAt?: string
  isOwnMessage: boolean
  sender?: Sender
  showAvatar?: boolean
  showSender?: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  reactions?: Reaction[]
  readReceipts?: ReadReceipt[]
  attachments?: Attachment[]
  replyTo?: Reply
  isPinned?: boolean
  isBookmarked?: boolean
  isHighlighted?: boolean
  messageType?: 'text' | 'system' | 'announcement'
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onBookmark?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onFlag?: (messageId: string) => void
  onShare?: (messageId: string) => void
  onViewProfile?: (userId: string) => void
  className?: string
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

const REACTION_CATEGORIES = {
  'Faces': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕'],
  'Gestures': ['👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '🤟', '🤘', '👊', '✊', '🤛'],
  'Objects': ['🔥', '⭐', '🌟', '✨', '⚡', '💥', '💯', '💫', '🎉', '🎊', '🎈', '🎁']
}

export function MessageBubble({ 
  id,
  content, 
  createdAt, 
  editedAt,
  isOwnMessage,
  sender,
  showAvatar = true,
  showSender = true,
  status,
  reactions = [],
  readReceipts = [],
  attachments = [],
  replyTo,
  isPinned = false,
  isBookmarked = false,
  isHighlighted = false,
  messageType = 'text',
  onEdit,
  onDelete,
  onReply,
  onReact,
  onBookmark,
  onPin,
  onFlag,
  onShare,
  onViewProfile,
  className
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [activeReactionCategory, setActiveReactionCategory] = useState('Faces')
  const [showReadReceipts, setShowReadReceipts] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')

  const messageRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to highlighted messages
  useEffect(() => {
    if (isHighlighted && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

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

  const formatRelativeTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />
      case 'sent':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-green-500" />
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="w-3 h-3 bg-red-500 rounded-full" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Failed to send. Click to retry.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      default:
        return null
    }
  }

  const handleReaction = (emoji: string) => {
    if (onReact && id) {
      onReact(id, emoji)
    }
    setShowReactions(false)
  }

  const handleQuickReaction = (emoji: string) => {
    if (onReact && id) {
      onReact(id, emoji)
    }
  }

  const renderContent = () => {
    // Parse markdown-like formatting
    let formattedContent = content
    
    // Bold text
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Italic text
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Code snippets
    formattedContent = formattedContent.replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
    
    // Links (basic URL detection)
    formattedContent = formattedContent.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>'
    )

    // Mentions
    formattedContent = formattedContent.replace(
      /@(\w+)/g,
      '<span class="bg-primary/20 text-primary px-1 rounded">@$1</span>'
    )

    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
  }

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null

    return (
      <div className="mt-2 space-y-2">
        {attachments.map(attachment => (
          <div key={attachment.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
            {attachment.type.startsWith('image/') && attachment.thumbnail ? (
              <div 
                className="relative w-12 h-12 rounded cursor-pointer overflow-hidden"
                onClick={() => {
                  setSelectedImageUrl(attachment.url)
                  setImagePreviewOpen(true)
                }}
              >
                <img 
                  src={attachment.thumbnail} 
                  alt={attachment.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                {getFileIcon(attachment.type)}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(attachment.url, '_blank')}
              className="h-8 w-8 p-0"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  const renderReactions = () => {
    if (!reactions || reactions.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {reactions.map((reaction, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={reaction.hasReacted ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs rounded-full transition-all",
                    reaction.hasReacted && "ring-2 ring-primary/50"
                  )}
                  onClick={() => handleReaction(reaction.emoji)}
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reaction.users.map(user => user.name).join(', ')}
                  {reaction.hasReacted && ' (including you)'}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    )
  }

  // System message styling
  if (messageType === 'system') {
    return (
      <div className={cn("flex justify-center my-4", className)}>
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full">
          {content}
        </div>
      </div>
    )
  }

  // Announcement message styling
  if (messageType === 'announcement') {
    return (
      <div className={cn("my-4", className)}>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Pin className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {sender?.name || sender?.email || 'System'}
                </span>
                <Badge className="bg-blue-500 text-white text-xs">Announcement</Badge>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {renderContent()}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                {formatMessageTime(createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={messageRef}
      className={cn(
        "flex gap-3 group relative transition-all duration-200",
        isOwnMessage ? "justify-end" : "justify-start",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/20 -mx-4 px-4 py-2 rounded-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar - Left side for others */}
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0">
          <div 
            className="relative cursor-pointer"
            onClick={() => sender?.id && onViewProfile?.(sender.id)}
          >
            <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary/50 transition-all">
              {sender?.avatar && <AvatarImage src={sender.avatar} alt={sender.name || sender.email} />}
              <AvatarFallback className="bg-primary/10 text-xs">
                {getUserInitials(sender?.name, sender?.email)}
              </AvatarFallback>
            </Avatar>
            {sender?.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[70%] min-w-0",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Sender info */}
        {showSender && !isOwnMessage && sender && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span 
              className="text-sm font-medium text-foreground hover:text-primary cursor-pointer"
              onClick={() => sender.id && onViewProfile?.(sender.id)}
            >
              {sender.name || sender.email}
            </span>
            {sender.role && (
              <Badge variant="outline" className="text-xs">
                {sender.role}
              </Badge>
            )}
            {isPinned && (
              <Pin className="w-3 h-3 text-amber-500" />
            )}
            {isBookmarked && (
              <Bookmark className="w-3 h-3 text-blue-500 fill-current" />
            )}
          </div>
        )}

        {/* Reply context */}
        {replyTo && (
          <div className="mb-2 w-full">
            <div className="bg-muted/50 border-l-2 border-primary/50 pl-3 py-1 rounded-r text-xs">
              <div className="font-medium text-muted-foreground mb-1">
                Replying to {replyTo.sender_name}
              </div>
              <div className="text-muted-foreground truncate">
                {replyTo.content}
              </div>
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative w-full">
          <div
            className={cn(
              "px-4 py-2 rounded-2xl relative transition-all duration-200 group-hover:shadow-md",
              isOwnMessage
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md",
              "shadow-sm"
            )}
          >
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {renderContent()}
            </div>
            
            {/* Edited indicator */}
            {editedAt && (
              <div className="text-xs opacity-70 mt-1">
                <span>(edited {formatRelativeTime(editedAt)})</span>
              </div>
            )}

            {/* Attachments */}
            {renderAttachments()}
          </div>

          {/* Quick Reaction Bar */}
          {isHovered && !isOwnMessage && (
            <div className="absolute -top-3 right-2 flex gap-1 bg-background border rounded-full px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {QUICK_REACTIONS.slice(0, 3).map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted rounded-full"
                  onClick={() => handleQuickReaction(emoji)}
                >
                  {emoji}
                </Button>
              ))}
              
              <Popover open={showReactions} onOpenChange={setShowReactions}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted rounded-full"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="flex border-b">
                    {Object.keys(REACTION_CATEGORIES).map(category => (
                      <Button
                        key={category}
                        variant={activeReactionCategory === category ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 text-xs h-8 rounded-none"
                        onClick={() => setActiveReactionCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                  <ScrollArea className="h-32 p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {REACTION_CATEGORIES[activeReactionCategory as keyof typeof REACTION_CATEGORIES].map(emoji => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted rounded"
                          onClick={() => handleReaction(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Action buttons */}
          {(onEdit || onDelete || onReply) && (
            <div className={cn(
              "absolute top-0 transition-opacity duration-200",
              isOwnMessage ? "-left-10" : "-right-10",
              isHovered ? "opacity-100" : "opacity-0"
            )}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shadow-lg border bg-background">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="w-48">
                  <DropdownMenuItem onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </DropdownMenuItem>
                  
                  {onReply && (
                    <DropdownMenuItem onClick={() => id && onReply(id)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  )}

                  {onShare && (
                    <DropdownMenuItem onClick={() => id && onShare(id)}>
                      <Share className="w-4 h-4 mr-2" />
                      Share Message
                    </DropdownMenuItem>
                  )}

                  {onBookmark && (
                    <DropdownMenuItem onClick={() => id && onBookmark(id)}>
                      <Bookmark className="w-4 h-4 mr-2" />
                      {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {isOwnMessage && onEdit && (
                    <DropdownMenuItem onClick={() => id && onEdit(id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Message
                    </DropdownMenuItem>
                  )}

                  {onPin && (
                    <DropdownMenuItem onClick={() => id && onPin(id)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {isPinned ? 'Unpin Message' : 'Pin Message'}
                    </DropdownMenuItem>
                  )}

                  {onFlag && (
                    <DropdownMenuItem onClick={() => id && onFlag(id)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report Message
                    </DropdownMenuItem>
                  )}

                  {isOwnMessage && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => id && onDelete(id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Message
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Reactions */}
        {renderReactions()}

        {/* Timestamp, status, and read receipts */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(createdAt)}
          </span>
          
          {isOwnMessage && getStatusIcon()}

          {/* Read receipts */}
          {readReceipts.length > 0 && (
            <Popover open={showReadReceipts} onOpenChange={setShowReadReceipts}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {readReceipts.length}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="text-sm font-medium mb-2">Read by</div>
                <div className="space-y-2">
                  {readReceipts.map(receipt => (
                    <div key={receipt.user_id} className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        {receipt.user_avatar && <AvatarImage src={receipt.user_avatar} />}
                        <AvatarFallback className="text-xs">
                          {receipt.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{receipt.user_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(receipt.read_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Avatar - Right side for own messages */}
      {isOwnMessage && showAvatar && (
        <div className="flex-shrink-0">
          <div 
            className="relative cursor-pointer"
            onClick={() => sender?.id && onViewProfile?.(sender.id)}
          >
            <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary/50 transition-all">
              {sender?.avatar && <AvatarImage src={sender.avatar} alt={sender.name || sender.email} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getUserInitials(sender?.name, sender?.email)}
              </AvatarFallback>
            </Avatar>
            {sender?.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewOpen && selectedImageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <img 
              src={selectedImageUrl} 
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation()
                setImagePreviewOpen(false)
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}