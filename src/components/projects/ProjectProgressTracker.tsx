'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectValue,
  SelectContent,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { HOLD_REASONS } from '@/lib/constants'
import { toast } from 'sonner'

interface ProjectProgressTrackerProps {
  projectId: string
}

const STAGES = [
  'Book Survey',
  'Survey & Report',
  'Awaiting Agreement',
  'Planning & Authorisation',
  'Schedule Works',
  'Works In Progress',
  'Works Completed',
  'Snagging (if needed)',
  'Final Accounts & Invoicing',
  'Closed',
]

export function ProjectProgressTracker({ projectId }: ProjectProgressTrackerProps) {
  const [initialData, setInitialData] = useState<any>({})
  const [currentStage, setCurrentStage] = useState('')
  const [onHold, setOnHold] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [holdNotes, setHoldNotes] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const fetchStage = async () => {
      const { data } = await supabase
        .from('projects')
        .select('current_stage, on_hold, hold_reason, hold_reason_notes')
        .eq('id', projectId)
        .single()

      if (data) {
        setInitialData(data)
        setCurrentStage(data.current_stage || '')
        setOnHold(data.on_hold || false)
        setHoldReason(data.hold_reason || '')
        setHoldNotes(data.hold_reason_notes || '')
      }
    }

    fetchStage()
  }, [projectId])

  const handleSave = async () => {
    const updates = {
      current_stage: currentStage,
      on_hold: onHold,
      hold_reason: onHold ? holdReason : '',
      hold_reason_notes: onHold ? holdNotes : '',
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)

    if (error) {
      toast.error('Update failed')
    } else {
      toast.success('Project updated')
      setInitialData(updates)
      setIsDirty(false)
    }
  }

  const handleCancel = () => {
    setCurrentStage(initialData.current_stage || '')
    setOnHold(initialData.on_hold || false)
    setHoldReason(initialData.hold_reason || '')
    setHoldNotes(initialData.hold_reason_notes || '')
    setIsDirty(false)
  }

  const currentStageIndex = STAGES.indexOf(currentStage)
  const progressPercent = ((currentStageIndex + 1) / STAGES.length) * 100

  useEffect(() => {
    const hasChanges =
      currentStage !== initialData.current_stage ||
      onHold !== initialData.on_hold ||
      holdReason !== initialData.hold_reason ||
      holdNotes !== initialData.hold_reason_notes

    setIsDirty(hasChanges)
  }, [currentStage, onHold, holdReason, holdNotes, initialData])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* --- Stage Selector --- */}
        <div className="space-y-1">
          <Label>Current Stage</Label>
          <Select
            value={currentStage}
            onValueChange={(val) => setCurrentStage(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* --- Progress Bar --- */}
        <div className="space-y-1">
          <Label>Progress</Label>
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm text-muted-foreground w-[40px] text-right">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStage || 'Not started'}
          </p>
        </div>

        {/* --- Hold Toggle + Inputs --- */}
        <div className="space-y-2">
          <Label>On Hold?</Label>
          <Switch
            checked={onHold}
            onCheckedChange={(checked) => {
              setOnHold(checked)
              if (!checked) {
                setHoldReason('')
                setHoldNotes('')
              }
            }}
          />

          {onHold && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>Reason</Label>
                <Select
                  value={holdReason}
                  onValueChange={(val) => setHoldReason(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hold reason" />
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

              <div className="space-y-1">
                <Label>Optional Notes</Label>
                <Input
                  value={holdNotes}
                  onChange={(e) => setHoldNotes(e.target.value)}
                  placeholder="Add context"
                />
              </div>
            </div>
          )}
        </div>

        {/* --- Hold Badge --- */}
        {onHold && holdReason && (
          <div className="flex justify-end pt-2">
            <Badge variant="destructive" className="text-sm">
              On Hold: {holdReason}
              {holdNotes && ` – ${holdNotes}`}
            </Badge>
          </div>
        )}

        {/* --- Save / Cancel Buttons --- */}
        {isDirty && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
