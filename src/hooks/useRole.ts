'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useRole() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) console.error(error)
      else setRole(data.role)
    }

    fetchRole()
  }, [])

  return role
}
