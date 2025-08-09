'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useUser() {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (!authUser || authError) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile && !profileError) {
        setUser({ ...authUser, ...profile })
      } else {
        setUser(authUser) // fallback to basic user
      }

      setLoading(false)
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
