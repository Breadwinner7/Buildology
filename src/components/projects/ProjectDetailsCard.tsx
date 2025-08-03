'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProjectDetailsCardProps {
  projectId: string
}

export function ProjectDetailsCard({ projectId }: ProjectDetailsCardProps) {
  const [data, setData] = useState({
    reference: '',
    peril_type: '',
    job_type: '',
    excess: '',
    insurer: '',
    policy_number: '',
  })
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      const { data } = await supabase
        .from('projects')
        .select('reference, peril_type, job_type, excess, insurer, policy_number')
        .eq('id', projectId)
        .single()

      if (data) setData(data)
    }

    fetchDetails()
  }, [projectId])

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', projectId)

    if (error) toast.error('Update failed')
    else {
      toast.success('Project details updated')
      setEditing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Details</CardTitle>
        {!editing && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Reference', key: 'reference' },
          { label: 'Peril Type', key: 'peril_type' },
          { label: 'Job Type', key: 'job_type' },
          { label: 'Excess', key: 'excess' },
          { label: 'Insurer', key: 'insurer' },
          { label: 'Policy Number', key: 'policy_number' },
        ].map(({ label, key }) => (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <Input
              value={data[key as keyof typeof data] || ''}
              disabled={!editing}
              onChange={(e) =>
                setData({ ...data, [key]: e.target.value })
              }
            />
          </div>
        ))}

        {editing && (
          <div className="col-span-full flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdate}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
