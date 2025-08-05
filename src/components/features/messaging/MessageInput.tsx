'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { 
  Send, 
  Paperclip, 
  Smile,
  Loader2,
  Bold,
  Italic,
  Code,
  Link,
  AtSign,
  Hash,
  Image,
  FileText,
  Mic,
  StopCircle,
  Volume2,
  X,
  Plus,
  Zap,
  Calendar,
  MapPin,
  Quote
} from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string, attachments?: File[], mentions?: string[]) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  maxLength?: number
  className?: string
  showAttachments?: boolean
  showEmojis?: boolean
  showFormatting?: boolean
  showMentions?: boolean
  allowVoice?: boolean
  onChange?: (content: string) => void
  participants?: Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  onCancelReply?: () => void
}

interface Mention {
  id: string
  name: string
  startIndex: number
  endIndex: number
}

const EMOJI_CATEGORIES = {
  'Smileys & Emotion': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'
  ],
  'Gestures': [
    '👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '🤟', '🤘', '👊',
    '✊', '🤛', '🤜', '👋', '🤚', '🖐', '✋', '🖖', '👆', '🖕'
  ],
  'Hearts': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'
  ],
  'Symbols': [
    '🔥', '⭐', '🌟', '✨', '⚡', '💥', '💯', '💫', '🎉', '🎊',
    '👀', '💭', '💬', '🗨️', '🗯️', '💤', '💢', '💨', '🕳️'
  ]
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: 'Schedule', action: 'schedule' },
  { icon: MapPin, label: 'Location', action: 'location' },
  { icon: Zap, label: 'AI Assist', action: 'ai' },
  { icon: Quote, label: 'Quote', action: 'quote' }
]

