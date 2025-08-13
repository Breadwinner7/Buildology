'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

class SupabaseClientSingleton {
  private static instance: ReturnType<typeof createBrowserClient<Database>>
  
  public static getInstance() {
    if (!this.instance) {
      this.instance = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      )
    }
    
    return this.instance
  }
}

// Enhanced Supabase client with error handling
export function createClient() {
  return SupabaseClientSingleton.getInstance()
}

// Auth helper functions with proper error handling
export const authHelpers = {
  async signIn(email: string, password: string) {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  },

  async signUp(email: string, password: string, userData?: any) {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  },

  async signOut() {
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },

  async getCurrentUser() {
    const supabase = createClient()
    
    try {
      // Check for session first to avoid AuthSessionMissingError
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return null
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // Handle session missing errors gracefully
        if (error.message.includes('AuthSessionMissingError') || error.message.includes('session_missing')) {
          console.warn('Session missing when getting user')
          return null
        }
        throw new Error(error.message)
      }
      
      return user
    } catch (error: any) {
      console.error('Get current user error:', error)
      
      // Don't throw on auth session errors, just return null
      if (error.message?.includes('AuthSessionMissingError') || error.message?.includes('session_missing')) {
        return null
      }
      
      return null
    }
  },

  async refreshSession() {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return data.session
    } catch (error) {
      console.error('Refresh session error:', error)
      return null
    }
  }
}

// For backward compatibility
export const supabase = createClient()
export default createClient