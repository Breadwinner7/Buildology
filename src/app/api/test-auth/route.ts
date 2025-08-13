import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// Test authentication endpoint to verify test user credentials
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Test credentials
    const testEmail = 'admin@test.com'
    const testPassword = 'TestPass123!'
    
    // Create a regular Supabase client (not service role)
    const supabase = createClient()
    
    // Attempt to sign in with test credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.status,
        testCredentials: {
          email: testEmail,
          password: '[REDACTED]'
        },
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }
    
    // If successful, immediately sign out to clean up
    await supabase.auth.signOut()
    
    return NextResponse.json({
      success: true,
      message: 'Test user authentication successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
        lastSignIn: data.user?.last_sign_in_at,
        createdAt: data.user?.created_at
      },
      session: {
        accessToken: data.session ? '[PRESENT]' : null,
        refreshToken: data.session ? '[PRESENT]' : null,
        expiresAt: data.session?.expires_at
      },
      testCredentials: {
        email: testEmail,
        password: '[REDACTED]'
      },
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
      testCredentials: {
        email: 'admin@test.com',
        password: '[REDACTED]'
      },
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST endpoint for testing with custom credentials (optional)
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { email = 'admin@test.com', password = 'TestPass123!' } = body
    
    // Create a regular Supabase client (not service role)
    const supabase = createClient()
    
    // Attempt to sign in with provided credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.status,
        testCredentials: {
          email,
          password: '[REDACTED]'
        },
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }
    
    // If successful, immediately sign out to clean up
    await supabase.auth.signOut()
    
    return NextResponse.json({
      success: true,
      message: 'Authentication test successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
        lastSignIn: data.user?.last_sign_in_at,
        createdAt: data.user?.created_at
      },
      session: {
        accessToken: data.session ? '[PRESENT]' : null,
        refreshToken: data.session ? '[PRESENT]' : null,
        expiresAt: data.session?.expires_at
      },
      testCredentials: {
        email,
        password: '[REDACTED]'
      },
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}