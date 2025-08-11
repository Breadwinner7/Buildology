'use client'

import { use } from 'react'
import { HODCodeManagement } from '@/components/features/hod-codes/HODCodeManagement'

export default function ProjectHODCodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  return (
    <div className="p-6">
      <HODCodeManagement projectId={id} />
    </div>
  )
}