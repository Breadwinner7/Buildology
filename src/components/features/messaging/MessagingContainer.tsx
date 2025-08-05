// components/features/messaging/MessagingContainer.tsx
// This replaces both MessagingModule and the scattered messaging components

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import ThreadSidebar from './ThreadSidebar'
import MessagingPanel from './MessagingPanel'

interface MessagingContainerProps {
  projectId?: string
}

export default function MessagingContainer({ projectId: propProjectId }: MessagingContainerProps) {
  const params = useParams()
  const projectId = propProjectId || (params.id as string)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No Project Selected</p>
          <p className="text-muted-foreground">Please select a project to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Mobile: Show sidebar or panel, not both */}
      {isMobile ? (
        selectedThreadId ? (
          <div className="flex-1">
            <MessagingPanel 
              threadId={selectedThreadId} 
              onBack={() => setSelectedThreadId(null)}
              showBackButton={true}
            />
          </div>
        ) : (
          <div className="flex-1">
            <ThreadSidebar
              projectId={projectId}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
            />
          </div>
        )
      ) : (
        /* Desktop: Show both sidebar and panel */
        <>
          <div className="w-80 flex-shrink-0">
            <ThreadSidebar
              projectId={projectId}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
            />
          </div>
          
          <Separator orientation="vertical" />
          
          <div className="flex-1">
            {selectedThreadId ? (
              <MessagingPanel threadId={selectedThreadId} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="text-lg font-medium text-muted-foreground">
                    Select a conversation
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a thread from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// components/features/messaging/MessageInput.tsx
// Unified message input component (replaces duplicates)

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  className 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if (!message.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className={cn("border-t p-4", className)}>
      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="min-h-[36px] max-h-[120px] resize-none pr-10"
            rows={1}
          />
          
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-8 w-8"
            disabled={disabled}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Update your pages to use the unified system:

// app/projects/[id]/messages/page.tsx - SIMPLIFIED
'use client'

import MessagingContainer from '@/components/features/messaging/MessagingContainer'

export default function MessagesPage() {
  return <MessagingContainer />
}

// components/features/messaging/index.ts - Clean exports
export { default as MessagingContainer } from './MessagingContainer'
export { default as ThreadSidebar } from './ThreadSidebar'  
export { default as MessagingPanel } from './MessagingPanel'
export { default as MessageInput } from './MessageInput'
export { default as CreateThreadModal } from './CreateThreadModal'