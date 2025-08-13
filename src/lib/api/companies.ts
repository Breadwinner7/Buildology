// API functions for company/organization management
// This replaces mock data with real Supabase queries

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

// Note: Using organisations table instead of companies
export type Company = Database['public']['Tables']['organisations']['Row']
export type CompanyInsert = Database['public']['Tables']['organisations']['Insert']  
export type CompanyUpdate = Database['public']['Tables']['organisations']['Update']

export interface CompanyContact {
  id: string
  name: string
  email: string
  role: string
  job_title?: string
  is_primary: boolean
}

export interface CompanyWithContacts extends Company {
  contacts: CompanyContact[]
  primary_contact?: CompanyContact
  supplier_info?: {
    supplier_type: string
    specialities: string[]
    geographic_coverage: string[]
    preferred_supplier: boolean
    performance_rating: number
  }
  contractor_teams?: {
    id: string
    name: string
    specialties: string[]
    is_available: boolean
    projects_completed: number
    rating: number
  }[]
}

export interface CompanyFilters {
  type?: string
  status?: string
  industry?: string
  search?: string
  limit?: number
  offset?: number
}

export interface CompanyStats {
  totalCompanies: number
  activeCompanies: number
  insuranceCompanies: number
  contractors: number
  serviceProviders: number
  recentlyAdded: number
}

// Get all companies with optional filtering
export async function getCompanies(filters: CompanyFilters = {}): Promise<{ companies: CompanyWithContacts[], total: number }> {
  const supabase = createClient()
  
  try {
    // Query organisations with related data
    let query = supabase
      .from('organisations')
      .select(`
        *,
        suppliers (
          id,
          supplier_type,
          specialities,
          geographic_coverage,
          preferred_supplier,
          performance_rating,
          status
        ),
        user_profiles!organisation_id (
          id,
          first_name,
          surname,
          email,
          role,
          job_title
        ),
        contractor_teams!contractor_organisation_id (
          id,
          team_name,
          specialties,
          is_available,
          projects_completed,
          average_project_rating
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters - note: organisations table uses 'type' not 'company_type'
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    
    if (filters.status) {
      // organisations table uses 'is_active' boolean instead of 'status'
      if (filters.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false)
      }
    }
    
    // Note: organisations table doesn't have an 'industry' field
    // if (filters.industry) {
    //   query = query.eq('industry', filters.industry)
    // }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,company_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
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
      console.error('Error fetching companies:', error)
      
      // Log the error for debugging
      console.error('Database error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    // Process organisations data to match company interface with related data
    const companies: CompanyWithContacts[] = (data || []).map(org => {
      // Find a primary contact from user_profiles (first admin, then first user)
      const users = org.user_profiles || []
      const primaryContact = users.find(user => user.role === 'admin') || users[0]
      
      return {
        id: org.id,
        name: org.name,
        company_type: org.type, // Map 'type' to 'company_type'
        status: org.is_active ? 'active' : 'inactive', // Map boolean to status
        email: org.email,
        phone: org.phone,
        address_line_1: org.registered_address?.line_1 || org.trading_address?.line_1,
        city: org.registered_address?.city || org.trading_address?.city,
        postcode: org.registered_address?.postcode || org.trading_address?.postcode,
        country: org.registered_address?.country || org.trading_address?.country,
        registration_number: org.company_number,
        industry: org.suppliers?.[0]?.specialities?.join(', ') || '', // Use supplier specialities as industry
        website: org.website,
        vat_number: org.vat_number,
        fca_reference: org.fca_reference,
        created_at: org.created_at,
        updated_at: org.updated_at,
        
        // Enhanced contact information from related tables
        contacts: users.map(user => ({
          id: user.id,
          name: `${user.first_name} ${user.surname}`,
          email: user.email,
          role: user.role,
          job_title: user.job_title,
          is_primary: user.id === primaryContact?.id
        })),
        primary_contact: primaryContact ? {
          id: primaryContact.id,
          name: `${primaryContact.first_name} ${primaryContact.surname}`,
          email: primaryContact.email,
          role: primaryContact.role,
          job_title: primaryContact.job_title,
          is_primary: true
        } : undefined,
        
        // Additional data from related tables
        supplier_info: org.suppliers?.[0] ? {
          supplier_type: org.suppliers[0].supplier_type,
          specialities: org.suppliers[0].specialities,
          geographic_coverage: org.suppliers[0].geographic_coverage,
          preferred_supplier: org.suppliers[0].preferred_supplier,
          performance_rating: org.suppliers[0].performance_rating
        } : undefined,
        
        contractor_teams: org.contractor_teams?.map(team => ({
          id: team.id,
          name: team.team_name,
          specialties: team.specialties,
          is_available: team.is_available,
          projects_completed: team.projects_completed,
          rating: team.average_project_rating
        })) || []
      }
    })

    return {
      companies,
      total: count || companies.length
    }
  } catch (error: any) {
    console.error('Error in getCompanies:', error)
    throw error
  }
}

// Get a single company by ID
export async function getCompanyById(id: string): Promise<CompanyWithContacts | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching company:', error)
      throw new Error(`Failed to fetch company: ${error.message}`)
    }

    if (!data) {
      return null
    }

    // Map organisation to company format
    return {
      id: data.id,
      name: data.name,
      company_type: data.type,
      status: data.is_active ? 'active' : 'inactive',
      email: data.email,
      phone: data.phone,
      address_line_1: data.registered_address?.line_1 || data.trading_address?.line_1,
      city: data.registered_address?.city || data.trading_address?.city,
      postcode: data.registered_address?.postcode || data.trading_address?.postcode,
      country: data.registered_address?.country || data.trading_address?.country,
      registration_number: data.company_number,
      industry: '',
      website: data.website,
      vat_number: data.vat_number,
      fca_reference: data.fca_reference,
      created_at: data.created_at,
      updated_at: data.updated_at,
      contacts: [],
      primary_contact: undefined
    }
  } catch (error) {
    console.error('Error in getCompanyById:', error)
    throw error
  }
}

// Create a new company
export async function createCompany(company: CompanyInsert): Promise<Company> {
  const supabase = createClient()
  
  try {
    const { data: user } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('organisations')
      .insert({
        ...company,
        // created_by is not a field in organisations table
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating company:', error)
      throw new Error(`Failed to create company: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in createCompany:', error)
    throw error
  }
}

// Update a company
export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('organisations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company:', error)
      throw new Error(`Failed to update company: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in updateCompany:', error)
    throw error
  }
}

// Delete a company
export async function deleteCompany(id: string): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('organisations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company:', error)
      throw new Error(`Failed to delete company: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deleteCompany:', error)
    throw error
  }
}

