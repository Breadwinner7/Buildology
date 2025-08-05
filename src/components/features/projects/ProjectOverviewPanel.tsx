'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateProjectDetails } from '@/lib/supabase/projects'
import { VULNERABILITY_OPTIONS } from '@/lib/constants'

interface ProjectOverviewPanelProps {
  project: any
}

export function ProjectOverviewPanel({ project }: ProjectOverviewPanelProps) {
  const [formData, setFormData] = useState(project)
  const [isEditing, setIsEditing] = useState(false)

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const toggleVulnerability = (tag: string) => {
    const current = formData.vulnerability_flags || []
    const updated = current.includes(tag)
      ? current.filter((v: string) => v !== tag)
      : [...current, tag]
    setFormData({ ...formData, vulnerability_flags: updated })
  }

  const handleSave = async () => {
    const { error } = await updateProjectDetails(project.id, formData)
    if (error) {
      toast.error('Update failed')
    } else {
      toast.success('Project updated')
      setIsEditing(false)
    }
  }

  return (
    <Card className="border-2 border-muted">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Contact & Project Info</CardTitle>
        <Button variant="ghost" onClick={() => setIsEditing(!isEditing)}>
          <Pencil className="w-4 h-4 mr-1" />
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            disabled={!isEditing}
            value={formData.contact_name || ''}
            onChange={e => handleChange('contact_name', e.target.value)}
            placeholder="Contact Name"
          />
          <Input
            disabled={!isEditing}
            value={formData.contact_phone || ''}
            onChange={e => handleChange('contact_phone', e.target.value)}
            placeholder="Phone Number"
          />
          <Input
            disabled={!isEditing}
            value={formData.contact_email || ''}
            onChange={e => handleChange('contact_email', e.target.value)}
            placeholder="Email"
          />
          <Textarea
            disabled={!isEditing}
            value={formData.contact_address || ''}
            onChange={e => handleChange('contact_address', e.target.value)}
            placeholder="Address"
            className="col-span-full"
          />
        </div>

        {/* Vulnerability Flags */}
        <div>
          <p className="text-sm font-semibold mb-2">Vulnerability Flags</p>
          <div className="flex flex-wrap gap-2">
            {VULNERABILITY_OPTIONS.map(flag => {
              const isSelected = formData.vulnerability_flags?.includes(flag)
              return (
                <Badge
                  key={flag}
                  variant={isSelected ? 'destructive' : 'outline'}
                  onClick={() => isEditing && toggleVulnerability(flag)}
                  className={`cursor-pointer select-none transition-all ${isEditing ? '' : 'pointer-events-none opacity-75'}`}
                >
                  {flag}
                  {isSelected && isEditing && <X className="w-3 h-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
