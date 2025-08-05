'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import ThreadSidebar from '@/components/features/messaging/ThreadSidebar'
import MessagingPanel from '@/components/features/messaging/MessagingPanel'
import { Separator } from '@/components/ui/separator'

export default function MessagingPage() {
  // Fix: Use 'id' not 'projectId' because your route is /projects/[id]/messages
  const { id } = useParams<{ id: string }>()
  const projectId = id
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  // Debug logging
  console.log('🎯 Project Messaging Page - useParams():', useParams())
  console.log('🎯 Project Messaging Page - id:', id)
  console.log('🎯 Project Messaging Page - projectId:', projectId)

  // Prevent rendering if no projectId
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left thread sidebar */}
      <ThreadSidebar
        projectId={projectId}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
      />

      <Separator orientation="vertical" className="h-full" />

      {/* Messaging panel */}
      <div className="flex-1 p-4 overflow-hidden">
        {selectedThreadId ? (
          <MessagingPanel threadId={selectedThreadId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="text-lg font-medium">Select a conversation</div>
              <p className="text-sm">Choose a thread from the sidebar to start messaging</p>
              <p className="text-xs opacity-70">Project: {projectId}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}