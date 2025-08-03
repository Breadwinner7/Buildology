'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RealtimeOptions = {
  table: string
  filterColumn: string
  filterValue: string
  onInsert?: (newRow: any) => void
  onUpdate?: (updatedRow: any) => void
  onDelete?: (deletedRow: any) => void
}

export function useRealtime({
  table,
  filterColumn,
  filterValue,
  onInsert,
  onUpdate,
  onDelete,
}: RealtimeOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) onInsert(payload.new)
          if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload.new)
          if (payload.eventType === 'DELETE' && onDelete) onDelete(payload.old)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filterColumn, filterValue, onInsert, onUpdate, onDelete])
}
