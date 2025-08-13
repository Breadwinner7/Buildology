// API functions for security management - replacing mock data with real database queries
// This integrates with the security tables created in the migration

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type SecurityIncident = Database['public']['Tables']['security_incidents']['Row']
export type SecurityIncidentInsert = Database['public']['Tables']['security_incidents']['Insert']
export type VulnerabilityScan = Database['public']['Tables']['vulnerability_scans']['Row']
export type VulnerabilityScanInsert = Database['public']['Tables']['vulnerability_scans']['Insert']
export type Vulnerability = Database['public']['Tables']['vulnerabilities']['Row']
export type UserSession = Database['public']['Tables']['user_sessions']['Row']
export type UserActivityLog = Database['public']['Tables']['user_activity_log']['Row']

// Security Incidents API
export interface SecurityIncidentFilters {
  type?: string
  severity?: string
  status?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface SecurityStats {
  totalIncidents: number
  openIncidents: number
  criticalIncidents: number
  resolvedThisMonth: number
  averageResolutionTime: number
  totalVulnerabilities: number
  criticalVulnerabilities: number
  lastScanDate: string | null
  activeSessions: number
  suspiciousSessions: number
}

// Get security incidents with filtering
export async function getSecurityIncidents(filters: SecurityIncidentFilters = {}): Promise<{ incidents: SecurityIncident[], total: number }> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('security_incidents')
      .select(`
        *,
        assigned_to:user_profiles!assigned_to_user_id(
          id,
          first_name,
          surname,
          email
        ),
        detector:user_profiles!detector_user_id(
          id,
          first_name,
          surname
        )
      `)
      .order('detected_at', { ascending: false })

    // Apply filters
    if (filters.type) {
      query = query.eq('incident_type', filters.type)
    }
    
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.assigned_to) {
      query = query.eq('assigned_to_user_id', filters.assigned_to)
    }

    if (filters.date_from) {
      query = query.gte('detected_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('detected_at', filters.date_to)
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 25)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching security incidents:', error)
      throw new Error(`Failed to fetch security incidents: ${error.message}`)
    }

    return {
      incidents: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Error in getSecurityIncidents:', error)
    throw error
  }
}

// Create a new security incident
export async function createSecurityIncident(incident: SecurityIncidentInsert): Promise<SecurityIncident> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('security_incidents')
      .insert({
        ...incident,
        created_by: user?.user?.id,
        detector_user_id: user?.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating security incident:', error)
      throw new Error(`Failed to create security incident: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in createSecurityIncident:', error)
    throw error
  }
}

// Update a security incident
export async function updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<SecurityIncident> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('security_incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating security incident:', error)
      throw new Error(`Failed to update security incident: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in updateSecurityIncident:', error)
    throw error
  }
}

// Vulnerability Scans API
export interface VulnerabilityScanFilters {
  status?: string
  scan_type?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

// Get vulnerability scans
export async function getVulnerabilityScans(filters: VulnerabilityScanFilters = {}): Promise<{ scans: VulnerabilityScan[], total: number }> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('vulnerability_scans')
      .select(`
        *,
        initiated_by:user_profiles!initiated_by_user_id(
          id,
          first_name,
          surname
        )
      `)
      .order('started_at', { ascending: false })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.scan_type) {
      query = query.eq('scan_type', filters.scan_type)
    }

    if (filters.date_from) {
      query = query.gte('started_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('started_at', filters.date_to)
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 25)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching vulnerability scans:', error)
      throw new Error(`Failed to fetch vulnerability scans: ${error.message}`)
    }

    return {
      scans: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Error in getVulnerabilityScans:', error)
    throw error
  }
}

// Create a new vulnerability scan
export async function createVulnerabilityScan(scan: VulnerabilityScanInsert): Promise<VulnerabilityScan> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('vulnerability_scans')
      .insert({
        ...scan,
        initiated_by_user_id: user?.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating vulnerability scan:', error)
      throw new Error(`Failed to create vulnerability scan: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in createVulnerabilityScan:', error)
    throw error
  }
}

// Get vulnerabilities for a specific scan
export async function getVulnerabilities(scanId: string): Promise<Vulnerability[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select(`
        *,
        assigned_to:user_profiles!assigned_to_user_id(
          id,
          first_name,
          surname,
          email
        )
      `)
      .eq('scan_id', scanId)
      .order('severity', { ascending: false })

    if (error) {
      console.error('Error fetching vulnerabilities:', error)
      throw new Error(`Failed to fetch vulnerabilities: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getVulnerabilities:', error)
    return []
  }
}

// Get security statistics
export async function getSecurityStats(): Promise<SecurityStats> {
  const supabase = createClient()
  
  try {
    // Get incident counts
    const { count: totalIncidents } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })

    const { count: openIncidents } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating'])

    const { count: criticalIncidents } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .in('status', ['open', 'investigating'])

    // Get resolved incidents this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: resolvedThisMonth } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('resolved_at', startOfMonth.toISOString())

    // Get vulnerability counts
    const { count: totalVulnerabilities } = await supabase
      .from('vulnerabilities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    const { count: criticalVulnerabilities } = await supabase
      .from('vulnerabilities')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .eq('status', 'open')

    // Get last scan date
    const { data: lastScan } = await supabase
      .from('vulnerability_scans')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Get session counts
    const { count: activeSessions } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: suspiciousSessions } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspicious', true)
      .eq('status', 'active')

    // Calculate average resolution time (simplified - would need more complex query in practice)
    const averageResolutionTime = 4.5 // hours - placeholder for now

    return {
      totalIncidents: totalIncidents || 0,
      openIncidents: openIncidents || 0,
      criticalIncidents: criticalIncidents || 0,
      resolvedThisMonth: resolvedThisMonth || 0,
      averageResolutionTime,
      totalVulnerabilities: totalVulnerabilities || 0,
      criticalVulnerabilities: criticalVulnerabilities || 0,
      lastScanDate: lastScan?.completed_at || null,
      activeSessions: activeSessions || 0,
      suspiciousSessions: suspiciousSessions || 0
    }
  } catch (error) {
    console.error('Error getting security stats:', error)
    return {
      totalIncidents: 0,
      openIncidents: 0,
      criticalIncidents: 0,
      resolvedThisMonth: 0,
      averageResolutionTime: 0,
      totalVulnerabilities: 0,
      criticalVulnerabilities: 0,
      lastScanDate: null,
      activeSessions: 0,
      suspiciousSessions: 0
    }
  }
}

