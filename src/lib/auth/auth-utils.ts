'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Safe authentication utilities that handle AuthSessionMissingError
 */
export const authUtils = {
  /**
   * Safely check if user is authenticated without throwing errors
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.user
    } catch (error) {
      console.warn('Error checking authentication status:', error)
      return false
    }
  },

  /**
   * Safely get the current user without throwing AuthSessionMissingError
   */
  async getCurrentUser() {
    try {
      const supabase = createClient()
      
      // First check if session exists
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return null
      }

      // Then safely get user
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        if (error.message.includes('AuthSessionMissingError') || 
            error.message.includes('session_missing')) {
          return null
        }
        throw error
      }

      return user
    } catch (error: any) {
      if (error.message?.includes('AuthSessionMissingError') || 
          error.message?.includes('session_missing')) {
        return null
      }
      console.error('Error getting current user:', error)
      return null
    }
  },

  /**
   * Safely get the current session
   */
  async getCurrentSession() {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('Error getting session:', error)
        return null
      }

      return session
    } catch (error) {
      console.warn('Error getting session:', error)
      return null
    }
  },

  /**
   * Safe sign out that handles all cleanup
   */
  async signOut() {
    try {
      const supabase = createClient()
      
      // Clear local storage first
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_user')
        localStorage.removeItem('buildology-theme')
      }

      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('Sign out error (continuing anyway):', error)
      }

      // Force redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Error during sign out:', error)
      // Force redirect even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  },

  /**
   * Check if the current route requires authentication
   */
  requiresAuth(pathname: string): boolean {
    const publicRoutes = ['/', '/login', '/signup', '/register', '/auth']
    return !publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )
  }
}

export default authUtils