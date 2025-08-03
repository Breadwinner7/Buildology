'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { HOLD_REASONS } from '@/lib/constants'
import { toast } from 'sonner'

interface HoldStatusBannerProps {
  projectId: string
}

export function HoldStatusBanner({ projectId }: HoldStatusBannerProps) {
  const [holdReason, setHoldReason] = useState('')
  const [holdNotes, setHoldNotes] = useState('')
  const [editing, setEditing] = useState(false)

  // Fetch latest data
  const fetchHold = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('hold_reason, hold_reason_notes')
      .eq('id', projectId)
      .single()

    if (error) {
      toast.error('Failed to fetch hold reason')
      return
    }

    if (data) {
      setHoldReason(data.hold_reason || '')
      setHoldNotes(data.hold_reason_notes || '')
    }
  }

  useEffect(() => {
    fetchHold()
  }, [projectId])

  const saveHoldReason = async () => {
    const cleanedReason = holdReason.trim()
    const cleanedNotes = holdNotes.trim()

    const updates = {
      hold_reason: cleanedReason,
      hold_reason_notes: cleanedNotes,
      on_hold: !!cleanedReason,
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)

    if (error) {
      toast.error('Failed to update hold reason')
    } else {
      toast.success(cleanedReason ? 'Hold reason updated' : 'Hold removed')
      setEditing(false)
      await fetchHold()
    }
  }

  // Only show if holdReason is set or editing is active
  if (!holdReason && !editing) return null

  return (
    <div className="bg-red-100 border border-red-400 text-red-800 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <h2 className="font-semibold">This project is currently on hold</h2>
      </div>

      {editing ? (
        <>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={holdReason}
              onValueChange={(val) => setHoldReason(val)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {HOLD_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Optional Notes</Label>
            <Textarea
              value={holdNotes}
              onChange={(e) => setHoldNotes(e.target.value)}
              rows={3}
              placeholder="Provide any context if needed"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={saveHoldReason}>
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Reason: {holdReason}</p>
          {holdNotes && <p className="text-sm">Notes: {holdNotes}</p>}
          <Button
            size="sm"
            variant="link"
            className="self-start"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        </>
      )}
    </div>
  )
}
