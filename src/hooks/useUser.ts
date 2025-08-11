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
