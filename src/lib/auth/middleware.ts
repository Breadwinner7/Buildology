import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function checkAuth(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { authenticated: false, user: null, role: null }
  }
  
  // Get user role from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, first_name, surname, organisation_id')
    .eq('id', user.id)
    .single()
  
  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      ...profile
    },
    role: profile?.role || null
  }
}

export function requireRole(allowedRoles: string[]) {
  return async function(request: NextRequest) {
    const auth = await checkAuth(request)
    
    if (!auth.authenticated) {
      return NextResponse.redirect(new URL('/admin/auth', request.url))
    }
    
    if (!allowedRoles.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return auth
  }
}