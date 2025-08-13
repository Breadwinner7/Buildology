'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState<any | null>(() => {
    // Try to get cached user from localStorage on initial load
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('cached_user')
        return cachedUser ? JSON.parse(cachedUser) : null
      } catch {
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const fetchUserWithProfile = async (authUser: any) => {
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            id, email, title, first_name, surname, preferred_name, job_title, role,
            mobile_phone, office_phone, emergency_contact_name, emergency_contact_phone,
            address_line_1, address_line_2, city, county, postcode, country,
            professional_qualifications, professional_certifications, professional_memberships,
            fca_reference, vat_number, company_registration, regions_covered, specialisms,
            maximum_claim_value, travel_radius_miles, available_weekdays, available_weekends,
            available_evenings, available_emergency, timezone, preferred_language,
            can_authorise_payments, is_active, last_login, created_at, updated_at,
            organisation_id, date_of_birth, ni_number, max_authorisation_limit
          `)
          .eq('id', authUser.id)
          .single()

        const userData = profile && !profileError ? { 
          ...authUser, 
          ...profile,
          full_name: profile.first_name && profile.surname 
            ? `${profile.first_name} ${profile.surname}` 
            : profile.preferred_name || 'User'
        } : { 
          ...authUser, 
          full_name: authUser.email?.split('@')[0] || 'User' 
        }
        
        setUser(userData)
        
        // Cache user data for faster initial loads
        try {
          localStorage.setItem('cached_user', JSON.stringify(userData))
        } catch (error) {
          console.warn('Failed to cache user data:', error)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setUser({ 
          ...authUser, 
          full_name: authUser.email?.split('@')[0] || 'User' 
        })
      }
      
      setLoading(false)
    }

    const initializeAuth = async () => {
      try {
        // First check if we have a session before trying to get user
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // No session exists, user is not authenticated
          setUser(null)
          setLoading(false)
          return
        }

        // Now safely get the user since we know session exists
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          // Handle specific auth errors
          if (authError.message.includes('session_missing') || authError.message.includes('AuthSessionMissingError')) {
            console.warn('Session missing, user not authenticated')
            setUser(null)
            setLoading(false)
            return
          }
          console.error('Auth error:', authError)
          setUser(null)
          setLoading(false)
          return
        }

        await fetchUserWithProfile(authUser)
      } catch (error: any) {
        console.error('Auth initialization error:', error)
        
        // Handle AuthSessionMissingError specifically
        if (error.message?.includes('AuthSessionMissingError') || error.message?.includes('session_missing')) {
          console.warn('Auth session missing during initialization')
        }
        
        setUser(null)
        setLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state change listener with profile fetching
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session?.user)
      
      try {
        if (!session?.user) {
          setUser(null)
          setLoading(false)
          // Clear cached user data on logout
          try {
            localStorage.removeItem('cached_user')
          } catch (error) {
            console.warn('Failed to clear cached user data:', error)
          }
          return
        }

        // Re-fetch profile data on auth state changes
        setLoading(true)
        await fetchUserWithProfile(session.user)
      } catch (error: any) {
        console.error('Error in auth state change:', error)
        
        // Handle AuthSessionMissingError in state changes
        if (error.message?.includes('AuthSessionMissingError') || error.message?.includes('session_missing')) {
          console.warn('Session missing during auth state change')
          setUser(null)
        }
        
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Determine if user is admin based on role
  const isAdmin = user?.role && [
    'super_admin',
    'admin',
    'underwriting_manager',
    'claims_director',
    'claims_manager',
    'finance_controller',
    'litigation_manager'
  ].includes(user.role)

  return { user, loading, isAdmin }
}
