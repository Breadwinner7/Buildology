// app/projects/[id]/documents/page.tsx (note: [id] not [projectId])

'use client'

import { useParams } from 'next/navigation'
import DocumentsModule from '@/components/modules/DocumentsModule//DocumentsModule'

export default function ProjectDocumentsPage() {
  const { id } = useParams() // Changed from projectId to id
  const projectId = id as string
  
  // Debug logging to see what we're getting
  console.log('🎯 Documents Page - received id:', id, typeof id)
  console.log('🎯 Documents Page - projectId:', projectId, typeof projectId)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">📁 Documents</h1>
        <p className="text-muted-foreground">
          Upload, view, and manage all documents for this project.
        </p>
      </div>
      <DocumentsModule projectId={projectId} />
    </div>
  )
}