// User Sessions API
export async function getUserSessions(userId?: string): Promise<UserSession[]> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('user_sessions')
      .select('*')
      .order('login_time', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Get current user sessions
      const { data: user } = await supabase.auth.getUser()
      if (user?.user?.id) {
        query = query.eq('user_id', user.user.id)
      }
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Error fetching user sessions:', error)
      throw new Error(`Failed to fetch user sessions: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserSessions:', error)
    return []
  }
}

// Create user session
export async function createUserSession(sessionData: Omit<Database['public']['Tables']['user_sessions']['Insert'], 'user_id'>): Promise<UserSession> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        ...sessionData,
        user_id: user.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user session:', error)
      throw new Error(`Failed to create user session: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in createUserSession:', error)
    throw error
  }
}

// Log user activity
export async function logUserActivity(activity: Omit<Database['public']['Tables']['user_activity_log']['Insert'], 'user_id'>): Promise<UserActivityLog> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_activity_log')
      .insert({
        ...activity,
        user_id: user.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging user activity:', error)
      throw new Error(`Failed to log user activity: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in logUserActivity:', error)
    throw error
  }
}

// Get user activity for audit trail
export async function getUserActivity(userId?: string, limit = 100): Promise<UserActivityLog[]> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('user_activity_log')
      .select(`
        *,
        user:user_profiles(
          id,
          first_name,
          surname,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user activity:', error)
      throw new Error(`Failed to fetch user activity: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserActivity:', error)
    return []
  }
}

// Helper function to get security events for a specific user (for dashboard hooks)
export async function getSecurityEvents(userId: string, limit = 10): Promise<Array<{
  id: string
  type: string
  title: string
  description: string
  severity: string
  timestamp: string
}>> {
  const supabase = createClient()
  
  try {
    // Get security incidents and user activity that might be security-relevant
    const [incidents, activities] = await Promise.all([
      supabase
        .from('security_incidents')
        .select('id, incident_type, title, description, severity, detected_at')
        .or(`assigned_to_user_id.eq.${userId},detector_user_id.eq.${userId}`)
        .order('detected_at', { ascending: false })
        .limit(limit),
      
      supabase
        .from('user_activity_log')
        .select('id, action, activity_details, created_at')
        .eq('user_id', userId)
        .eq('security_event', true)
        .order('created_at', { ascending: false })
        .limit(limit)
    ])

    const events = [
      ...(incidents.data || []).map(incident => ({
        id: incident.id,
        type: 'security_incident',
        title: incident.title,
        description: incident.description || '',
        severity: incident.severity,
        timestamp: incident.detected_at
      })),
      ...(activities.data || []).map(activity => ({
        id: activity.id,
        type: 'security_activity',
        title: activity.action,
        description: JSON.stringify(activity.activity_details || {}),
        severity: 'info',
        timestamp: activity.created_at
      }))
    ]

    // Sort by timestamp and limit
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

  } catch (error) {
    console.error('Error getting security events:', error)
    return []
  }
}

// Helper function to get login history for a user
export async function getLoginHistory(userId: string, limit = 10): Promise<Array<{
  id: string
  loginTime: string
  ipAddress: string
  userAgent: string
  location: string
  status: string
}>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, login_time, ip_address, user_agent, location_city, location_country, status')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching login history:', error)
      return []
    }

    return (data || []).map(session => ({
      id: session.id,
      loginTime: session.login_time,
      ipAddress: session.ip_address?.toString() || 'Unknown',
      userAgent: session.user_agent || 'Unknown',
      location: `${session.location_city || 'Unknown'}, ${session.location_country || 'Unknown'}`,
      status: session.status
    }))

  } catch (error) {
    console.error('Error in getLoginHistory:', error)
    return []
  }
}