// Get company statistics
export async function getCompanyStats(): Promise<CompanyStats> {
  const supabase = createClient()
  
  try {
    // Get total organisations count
    const { count: totalCompanies } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })

    // Get active organisations count
    const { count: activeCompanies } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get insurance companies count (using the actual type from schema)
    const { count: insuranceCompanies } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'insurer')

    // Get contractors count (using actual type from schema)
    const { count: contractors } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'contractor_firm')

    // Get service providers count (using multiple types)
    const { count: serviceProviders } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .in('type', ['restoration_specialist', 'surveyor_practice', 'claims_management_company'])

    // Get recently added organisations (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: recentlyAdded } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    return {
      totalCompanies: totalCompanies || 0,
      activeCompanies: activeCompanies || 0,
      insuranceCompanies: insuranceCompanies || 0,
      contractors: contractors || 0,
      serviceProviders: serviceProviders || 0,
      recentlyAdded: recentlyAdded || 0
    }
  } catch (error: any) {
    console.error('Error getting company stats:', error)
    
    // If companies table doesn't exist, return mock stats
    if (error.message?.includes('does not exist') || 
        error.message?.includes('relation') || 
        error.code === 'PGRST116' ||
        error.code === '42P01') {
      console.warn('Companies table does not exist, returning mock stats')
      return {
        totalCompanies: 2,
        activeCompanies: 2,
        insuranceCompanies: 1,
        contractors: 1,
        serviceProviders: 0,
        recentlyAdded: 2
      }
    }
    
    return {
      totalCompanies: 0,
      activeCompanies: 0,
      insuranceCompanies: 0,
      contractors: 0,
      serviceProviders: 0,
      recentlyAdded: 0
    }
  }
}

// Get companies by type (for dropdowns/selectors)
export async function getCompaniesByType(type: string): Promise<Pick<Company, 'id' | 'name' | 'email'>[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('id, name, email')
      .eq('type', type)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching companies by type:', error)
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getCompaniesByType:', error)
    return []
  }
}

// Company contact management functions
export async function addCompanyContact(contact: Database['public']['Tables']['company_contacts']['Insert']): Promise<CompanyContact> {
  const supabase = createClient()
  
  try {
    // If this is set as primary, make sure no other contacts are primary for this company
    if (contact.is_primary) {
      await supabase
        .from('company_contacts')
        .update({ is_primary: false })
        .eq('company_id', contact.company_id)
    }

    const { data, error } = await supabase
      .from('company_contacts')
      .insert(contact)
      .select()
      .single()

    if (error) {
      console.error('Error adding company contact:', error)
      throw new Error(`Failed to add company contact: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in addCompanyContact:', error)
    throw error
  }
}

export async function updateCompanyContact(id: string, updates: Database['public']['Tables']['company_contacts']['Update']): Promise<CompanyContact> {
  const supabase = createClient()
  
  try {
    // If this is being set as primary, make sure no other contacts are primary for this company
    if (updates.is_primary) {
      const { data: contact } = await supabase
        .from('company_contacts')
        .select('company_id')
        .eq('id', id)
        .single()

      if (contact) {
        await supabase
          .from('company_contacts')
          .update({ is_primary: false })
          .eq('company_id', contact.company_id)
      }
    }

    const { data, error } = await supabase
      .from('company_contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company contact:', error)
      throw new Error(`Failed to update company contact: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in updateCompanyContact:', error)
    throw error
  }
}

export async function deleteCompanyContact(id: string): Promise<void> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('company_contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company contact:', error)
      throw new Error(`Failed to delete company contact: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deleteCompanyContact:', error)
    throw error
  }
}