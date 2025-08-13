'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { RealtimeSubscription } from '@/types/common'

// Generic realtime hook with proper typing
export function useRealtime<T = Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: RealtimeSubscription<T> & { filter?: string }) {
  useEffect(() => {
    const channelName = `${table}${filter ? `-${filter}` : ''}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert && payload.new) {
                onInsert(payload.new as T)
              }
              break
            case 'UPDATE':
              if (onUpdate && payload.new) {
                onUpdate(payload.new as T)
              }
              break
            case 'DELETE':
              if (onDelete && payload.old) {
                onDelete(payload.old as T)
              }
              break
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Subscribed to ${table} realtime updates`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${table} realtime updates`)
        }
      })

    return () => {
      console.log(`📡 Unsubscribing from ${table} realtime updates`)
      supabase.removeChannel(channel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete])
}

// Convenience hooks for specific tables with proper typing
export function useProjectRealtime(
  projectId: string,
  callbacks: {
    onInsert?: (project: ProjectSummary) => void
    onUpdate?: (project: ProjectSummary) => void
    onDelete?: (project: ProjectSummary) => void
  }
) {
  return useRealtime({
    table: 'projects',
    filter: `id=eq.${projectId}`,
    ...callbacks,
  })
}

export function useDocumentRealtime(
  projectId: string,
  callbacks: {
    onInsert?: (document: InsuranceDocument) => void
    onUpdate?: (document: InsuranceDocument) => void
    onDelete?: (document: InsuranceDocument) => void
  }
) {
  return useRealtime({
    table: 'documents',
    filter: `project_id=eq.${projectId}`,
    ...callbacks,
  })
}

export function useTaskRealtime(
  projectId: string,
  callbacks: {
    onInsert?: (task: Task) => void
    onUpdate?: (task: Task) => void
    onDelete?: (task: Task) => void
  }
) {
  return useRealtime({
    table: 'tasks',
    filter: `project_id=eq.${projectId}`,
    ...callbacks,
  })
}

// Import types for convenience
import type { ProjectSummary, InsuranceDocument, Task } from '@/types/common'