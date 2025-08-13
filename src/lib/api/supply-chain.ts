// Supply Chain API - Uses existing database structure (organisations + user_profiles)
// This replaces the separate companies/policyholders APIs with integrated supply chain management

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

// Type definitions based on existing schema
export type Organisation = Database['public']['Tables']['organisations']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserOrganisation = Database['public']['Tables']['user_organisations']['Row']

export interface OrganisationWithUsers extends Organisation {
  users: Array<UserProfile & { user_organisation_role: string }>
  user_count: number
}

export interface ContractorProfile extends UserProfile {
  organisation: Organisation
  performance_rating?: number
  projects_completed?: number
  current_availability?: boolean
}

export interface SurveyorProfile extends UserProfile {
  organisation?: Organisation
  active_projects?: number
  specializations?: string[]
}

export interface CustomerProfile extends UserProfile {
  policies: Array<{
    id: string
    policy_number: string
    policy_type: string
    status: string
  }>
  claims: Array<{
    id: string
    claim_number: string
    status: string
    estimated_loss: number
  }>
}

export interface SupplyChainFilters {
  organisation_type?: string
  user_role?: string
  geographic_area?: string
  specialty?: string
  availability?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface SupplyChainStats {
  totalOrganisations: number
  totalUsers: number
  contractors: {
    organisations: number
    individuals: number
    available: number
    avgRating: number
  }
  surveyors: {
    organisations: number
    individuals: number
    available: number
    avgUtilization: number
  }
  customers: {
    total: number
    active: number
    newThisMonth: number
    highRisk: number
  }
}

// =====================================================
// ORGANISATION MANAGEMENT (using existing table)
// =====================================================

export async function getOrganisations(filters: SupplyChainFilters = {}): Promise<{ organisations: OrganisationWithUsers[], total: number }> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('organisations')
      .select(`
        *,
        user_organisations(
          role,
          user_id
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.organisation_type) {
      query = query.eq('type', filters.organisation_type)
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,company_number.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 25)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching organisations:', error)
      throw new Error(`Failed to fetch organisations: ${error.message}`)
    }

    // Process data to match our interface
    const organisations: OrganisationWithUsers[] = (data || []).map(org => ({
      ...org,
      users: [], // Users would need to be fetched separately
      user_count: org.user_organisations?.length || 0
    }))

    return {
      organisations,
      total: count || organisations.length
    }
  } catch (error) {
    console.error('Error in getOrganisations:', error)
    throw error
  }
}

// =====================================================
// CONTRACTOR MANAGEMENT
// =====================================================

export async function getContractors(filters: SupplyChainFilters = {}): Promise<{ contractors: ContractorProfile[], total: number }> {
  const supabase = createClient()
  
  try {
    // Simplified query to avoid relationship issues
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'contractor')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.specialty) {
      query = query.contains('trade_specialties', [filters.specialty])
    }
    
    if (filters.geographic_area) {
      query = query.contains('regions_covered', [filters.geographic_area])
    }
    
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,surname.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 25)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching contractors:', error)
      throw new Error(`Failed to fetch contractors: ${error.message}`)
    }

    // Process contractor data - simplified without nested relationships
    const contractors: ContractorProfile[] = (data || []).map(contractor => ({
      ...contractor,
      organisation: null, // Would need separate query
      performance_rating: contractor.performance_rating || 0,
      projects_completed: 0, // Would need separate query
      current_availability: true // Would need separate query
    }))

    return {
      contractors,
      total: count || contractors.length
    }
  } catch (error) {
    console.error('Error in getContractors:', error)
    throw error
  }
}

// =====================================================
// SURVEYOR MANAGEMENT
// =====================================================

export async function getSurveyors(filters: SupplyChainFilters = {}): Promise<{ surveyors: SurveyorProfile[], total: number }> {
  const supabase = createClient()
  
  try {
    // Simplified query to avoid relationship issues
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'surveyor')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.specialty) {
      query = query.contains('surveyor_specialisms', [filters.specialty])
    }
    
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,surname.ilike.%${filters.search}%,rics_membership_number.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching surveyors:', error)
      throw new Error(`Failed to fetch surveyors: ${error.message}`)
    }

    const surveyors: SurveyorProfile[] = (data || []).map(surveyor => ({
      ...surveyor,
      organisation: null, // Would need separate query
      active_projects: 0, // Would need separate query
      specializations: surveyor.surveyor_specialisms || []
    }))

    return {
      surveyors,
      total: count || surveyors.length
    }
  } catch (error) {
    console.error('Error in getSurveyors:', error)
    throw error
  }
}

// =====================================================
// CUSTOMER/POLICYHOLDER MANAGEMENT
// =====================================================

export async function getCustomers(filters: SupplyChainFilters = {}): Promise<{ customers: CustomerProfile[], total: number }> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        insurance_policies(
          id,
          policy_number,
          policy_type,
          status
        )
      `)
      .eq('role', 'policyholder')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,surname.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching customers:', error)
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }

    const customers: CustomerProfile[] = (data || []).map(customer => ({
      ...customer,
      policies: customer.insurance_policies || [],
      claims: [] // Claims would need to be fetched separately through policies
    }))

    return {
      customers,
      total: count || customers.length
    }
  } catch (error) {
    console.error('Error in getCustomers:', error)
    throw error
  }
}

