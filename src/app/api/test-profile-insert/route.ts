import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Use service role key to bypass RLS (copied from create-users route)
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

export async function POST(request: Request) {
  try {
    console.log('=== Test Profile Insert API Called ===')
    
    // Check service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('Service key available:', !!serviceKey)
    console.log('Service key length:', serviceKey?.length || 0)
    
    // Generate a random UUID for the test profile
    const testId = randomUUID()
    
    // Test profile data
    const profileData = {
      id: testId,
      email: 'test-profile@test.com',
      first_name: 'Test',
      surname: 'User',
      role: 'admin'
    }
    
    console.log('Attempting to insert test profile:', JSON.stringify(profileData, null, 2))
    
    // Try to insert the test profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('Profile insertion failed:', profileError)
      return NextResponse.json({
        success: false,
        error: {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
          full_error: profileError
        },
        attempted_data: profileData
      }, { status: 400 })
    }
    
    console.log('Profile inserted successfully:', profile)
    
    return NextResponse.json({
      success: true,
      message: 'Test profile inserted successfully',
      inserted_data: profile,
      attempted_data: profileData
    })

  } catch (error: any) {
    console.error('Unexpected error during test profile insert:', error)
    return NextResponse.json({ 
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        full_error: error
      }
    }, { status: 500 })
  }
}