'use client'

import { use } from 'react'
import { ReserveManagement } from '@/components/features/reserves/ReserveManagement'

export default function ProjectReservesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  return (
    <div className="p-6">
      <ReserveManagement projectId={id} />
    </div>
  )
}