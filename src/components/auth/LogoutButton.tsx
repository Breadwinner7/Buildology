'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      }
      
      // Force page reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Still redirect even if logout fails
      window.location.href = '/login'
    }
  }

  return <Button onClick={handleLogout}>Log Out</Button>
}