// API functions for policyholder/customer management
// This replaces mock data with real Supabase queries

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type Policyholder = Database['public']['Tables']['policyholders']['Row']
export type PolicyholderInsert = Database['public']['Tables']['policyholders']['Insert']
export type PolicyholderUpdate = Database['public']['Tables']['policyholders']['Update']
export type PolicyholderContact = Database['public']['Tables']['policyholder_contacts']['Row']

export interface PolicyholderWithDetails extends Policyholder {
  contacts: PolicyholderContact[]
  policies: Array<{
    id: string
    policy_number: string
    policy_type: string
    status: string
    sum_insured: number
    annual_premium: number
    start_date: string
    end_date: string
  }>
  assigned_agent?: {
    id: string
    first_name: string
    surname: string
    email: string
  }
}

export interface PolicyholderFilters {
  type?: 'individual' | 'business' | 'trust' | 'estate'
  status?: string
  agent_id?: string
  search?: string
  risk_category?: string
  limit?: number
  offset?: number
}

export interface PolicyholderStats {
  totalPolicyholders: number
  activePolicyholders: number
  individualCustomers: number
  businessCustomers: number
  newThisMonth: number
  highRiskCustomers: number
  totalPolicies: number
  totalPremiumValue: number
}

// Get all policyholders with optional filtering
export async function getPolicyholders(filters: PolicyholderFilters = {}): Promise<{ policyholders: PolicyholderWithDetails[], total: number }> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('policyholders')
      .select(`
        *,
        policyholder_contacts(*),
        insurance_policies(
          id,
          policy_number,
          policy_type,
          status,
          sum_insured,
          annual_premium,
          start_date,
          end_date
        ),
        assigned_agent:user_profiles(
          id,
          first_name,
          surname,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    
    if (filters.status) {
      query = query.eq('customer_status', filters.status)
    }
    
    if (filters.agent_id) {
      query = query.eq('assigned_agent_id', filters.agent_id)
    }

    if (filters.risk_category) {
      query = query.eq('risk_category', filters.risk_category)
    }
    
    if (filters.search) {
      query = query.or(`
        first_name.ilike.%${filters.search}%,
        last_name.ilike.%${filters.search}%,
        business_name.ilike.%${filters.search}%,
        email.ilike.%${filters.search}%,
        postcode.ilike.%${filters.search}%
      `)
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
      console.error('Error fetching policyholders:', error)
      throw new Error(`Failed to fetch policyholders: ${error.message}`)
    }

    // Process data
    const policyholders: PolicyholderWithDetails[] = (data || []).map(policyholder => ({
      ...policyholder,
      contacts: policyholder.policyholder_contacts || [],
      policies: policyholder.insurance_policies || [],
      assigned_agent: policyholder.assigned_agent || undefined
    }))

    return {
      policyholders,
      total: count || policyholders.length
    }
  } catch (error) {
    console.error('Error in getPolicyholders:', error)
    throw error
  }
}

// Get a single policyholder by ID
export async function getPolicyholderById(id: string): Promise<PolicyholderWithDetails | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholders')
      .select(`
        *,
        policyholder_contacts(*),
        insurance_policies(
          id,
          policy_number,
          policy_type,
          product_name,
          status,
          sum_insured,
          annual_premium,
          start_date,
          end_date,
          coverage_details,
          insurance_company:companies(name)
        ),
        assigned_agent:user_profiles(
          id,
          first_name,
          surname,
          email,
          phone
        ),
        projects(
          id,
          name,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching policyholder:', error)
      throw new Error(`Failed to fetch policyholder: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return {
      ...data,
      contacts: data.policyholder_contacts || [],
      policies: data.insurance_policies || [],
      assigned_agent: data.assigned_agent || undefined
    }
  } catch (error) {
    console.error('Error in getPolicyholderById:', error)
    throw error
  }
}

// Create a new policyholder
export async function createPolicyholder(policyholder: PolicyholderInsert): Promise<Policyholder> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('policyholders')
      .insert({
        ...policyholder,
        created_by: user?.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating policyholder:', error)
      throw new Error(`Failed to create policyholder: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in createPolicyholder:', error)
    throw error
  }
}

// Update a policyholder
export async function updatePolicyholder(id: string, updates: PolicyholderUpdate): Promise<Policyholder> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating policyholder:', error)
      throw new Error(`Failed to update policyholder: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in updatePolicyholder:', error)
    throw error
  }
}

// Delete a policyholder
export async function deletePolicyholder(id: string): Promise<void> {
  const supabase = createClient()
  
  try {
    // Check if policyholder has active policies
    const { data: policies } = await supabase
      .from('insurance_policies')
      .select('id')
      .eq('policyholder_id', id)
      .eq('status', 'active')

    if (policies && policies.length > 0) {
      throw new Error('Cannot delete policyholder with active policies')
    }

    const { error } = await supabase
      .from('policyholders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting policyholder:', error)
      throw new Error(`Failed to delete policyholder: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deletePolicyholder:', error)
    throw error
  }
}

