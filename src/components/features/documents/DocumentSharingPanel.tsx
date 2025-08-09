'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface SharingEntry {
  shared_with_user?: string
  shared_with_role?: string
}

interface DocumentSharingPanelProps {
  documentId: string
  currentShares: SharingEntry[]
  currentUserRole: string
  refresh: () => void // callback to refresh data after changes
}

const availableRoles = ['contractor', 'customer', 'surveyor']

export function DocumentSharingPanel({
  documentId,
  currentShares,
  currentUserRole,
  refresh,
}: DocumentSharingPanelProps) {
  const [loading, setLoading] = useState(false)

  const shareWithRole = async (role: string) => {
    setLoading(true)
    await supabase.from('document_access').insert({
      document_id: documentId,
      shared_with_role: role,
    })
    refresh()
    setLoading(false)
  }

  const unshare = async (entry: SharingEntry) => {
    setLoading(true)
    const match = {
      document_id: documentId,
      ...(entry.shared_with_role
        ? { shared_with_role: entry.shared_with_role }
        : { shared_with_user: entry.shared_with_user }),
    }
    await supabase.from('document_access').delete().match(match)
    refresh()
    setLoading(false)
  }

  return (
    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 flex-wrap">
        {currentShares.map((entry, index) => (
          <Badge key={index} variant="outline" className="flex items-center gap-1">
            {entry.shared_with_role || 'User'}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-destructive"
              onClick={() => unshare(entry)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3 w-3" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableRoles
              .filter(role => role !== currentUserRole)
              .map(role => (
                <DropdownMenuItem key={role} onClick={() => shareWithRole(role)}>
                  Share with {role}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
