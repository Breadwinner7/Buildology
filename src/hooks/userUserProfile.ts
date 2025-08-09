'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from './useUser'

export function useUserProfile() {
  const { user } = useUser()

  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('user_profiles') // Replace with your actual profile table name
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  return {
    userProfile,
    loading: isLoading,
    error,
  }
}