// =====================================================
// SUPPLY CHAIN STATISTICS
// =====================================================

export async function getSupplyChainStats(): Promise<SupplyChainStats> {
  const supabase = createClient()
  
  try {
    // Get organisation counts
    const { count: totalOrganisations } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: contractorOrganisations } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'contractor_firm')
      .eq('is_active', true)

    const { count: surveyorOrganisations } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'surveyor_practice')
      .eq('is_active', true)

    // Get user counts
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: contractorUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'contractor')
      .eq('is_active', true)

    const { count: surveyorUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'surveyor')
      .eq('is_active', true)

    const { count: customerUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'policyholder')
      .eq('is_active', true)

    // Get customers with high risk
    const { count: highRiskCustomers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'policyholder')
      .eq('risk_category', 'high')

    // Get new customers this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: newCustomersThisMonth } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'policyholder')
      .gte('created_at', startOfMonth.toISOString())

    return {
      totalOrganisations: totalOrganisations || 0,
      totalUsers: totalUsers || 0,
      contractors: {
        organisations: contractorOrganisations || 0,
        individuals: contractorUsers || 0,
        available: Math.floor((contractorUsers || 0) * 0.8), // Estimate 80% available
        avgRating: 4.2 // This would come from contractor_performance table
      },
      surveyors: {
        organisations: surveyorOrganisations || 0,
        individuals: surveyorUsers || 0,
        available: Math.floor((surveyorUsers || 0) * 0.7), // Estimate 70% available
        avgUtilization: 75 // Percentage of time utilized
      },
      customers: {
        total: customerUsers || 0,
        active: Math.floor((customerUsers || 0) * 0.9), // Estimate 90% active
        newThisMonth: newCustomersThisMonth || 0,
        highRisk: highRiskCustomers || 0
      }
    }
  } catch (error) {
    console.error('Error getting supply chain stats:', error)
    return {
      totalOrganisations: 0,
      totalUsers: 0,
      contractors: { organisations: 0, individuals: 0, available: 0, avgRating: 0 },
      surveyors: { organisations: 0, individuals: 0, available: 0, avgUtilization: 0 },
      customers: { total: 0, active: 0, newThisMonth: 0, highRisk: 0 }
    }
  }
}

// =====================================================
// USER ASSIGNMENT AND ROLE MANAGEMENT
// =====================================================

export async function assignUserToOrganisation(userId: string, organisationId: string, role: 'admin' | 'member' | 'viewer'): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('user_organisations')
      .insert({
        user_id: userId,
        organisation_id: organisationId,
        role: role
      })

    if (error) {
      console.error('Error assigning user to organisation:', error)
      throw new Error(`Failed to assign user: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in assignUserToOrganisation:', error)
    throw error
  }
}

export async function updateUserRole(userId: string, newRole: string): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user role:', error)
      throw new Error(`Failed to update user role: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateUserRole:', error)
    throw error
  }
}

// =====================================================
// CONTRACTOR SPECIFIC FUNCTIONS
// =====================================================

export async function updateContractorAvailability(userId: string, available: boolean, notes?: string): Promise<void> {
  const supabase = createClient()
  
  try {
    // This would insert into user_availability table
    const { error } = await supabase
      .from('user_availability')
      .upsert({
        user_id: userId,
        date_from: new Date().toISOString().split('T')[0],
        date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        availability_type: available ? 'available' : 'unavailable',
        notes: notes
      })

    if (error) {
      console.error('Error updating contractor availability:', error)
      throw new Error(`Failed to update availability: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateContractorAvailability:', error)
    throw error
  }
}

export async function recordContractorPerformance(
  contractorUserId: string,
  projectId: string,
  performance: {
    workQuality: number
    timeliness: number
    communication: number
    professionalism: number
    feedback?: string
    wouldUseAgain: boolean
  }
): Promise<void> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('contractor_performance')
      .insert({
        contractor_user_id: contractorUserId,
        project_id: projectId,
        work_quality_rating: performance.workQuality,
        timeliness_rating: performance.timeliness,
        communication_rating: performance.communication,
        professionalism_rating: performance.professionalism,
        positive_feedback: performance.feedback,
        would_use_again: performance.wouldUseAgain,
        evaluated_by: user?.user?.id
      })

    if (error) {
      console.error('Error recording contractor performance:', error)
      throw new Error(`Failed to record performance: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in recordContractorPerformance:', error)
    throw error
  }
}