'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Topbar } from './Topbar'
import { Skeleton } from '@/components/ui/loading'

/**
 * ConditionalTopbar Component
 * 
 * Conditionally renders the Topbar based on:
 * - Current route (auth pages don't show topbar)
 * - Authentication state (unauthenticated users only see topbar on public pages)
 * - Loading state (shows skeleton during auth check)
 */

// Auth pages where Topbar should NOT render
const AUTH_PAGES = ['/login', '/signup', '/register', '/auth'] as const

// Public pages where Topbar should render even without authentication
const PUBLIC_PAGES = ['/'] as const

type AuthPage = typeof AUTH_PAGES[number]
type PublicPage = typeof PUBLIC_PAGES[number]

interface ConditionalTopbarProps {
  className?: string
}

/**
 * Loading skeleton that mimics the Topbar structure
 */
function TopbarSkeleton() {
  return (
    <div className="flex h-16 items-center justify-between border-b px-4 sm:px-6 glass sticky top-0 z-50 shadow-sm">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button Skeleton */}
        <div className="md:hidden">
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Logo Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="hidden sm:block h-6 w-24" />
        </div>

        {/* Navigation Skeleton */}
        <div className="hidden md:flex gap-1 ml-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Center Search Skeleton */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <Skeleton className="lg:hidden h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}

/**
 * Checks if the current path is an authentication page
 */
function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(authPage => {
    // Exact match for auth pages
    if (pathname === authPage) return true
    
    // Handle auth pages with sub-routes (e.g., /auth/callback, /login/forgot-password)
    if (pathname.startsWith(authPage + '/')) return true
    
    return false
  })
}

/**
 * Checks if the current path is a public page
 */
function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some(publicPage => {
    // Exact match for public pages
    if (pathname === publicPage) return true
    
    // Handle public pages with query params or fragments
    if (publicPage === '/' && pathname === '/') return true
    
    return false
  })
}

export function ConditionalTopbar({ className }: ConditionalTopbarProps) {
  const pathname = usePathname()
  const { user, loading } = useUser()

  // Early return for auth pages - never show Topbar
  if (isAuthPage(pathname)) {
    return null
  }

  // Show loading skeleton while checking authentication state
  if (loading) {
    return <TopbarSkeleton />
  }

  // Check if user is authenticated
  const isAuthenticated = !!user

  // For non-auth pages, show Topbar if:
  // 1. User is authenticated, OR
  // 2. User is not authenticated BUT on a public page
  // 3. During loading, show topbar to prevent layout shifts
  const shouldShowTopbar = isAuthenticated || isPublicPage(pathname)

  if (!shouldShowTopbar && !loading) {
    return null
  }

  // Render the Topbar with any additional props
  return (
    <div className={className}>
      <Topbar />
    </div>
  )
}

// Export helper functions for testing
export { isAuthPage, isPublicPage, AUTH_PAGES, PUBLIC_PAGES }