'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

// Types for the reserving system
export interface HODCode {
  id: string
  code: string
  description: string
  category: 'building' | 'contents' | 'consequential' | 'alternative' | 'professional_fees'
  sub_category?: string
  typical_rate_low?: number
  typical_rate_high?: number
  unit_type: 'per_item' | 'per_square_metre' | 'per_hour' | 'percentage' | 'per_metre' | 'per_night' | 'per_week' | 'per_mile'
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProjectReserve {
  id: string
  project_id: string
  reserve_type: 'initial' | 'revised' | 'final'
  total_reserve_amount: number
  building_reserve: number
  contents_reserve: number
  consequential_reserve: number
  alternative_accommodation_reserve: number
  professional_fees_reserve: number
  // Enhanced tracking fields
  estimated_total_reserve_amount: number
  estimated_building_reserve: number
  estimated_contents_reserve: number
  estimated_consequential_reserve: number
  estimated_alternative_accommodation_reserve: number
  estimated_professional_fees_reserve: number
  actual_total_reserve_amount: number
  actual_building_reserve: number
  actual_contents_reserve: number
  actual_consequential_reserve: number
  actual_alternative_accommodation_reserve: number
  actual_professional_fees_reserve: number
  variance_total_reserve_amount: number
  variance_building_reserve: number
  variance_contents_reserve: number
  variance_consequential_reserve: number
  variance_alternative_accommodation_reserve: number
  variance_professional_fees_reserve: number
  currency: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'superseded'
  notes?: string
  created_at: string
  updated_at: string
}

export interface DamageItem {
  id: string
  project_id: string
  reserve_id?: string
  hod_code_id: string
  item_description: string
  location?: string
  quantity: number
  unit_cost: number
  total_cost: number
  vat_rate: number
  vat_amount: number
  total_including_vat: number
  damage_cause?: string
  damage_extent?: 'minor' | 'moderate' | 'major' | 'total_loss'
  repair_method?: 'repair' | 'replace' | 'make_good'
  urgency: 'low' | 'normal' | 'high' | 'emergency'
  photos?: string[]
  measurements?: any
  supplier_quotes?: any
  surveyor_notes?: string
  contractor_notes?: string
  status: 'estimated' | 'quoted' | 'approved' | 'works_ordered' | 'completed'
  created_by?: string
  surveyed_by?: string
  surveyed_at?: string
  created_at: string
  updated_at: string
  hod_code?: HODCode
}

export interface PCSum {
  id: string
  project_id: string
  reserve_id?: string
  pc_sum_description: string
  allocated_amount: number
  spent_amount: number
  remaining_amount: number
  category?: string
  justification: string
  scope_definition?: string
  expected_completion_date?: string
  actual_completion_date?: string
  contractor_id?: string
  status: 'allocated' | 'in_progress' | 'completed' | 'cancelled'
  approval_required: boolean
  approved_by?: string
  approved_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ScopeVariation {
  id: string
  project_id: string
  reserve_id?: string
  variation_type: 'addition' | 'omission' | 'change'
  description: string
  original_scope?: string
  revised_scope?: string
  cost_impact: number
  time_impact_days: number
  justification: string
  client_instructions?: string
  surveyor_recommendation?: string
  status: 'proposed' | 'client_review' | 'approved' | 'rejected' | 'implemented'
  client_approval_required: boolean
  client_approved: boolean
  client_approved_by?: string
  client_approved_at?: string
  surveyor_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SurveyForm {
  id: string
  project_id: string
  form_type: 'initial_survey' | 'detailed_survey' | 'progress_inspection' | 'final_inspection'
  surveyor_id: string
  survey_date: string
  property_type?: string
  year_built?: number
  construction_type?: string
  occupancy_status?: 'occupied' | 'vacant' | 'partially_occupied'
  access_gained: boolean
  access_restrictions?: string
  weather_conditions?: string
  cause_of_loss?: string
  incident_date?: string
  damage_summary: string
  recommendations?: string
  urgent_actions_required?: string
  health_safety_concerns?: string
  salvage_opportunities?: string
  make_safe_required: boolean
  make_safe_completed: boolean
  make_safe_cost?: number
  drying_equipment_required: boolean
  drying_equipment_installed: boolean
  environmental_monitoring?: any
  photos_taken: number
  photo_references?: string[]
  sketch_plan_attached: boolean
  additional_specialists_required?: string[]
  follow_up_required: boolean
  follow_up_date?: string
  form_completed_at?: string
  client_present: boolean
  client_representative_name?: string
  client_signature?: string
  surveyor_signature?: string
  form_status: 'in_progress' | 'completed' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  surveyor?: any
}

export interface ContractorAssessment {
  id: string
  project_id: string
  contractor_id: string
  damage_item_ids?: string[]
  assessment_type: 'quotation' | 'feasibility' | 'progress_report' | 'completion_report'
  trade_speciality?: string
  site_visit_date?: string
  works_description: string
  methodology?: string
  materials_specification?: string
  labour_requirements?: string
  equipment_requirements?: string
  estimated_duration_days?: number
  proposed_start_date?: string
  proposed_completion_date?: string
  health_safety_method_statement?: string
  insurance_requirements_met: boolean
  qualifications_certificates_provided: boolean
  subtotal_labour: number
  subtotal_materials: number
  subtotal_plant_equipment: number
  subtotal_other: number
  total_net_amount: number
  vat_rate: number
  vat_amount: number
  total_gross_amount: number
  payment_terms?: string
  warranty_period_months: number
  exclusions?: string
  assumptions?: string
  variations_policy?: string
  quote_valid_until?: string
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'superseded'
  reviewed_by?: string
  reviewed_at?: string
  acceptance_notes?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  contractor?: any
}

export interface ReserveMovement {
  id: string
  project_id: string
  reserve_id: string
  movement_type: 'initial_setting' | 'increase' | 'decrease' | 'transfer' | 'release'
  category?: string
  amount: number
  reason: string
  reference_document?: string
  reference_id?: string
  authorized_by?: string
  processed_by?: string
  movement_date: string
  accounting_period?: string
  notes?: string
  created_at: string
}

export interface ReserveHistory {
  id: string
  project_id: string
  reserve_id: string
  change_type: 'initial_estimate' | 'revised_estimate' | 'actual_update' | 'variance_review'
  category: 'building' | 'contents' | 'consequential' | 'alternative' | 'professional_fees'
  previous_estimated_amount: number
  new_estimated_amount: number
  previous_actual_amount: number
  new_actual_amount: number
  variance_amount: number
  variance_percentage: number
  change_reason?: string
  supporting_documents?: string[]
  created_by?: string
  change_date: string
  created_at: string
}

// API Functions
const fetchHODCodes = async (): Promise<HODCode[]> => {
  try {
    const { data, error } = await supabase
      .from('hod_codes')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('code', { ascending: true })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching HOD codes:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching HOD codes:', error)
    return []
  }
}

const fetchProjectReserves = async (projectId: string): Promise<ProjectReserve[]> => {
  try {
    const { data, error } = await supabase
      .from('project_reserves')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching project reserves:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching project reserves:', error)
    return []
  }
}

const fetchDamageItems = async (projectId: string): Promise<DamageItem[]> => {
  try {
    const { data, error } = await supabase
      .from('damage_items')
      .select(`
        *,
        hod_code:hod_codes(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching damage items:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching damage items:', error)
    return []
  }
}

const fetchPCSums = async (projectId: string): Promise<PCSum[]> => {
  try {
    const { data, error } = await supabase
      .from('pc_sums')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching PC sums:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching PC sums:', error)
    return []
  }
}

const fetchScopeVariations = async (projectId: string): Promise<ScopeVariation[]> => {
  try {
    const { data, error } = await supabase
      .from('scope_variations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching scope variations:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching scope variations:', error)
    return []
  }
}

const fetchSurveyForms = async (projectId: string): Promise<SurveyForm[]> => {
  try {
    const { data, error } = await supabase
      .from('survey_forms')
      .select(`
        *,
        surveyor:user_profiles(first_name, surname, role)
      `)
      .eq('project_id', projectId)
      .order('survey_date', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching survey forms:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching survey forms:', error)
    return []
  }
}

const fetchContractorAssessments = async (projectId: string): Promise<ContractorAssessment[]> => {
  try {
    const { data, error } = await supabase
      .from('contractor_assessments')
      .select(`
        *,
        contractor:user_profiles(first_name, surname, role)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching contractor assessments:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching contractor assessments:', error)
    return []
  }
}

const fetchReserveMovements = async (projectId: string): Promise<ReserveMovement[]> => {
  try {
    const { data, error } = await supabase
      .from('reserve_movements')
      .select('*')
      .eq('project_id', projectId)
      .order('movement_date', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array silently
      if (error.code === '42P01') {
        return []
      }
      console.warn('Error fetching reserve movements:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching reserve movements:', error)
    return []
  }
}

// Create functions
const createProjectReserve = async (reserve: Partial<ProjectReserve>): Promise<ProjectReserve> => {
  const currentUser = (await supabase.auth.getUser()).data.user
  if (!currentUser) {
    throw new Error('No authenticated user')
  }

  const { data, error } = await supabase
    .from('project_reserves')
    .insert({
      ...reserve,
      created_by: currentUser.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project reserve:', error)
    throw error
  }

  return data
}

const createDamageItem = async (item: Partial<DamageItem>): Promise<DamageItem> => {
  const currentUser = (await supabase.auth.getUser()).data.user
  if (!currentUser) {
    throw new Error('No authenticated user')
  }

  // Calculate totals
  const totalCost = (item.quantity || 1) * (item.unit_cost || 0)
  const vatAmount = totalCost * ((item.vat_rate || 20) / 100)
  const totalIncludingVat = totalCost + vatAmount

  const { data, error } = await supabase
    .from('damage_items')
    .insert({
      ...item,
      total_cost: totalCost,
      vat_amount: vatAmount,
      total_including_vat: totalIncludingVat,
      created_by: currentUser.id
    })
    .select(`
      *,
      hod_code:hod_codes(*)
    `)
    .single()

  if (error) {
    console.error('Error creating damage item:', error)
    throw error
  }

  return data
}

const createPCSum = async (pcSum: Partial<PCSum>): Promise<PCSum> => {
  const currentUser = (await supabase.auth.getUser()).data.user
  if (!currentUser) {
    throw new Error('No authenticated user')
  }

  const { data, error } = await supabase
    .from('pc_sums')
    .insert({
      ...pcSum,
      remaining_amount: pcSum.allocated_amount || 0,
      created_by: currentUser.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating PC sum:', error)
    throw error
  }

  return data
}

const createSurveyForm = async (form: Partial<SurveyForm>): Promise<SurveyForm> => {
  const currentUser = (await supabase.auth.getUser()).data.user
  if (!currentUser) {
    throw new Error('No authenticated user')
  }

  const { data, error } = await supabase
    .from('survey_forms')
    .insert({
      ...form,
      surveyor_id: form.surveyor_id || currentUser.id
    })
    .select(`
      *,
      surveyor:user_profiles(first_name, surname, role)
    `)
    .single()

  if (error) {
    console.error('Error creating survey form:', error)
    throw error
  }

  return data
}

const createContractorAssessment = async (assessment: Partial<ContractorAssessment>): Promise<ContractorAssessment> => {
  const { data, error } = await supabase
    .from('contractor_assessments')
    .insert(assessment)
    .select(`
      *,
      contractor:user_profiles(first_name, surname, role)
    `)
    .single()

  if (error) {
    console.error('Error creating contractor assessment:', error)
    throw error
  }

  return data
}

// Update functions
const updateProjectReserve = async (id: string, updates: Partial<ProjectReserve>): Promise<ProjectReserve> => {
  const { data, error } = await supabase
    .from('project_reserves')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project reserve:', error)
    throw error
  }

  return data
}

const updateDamageItem = async (id: string, updates: Partial<DamageItem>): Promise<DamageItem> => {
  // Recalculate totals if relevant fields are updated
  if (updates.quantity !== undefined || updates.unit_cost !== undefined || updates.vat_rate !== undefined) {
    const totalCost = (updates.quantity || 1) * (updates.unit_cost || 0)
    const vatAmount = totalCost * ((updates.vat_rate || 20) / 100)
    const totalIncludingVat = totalCost + vatAmount

    updates.total_cost = totalCost
    updates.vat_amount = vatAmount
    updates.total_including_vat = totalIncludingVat
  }

  const { data, error } = await supabase
    .from('damage_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      hod_code:hod_codes(*)
    `)
    .single()

  if (error) {
    console.error('Error updating damage item:', error)
    throw error
  }

  return data
}

// React Query Hooks
export const useHODCodes = () => {
  return useQuery({
    queryKey: ['hod-codes'],
    queryFn: fetchHODCodes,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

export const useProjectReserves = (projectId: string) => {
  return useQuery({
    queryKey: ['project-reserves', projectId],
    queryFn: () => fetchProjectReserves(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useDamageItems = (projectId: string) => {
  return useQuery({
    queryKey: ['damage-items', projectId],
    queryFn: () => fetchDamageItems(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const usePCSums = (projectId: string) => {
  return useQuery({
    queryKey: ['pc-sums', projectId],
    queryFn: () => fetchPCSums(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useScopeVariations = (projectId: string) => {
  return useQuery({
    queryKey: ['scope-variations', projectId],
    queryFn: () => fetchScopeVariations(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useSurveyForms = (projectId: string) => {
  return useQuery({
    queryKey: ['survey-forms', projectId],
    queryFn: () => fetchSurveyForms(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useContractorAssessments = (projectId: string) => {
  return useQuery({
    queryKey: ['contractor-assessments', projectId],
    queryFn: () => fetchContractorAssessments(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useReserveMovements = (projectId: string) => {
  return useQuery({
    queryKey: ['reserve-movements', projectId],
    queryFn: () => fetchReserveMovements(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// Mutations Hook
export const useReservingMutations = () => {
  const queryClient = useQueryClient()

  const createReserveMutation = useMutation({
    mutationFn: createProjectReserve,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-reserves'] })
      queryClient.invalidateQueries({ queryKey: ['project-financials'] })
      toast.success('Reserve created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create reserve')
      console.error('Create reserve error:', error)
    },
  })

  const updateReserveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectReserve> }) =>
      updateProjectReserve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-reserves'] })
      queryClient.invalidateQueries({ queryKey: ['project-financials'] })
      toast.success('Reserve updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update reserve')
      console.error('Update reserve error:', error)
    },
  })

  const createDamageItemMutation = useMutation({
    mutationFn: createDamageItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-items'] })
      queryClient.invalidateQueries({ queryKey: ['project-reserves'] })
      toast.success('Damage item created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create damage item')
      console.error('Create damage item error:', error)
    },
  })

  const updateDamageItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DamageItem> }) =>
      updateDamageItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-items'] })
      queryClient.invalidateQueries({ queryKey: ['project-reserves'] })
      toast.success('Damage item updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update damage item')
      console.error('Update damage item error:', error)
    },
  })

  const createPCSumMutation = useMutation({
    mutationFn: createPCSum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pc-sums'] })
      queryClient.invalidateQueries({ queryKey: ['project-reserves'] })
      toast.success('PC Sum created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create PC Sum')
      console.error('Create PC Sum error:', error)
    },
  })

  const createSurveyFormMutation = useMutation({
    mutationFn: createSurveyForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-forms'] })
      toast.success('Survey form created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create survey form')
      console.error('Create survey form error:', error)
    },
  })

  const createContractorAssessmentMutation = useMutation({
    mutationFn: createContractorAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-assessments'] })
      toast.success('Contractor assessment created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create contractor assessment')
      console.error('Create contractor assessment error:', error)
    },
  })

  return {
    createReserve: createReserveMutation,
    updateReserve: updateReserveMutation,
    createDamageItem: createDamageItemMutation,
    updateDamageItem: updateDamageItemMutation,
    createPCSum: createPCSumMutation,
    createSurveyForm: createSurveyFormMutation,
    createContractorAssessment: createContractorAssessmentMutation,
  }
}

// Utility functions
export const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export const calculateReserveTotals = (reserves: ProjectReserve[]): ProjectReserve | null => {
  if (!reserves.length) return null
  
  const currentReserve = reserves.find(r => r.status === 'approved') || reserves[0]
  return currentReserve
}

export const calculateDamageItemsTotals = (items: DamageItem[]) => {
  return items.reduce(
    (totals, item) => ({
      count: totals.count + 1,
      totalCost: totals.totalCost + item.total_cost,
      totalVat: totals.totalVat + item.vat_amount,
      totalIncludingVat: totals.totalIncludingVat + item.total_including_vat,
    }),
    { count: 0, totalCost: 0, totalVat: 0, totalIncludingVat: 0 }
  )
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
    case 'completed':
    case 'accepted':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending_approval':
    case 'submitted':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'draft':
    case 'estimated':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'rejected':
    case 'superseded':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'under_review':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'emergency':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'normal':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}