export function MessageInput({ 
  onSend, 
  placeholder = "Type your message...",
  disabled = false,
  loading = false,
  maxLength = 4000,
  className,
  showAttachments = true,
  showEmojis = true,
  showFormatting = true,
  showMentions = true,
  allowVoice = true,
  onChange,
  participants = [],
  replyTo,
  onCancelReply
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('Smileys & Emotion')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dragCounter = useRef(0)

  // Auto-resize textarea with smooth animation
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 120)
      textarea.style.height = newHeight + 'px'
    }
  }, [message])

  // Handle typing notification with debouncing
  useEffect(() => {
    if (onChange && message.trim()) {
      const debounceTimer = setTimeout(() => {
        onChange(message)
      }, 300)

      return () => clearTimeout(debounceTimer)
    }
  }, [message, onChange])

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      setRecordingTime(0)
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  const handleSend = useCallback(() => {
    if ((!message.trim() && attachments.length === 0) || disabled || loading) return
    
    const mentionIds = mentions.map(m => m.id)
    onSend(message.trim(), attachments, mentionIds)
    
    // Reset state
    setMessage('')
    setAttachments([])
    setMentions([])
    setUploadProgress({})
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Focus back to input
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [message, attachments, mentions, onSend, disabled, loading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message
    if (e.key === 'Enter' && !e.shiftKey && !showMentionPopover) {
      e.preventDefault()
      handleSend()
      return
    }

    // Handle mention navigation
    if (showMentionPopover) {
      if (e.key === 'Escape') {
        setShowMentionPopover(false)
        return
      }
    }

    // Handle formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertFormatting('bold')
          break
        case 'i':
          e.preventDefault()
          insertFormatting('italic')
          break
        case 'k':
          e.preventDefault()
          insertFormatting('link')
          break
      }
    }

    // Track cursor position for mentions
    setTimeout(() => {
      setCursorPosition(textareaRef.current?.selectionStart || 0)
    }, 0)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setMessage(newValue)

    // Check for @ mentions
    if (showMentions) {
      const beforeCursor = newValue.substring(0, e.target.selectionStart || 0)
      const atMatch = beforeCursor.match(/@(\w*)$/)
      
      if (atMatch) {
        setMentionQuery(atMatch[1])
        setShowMentionPopover(true)
      } else {
        setShowMentionPopover(false)
      }
    }
  }

  const insertMention = (participant: typeof participants[0]) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart || 0
    const beforeCursor = message.substring(0, start)
    const afterCursor = message.substring(start)
    
    // Find the @ symbol position
    const atIndex = beforeCursor.lastIndexOf('@')
    const beforeAt = message.substring(0, atIndex)
    
    const mentionText = `@${participant.name}`
    const newMessage = beforeAt + mentionText + ' ' + afterCursor
    
    const newMention: Mention = {
      id: participant.id,
      name: participant.name,
      startIndex: atIndex,
      endIndex: atIndex + mentionText.length
    }

    setMessage(newMessage)
    setMentions(prev => [...prev, newMention])
    setShowMentionPopover(false)
    
    // Position cursor after mention
    setTimeout(() => {
      const newPosition = atIndex + mentionText.length + 1
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const insertFormatting = (type: 'bold' | 'italic' | 'code' | 'link' | 'quote') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const selectedText = message.substring(start, end)
    
    let formattedText = ''
    let cursorOffset = 0

    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`
        cursorOffset = selectedText ? 0 : 2
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        cursorOffset = selectedText ? 0 : 1
        break
      case 'code':
        formattedText = selectedText.includes('\n') 
          ? `\`\`\`\n${selectedText}\n\`\`\``
          : `\`${selectedText}\``
        cursorOffset = selectedText ? 0 : (selectedText.includes('\n') ? 4 : 1)
        break
      case 'link':
        formattedText = `[${selectedText || 'link text'}](url)`
        cursorOffset = selectedText ? formattedText.length - 4 : formattedText.length - 15
        break
      case 'quote':
        formattedText = `> ${selectedText}`
        cursorOffset = selectedText ? 0 : 2
        break
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)
    
    // Position cursor
    setTimeout(() => {
      const newPosition = start + formattedText.length - cursorOffset
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Add file validation logic here
      const maxSize = 10 * 1024 * 1024 // 10MB
      return file.size <= maxSize
    })

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles])
      
      // Simulate upload progress
      validFiles.forEach(file => {
        simulateUploadProgress(file.name)
      })
    }
  }

  const simulateUploadProgress = (fileName: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileName]
            return newProgress
          })
        }, 500)
      }
      setUploadProgress(prev => ({ ...prev, [fileName]: progress }))
    }, 200)
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const newMessage = message.substring(0, start) + emoji + message.substring(end)
    
    setMessage(newMessage)
    
    // Position cursor after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const audioChunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm'
        })
        setAttachments(prev => [...prev, audioFile])
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    dragCounter.current = 0
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const characterCount = message.length
  const isOverLimit = characterCount > maxLength
  const isNearLimit = characterCount > maxLength * 0.8

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Reply Preview */}
        {replyTo && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">
                Replying to {replyTo.senderName}
              </div>
              <div className="text-sm truncate">{replyTo.content}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-background rounded-md p-2 border">
                <div className="flex items-center gap-2">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-4 h-4 text-blue-500" />
                  ) : file.type.startsWith('audio/') ? (
                    <Volume2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-orange-500" />
                  )}
                  <span className="text-sm truncate max-w-32">{file.name}</span>
                </div>
                
                {uploadProgress[file.name] && (
                  <div className="w-16">
                    <Progress value={uploadProgress[file.name]} className="h-1" />
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Area */}
        <div 
          className={cn(
            "relative rounded-lg border transition-all duration-200",
            isFocused ? "border-primary ring-2 ring-primary/20" : "border-input",
            isDragging && "border-primary border-2 bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            isRecording && "border-red-500 ring-2 ring-red-500/20"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5 rounded-lg z-10">
              <div className="text-center">
                <Paperclip className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Drop files to attach</p>
              </div>
            </div>
          )}

          {/* Recording Overlay */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-950/50 rounded-lg z-10">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-medium">Recording {formatTime(recordingTime)}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  className="h-8"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              </div>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={message}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || loading || isRecording}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent pr-16 focus-visible:ring-0 focus-visible:ring-offset-0",
              isOverLimit && "text-destructive"
            )}
            maxLength={maxLength}
          />
          
          {/* Action buttons overlay */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Formatting Tools */}
            {showFormatting && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => insertFormatting('bold')}
                      disabled={disabled || loading}
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => insertFormatting('italic')}
                      disabled={disabled || loading}
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 mx-1" />
              </>
            )}

            {/* Quick Actions */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  disabled={disabled || loading}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="grid grid-cols-2 gap-1">
                  {QUICK_ACTIONS.map(({ icon: Icon, label, action }) => (
                    <Button
                      key={action}
                      variant="ghost"
                      size="sm"
                      className="h-auto p-3 flex flex-col gap-1"
                      onClick={() => {
                        // Handle quick actions
                        console.log(`Quick action: ${action}`)
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Attachments */}
            {showAttachments && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || loading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach files</TooltipContent>
              </Tooltip>
            )}
            
            {/* Voice Recording */}
            {allowVoice && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={disabled || loading}
                  >
                    {isRecording ? (
                      <StopCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRecording ? 'Stop recording' : 'Voice message'}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Emoji Picker */}
            {showEmojis && (
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    disabled={disabled || loading}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="flex border-b">
                    {Object.keys(EMOJI_CATEGORIES).map(category => (
                      <Button
                        key={category}
                        variant={activeEmojiCategory === category ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 text-xs h-8 rounded-none"
                        onClick={() => setActiveEmojiCategory(category)}
                      >
                        {category.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                  <ScrollArea className="h-40 p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_CATEGORIES[activeEmojiCategory as keyof typeof EMOJI_CATEGORIES].map(emoji => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
            
            <Button 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleSend}
              disabled={(!message.trim() && attachments.length === 0) || disabled || loading || isOverLimit}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {showFormatting && (
              <span className="hidden sm:inline">
                Use **bold**, *italic*, `code`, [links](url)
              </span>
            )}
          </div>
          
          {/* Character Count */}
          <div className={cn(
            "flex items-center gap-1",
            isNearLimit && !isOverLimit && "text-yellow-600",
            isOverLimit && "text-destructive"
          )}>
            <span>{characterCount}/{maxLength}</span>
            {isOverLimit && (
              <span className="text-xs">Too long</span>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          className="hidden"
        />

        {/* Mention Popover */}
        {showMentionPopover && filteredParticipants.length > 0 && (
          <div className="absolute bottom-full left-0 w-64 bg-popover border rounded-md shadow-lg z-50 mb-2">
            <div className="p-2 text-xs font-medium text-muted-foreground border-b">
              Mention someone
            </div>
            <ScrollArea className="max-h-40">
              {filteredParticipants.map(participant => (
                <Button
                  key={participant.id}
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto"
                  onClick={() => insertMention(participant)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">{participant.name}</div>
                      <div className="text-xs text-muted-foreground">{participant.email}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </ScrollArea>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Export both names for compatibility
export { MessageInput as EnhancedMessageInput }
export default MessageInput