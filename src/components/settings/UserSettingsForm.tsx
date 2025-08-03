'use client'

import { useUser } from '@/hooks/useUser'
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabaseClient'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserSettingsForm() {
  const { user, refresh } = useUser()
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Populate values once user is loaded
  useEffect(() => {
    if (user) {
      setName(user.full_name ?? '')
      setAvatarUrl(user.avatar_url ?? '')
    }
  }, [user])

  if (!user) return null // Protect from premature render

  const handleUpdate = async () => {
    setLoading(true)

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: name, avatar_url: avatarUrl })
      .eq('id', user.id)

    setLoading(false)

    if (error) alert('Failed to update profile.')
    else {
      alert('Profile updated.')
      refresh?.()
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user.id) return

    const filePath = `${user.id}/${file.name}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (error) {
      alert('Failed to upload image.')
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setAvatarUrl(data.publicUrl)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Upload New Avatar
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email ?? ''} disabled />
      </div>

      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleUpdate} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            supabase.auth.resetPasswordForEmail(user.email!)
          }
        >
          Send Password Reset Email
        </Button>
      </div>
    </div>
  )
}
