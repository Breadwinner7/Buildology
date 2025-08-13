import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    console.log('=== User Count API Called ===')
    
    // Query count of organisations
    const { count: orgCount, error: orgError } = await supabaseAdmin
      .from('organisations')
      .select('*', { count: 'exact', head: true })

    if (orgError) {
      console.error('Error counting organisations:', orgError)
      return NextResponse.json({ error: `Failed to count organisations: ${orgError.message}` }, { status: 500 })
    }

    // Query count of user_profiles
    const { count: profileCount, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (profileError) {
      console.error('Error counting user_profiles:', profileError)
      return NextResponse.json({ error: `Failed to count user_profiles: ${profileError.message}` }, { status: 500 })
    }

    // Query count of user_organisations
    const { count: userOrgCount, error: userOrgError } = await supabaseAdmin
      .from('user_organisations')
      .select('*', { count: 'exact', head: true })

    if (userOrgError) {
      console.error('Error counting user_organisations:', userOrgError)
      return NextResponse.json({ error: `Failed to count user_organisations: ${userOrgError.message}` }, { status: 500 })
    }

    console.log(`Counts - Organisations: ${orgCount}, User Profiles: ${profileCount}, User-Organisation Links: ${userOrgCount}`)

    return NextResponse.json({
      success: true,
      counts: {
        organisations: orgCount,
        user_profiles: profileCount,
        user_organisations: userOrgCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error getting user counts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}