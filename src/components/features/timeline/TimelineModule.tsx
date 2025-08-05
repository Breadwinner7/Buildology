'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: string
  type: string
  content: string
  created_at: string
}

const typeStyles: Record<string, string> = {
  note: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  task: 'text-blue-700 border-blue-300 bg-blue-50',
  upload: 'text-green-700 border-green-300 bg-green-50',
  message: 'text-purple-700 border-purple-300 bg-purple-50',
}

export default function TimelineModule({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setEvents(data)
    }

    fetchEvents()
  }, [projectId])

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h2 className="text-lg font-semibold">📜 Project Timeline</h2>
      <ul className="space-y-3">
        {events.map(event => (
          <li
            key={event.id}
            className={cn(
              "p-3 border rounded",
              typeStyles[event.type] || "border-muted bg-muted"
            )}
          >
            <p className="text-sm">{event.content}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(event.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
