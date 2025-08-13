import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/security/security-headers'

// CSRF token endpoint
export async function GET(request: NextRequest) {
  try {
    // Get session ID from request if available
    const sessionId = request.cookies.get('session-id')?.value || 
                     request.headers.get('x-session-id') || 
                     undefined

    // Generate CSRF token
    const csrfToken = generateCSRFToken(sessionId)

    const response = NextResponse.json({
      csrfToken,
      timestamp: new Date().toISOString()
    })

    // Set CSRF token in secure cookie
    response.cookies.set('__Host-csrf-token', csrfToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 4 * 60 * 60, // 4 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('CSRF token generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}

// Verify CSRF token endpoint
export async function POST(request: NextRequest) {
  try {
    const { token, sessionId } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'CSRF token is required' },
        { status: 400 }
      )
    }

    // For demonstration - in production, validation would be done in middleware
    return NextResponse.json({
      valid: true,
      message: 'CSRF token validation endpoint (validation occurs in middleware)'
    })

  } catch (error) {
    console.error('CSRF token verification failed:', error)
    return NextResponse.json(
      { error: 'Failed to verify CSRF token' },
      { status: 500 }
    )
  }
}