// Get policyholder statistics
export async function getPolicyholderStats(): Promise<PolicyholderStats> {
  const supabase = createClient()
  
  try {
    // Get total policyholders count
    const { count: totalPolicyholders } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })

    // Get active policyholders count
    const { count: activePolicyholders } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_status', 'active')

    // Get individual customers count
    const { count: individualCustomers } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'individual')

    // Get business customers count
    const { count: businessCustomers } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'business')

    // Get new policyholders this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: newThisMonth } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get high risk customers count
    const { count: highRiskCustomers } = await supabase
      .from('policyholders')
      .select('*', { count: 'exact', head: true })
      .eq('risk_category', 'high')

    // Get total policies count
    const { count: totalPolicies } = await supabase
      .from('insurance_policies')
      .select('*', { count: 'exact', head: true })

    // Get total premium value
    const { data: premiumData } = await supabase
      .from('insurance_policies')
      .select('annual_premium')
      .eq('status', 'active')

    const totalPremiumValue = premiumData?.reduce((sum, policy) => sum + (policy.annual_premium || 0), 0) || 0

    return {
      totalPolicyholders: totalPolicyholders || 0,
      activePolicyholders: activePolicyholders || 0,
      individualCustomers: individualCustomers || 0,
      businessCustomers: businessCustomers || 0,
      newThisMonth: newThisMonth || 0,
      highRiskCustomers: highRiskCustomers || 0,
      totalPolicies: totalPolicies || 0,
      totalPremiumValue
    }
  } catch (error) {
    console.error('Error getting policyholder stats:', error)
    return {
      totalPolicyholders: 0,
      activePolicyholders: 0,
      individualCustomers: 0,
      businessCustomers: 0,
      newThisMonth: 0,
      highRiskCustomers: 0,
      totalPolicies: 0,
      totalPremiumValue: 0
    }
  }
}

// Search policyholders (for quick lookup)
export async function searchPolicyholders(query: string, limit = 10): Promise<Pick<Policyholder, 'id' | 'first_name' | 'last_name' | 'business_name' | 'email' | 'type'>[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholders')
      .select('id, first_name, last_name, business_name, email, type')
      .or(`
        first_name.ilike.%${query}%,
        last_name.ilike.%${query}%,
        business_name.ilike.%${query}%,
        email.ilike.%${query}%
      `)
      .limit(limit)

    if (error) {
      console.error('Error searching policyholders:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in searchPolicyholders:', error)
    return []
  }
}

// Policyholder contact management functions
export async function addPolicyholderContact(contact: Database['public']['Tables']['policyholder_contacts']['Insert']): Promise<PolicyholderContact> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholder_contacts')
      .insert(contact)
      .select()
      .single()

    if (error) {
      console.error('Error adding policyholder contact:', error)
      throw new Error(`Failed to add policyholder contact: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in addPolicyholderContact:', error)
    throw error
  }
}

export async function updatePolicyholderContact(id: string, updates: Database['public']['Tables']['policyholder_contacts']['Update']): Promise<PolicyholderContact> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholder_contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating policyholder contact:', error)
      throw new Error(`Failed to update policyholder contact: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in updatePolicyholderContact:', error)
    throw error
  }
}

export async function deletePolicyholderContact(id: string): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('policyholder_contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting policyholder contact:', error)
      throw new Error(`Failed to delete policyholder contact: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deletePolicyholderContact:', error)
    throw error
  }
}

// Get policyholders for a specific agent
export async function getPolicyholdersForAgent(agentId: string): Promise<PolicyholderWithDetails[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('policyholders')
      .select(`
        *,
        insurance_policies(id, policy_number, status, sum_insured)
      `)
      .eq('assigned_agent_id', agentId)
      .eq('customer_status', 'active')
      .order('last_name')

    if (error) {
      console.error('Error fetching agent policyholders:', error)
      throw new Error(`Failed to fetch agent policyholders: ${error.message}`)
    }

    return (data || []).map(policyholder => ({
      ...policyholder,
      contacts: [],
      policies: policyholder.insurance_policies || []
    }))
  } catch (error) {
    console.error('Error in getPolicyholdersForAgent:', error)
    return []
  }
}

// Update policyholder risk assessment
export async function updatePolicyholderRisk(id: string, riskCategory: string, riskFactors: string[]): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('policyholders')
      .update({
        risk_category: riskCategory,
        risk_factors: riskFactors,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating policyholder risk:', error)
      throw new Error(`Failed to update policyholder risk: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updatePolicyholderRisk:', error)
    throw error
  }
}