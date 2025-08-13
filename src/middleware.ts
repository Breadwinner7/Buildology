import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simplified security headers function
function applyBasicSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Remove revealing headers
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  return response
}

export async function middleware(request: NextRequest) {

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/tasks', 
    '/messages',
    '/settings',
    '/admin',
    '/appointments',
    '/approvals',
    '/claims',
    '/compliance',
    '/estimates',
    '/financials', 
    '/reports',
    '/risk-assessment'
  ]
  
  // For development - temporarily allow access without auth
  const isDevelopment = process.env.NODE_ENV === 'development'
  const allowBypass = isDevelopment && request.nextUrl.searchParams.has('bypass')

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Check authentication for protected routes
  if (isProtectedRoute && !allowBypass) {
    try {
      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        
        const redirectResponse = NextResponse.redirect(redirectUrl)
        return applyBasicSecurityHeaders(redirectResponse)
      }

      // Now safely get user since we know session exists
      const {
        data: { user },
        error
      } = await supabase.auth.getUser()

      if (error || !user) {
        // Handle AuthSessionMissingError specifically
        if (error?.message?.includes('AuthSessionMissingError') || error?.message?.includes('session_missing')) {
          console.warn('Auth session missing in middleware, redirecting to login')
        }
        
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        
        const redirectResponse = NextResponse.redirect(redirectUrl)
        return applyBasicSecurityHeaders(redirectResponse)
      }

      // Optional: Add user info to request headers for downstream usage
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-email', user.email || '')
      
    } catch (error: any) {
      console.error('Middleware auth error:', error)
      
      // Handle AuthSessionMissingError gracefully
      if (error.message?.includes('AuthSessionMissingError') || error.message?.includes('session_missing')) {
        console.warn('Auth session missing in middleware, redirecting to login')
      }
      
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      
      const errorResponse = NextResponse.redirect(redirectUrl)
      return applyBasicSecurityHeaders(errorResponse)
    }
  }

  // Redirect logged-in users away from login/signup pages
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        return applyBasicSecurityHeaders(redirectResponse)
      }
    } catch (error) {
      // If auth check fails, allow access to login page
      console.warn('Auth check failed for login page:', error)
    }
  }

  // Apply security headers to all responses
  return applyBasicSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for security middleware
     * Exclude only static assets and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}