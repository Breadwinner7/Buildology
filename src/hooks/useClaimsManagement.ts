'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
// import { useNotificationActions } from './useNotifications'
import type { Database } from '@/types/database'

// Database types
export type Claim = Database['public']['Tables']['claims']['Row']
export type ClaimInsert = Database['public']['Tables']['claims']['Insert']
export type ClaimUpdate = Database['public']['Tables']['claims']['Update']
export type InsurancePolicy = Database['public']['Tables']['insurance_policies']['Row']

// Enhanced interfaces
export interface EnhancedClaim extends Claim {
  policy?: Pick<InsurancePolicy, 'id' | 'policy_number' | 'policy_type' | 'policyholder_id'>
  handler?: {
    id: string
    first_name?: string
    surname?: string
    email?: string
    role?: string
  }
  adjuster?: {
    id: string
    first_name?: string
    surname?: string
    email?: string
    role?: string
  }
  policyholder?: {
    id: string
    first_name?: string
    surname?: string
    email?: string
    phone?: string
  }
}

export interface ClaimFilters {
  search: string
  status: string[]
  priority: string[]
  claim_type: string[]
  handler_id: string[]
  date_range: {
    from?: Date
    to?: Date
  }
  amount_range: {
    from?: number
    to?: number
  }
}

export interface CreateClaimData {
  claim_number: string
  policy_id: string
  incident_date: string
  claim_type: string
  cause_of_loss?: string
  incident_description: string
  estimated_loss?: number
  priority?: string
  complexity?: string
  handler_id?: string
  adjuster_id?: string
}

export interface UpdateClaimData {
  incident_description?: string
  estimated_loss?: number
  final_settlement?: number
  excess_applied?: number
  status?: string
  priority?: string
  complexity?: string
  reserved_amount?: number
  handler_id?: string
  adjuster_id?: string
}

// API Functions
const fetchClaims = async (filters?: Partial<ClaimFilters>): Promise<EnhancedClaim[]> => {
  let query = supabase
    .from('claims')
    .select(`
      *,
      policy:insurance_policies!policy_id (
        id,
        policy_number,
        policy_type,
        policyholder_id
      ),
      handler:user_profiles!handler_id (
        id,
        first_name,
        surname,
        email,
        role
      ),
      adjuster:user_profiles!adjuster_id (
        id,
        first_name,
        surname,
        email,
        role
      ),
      policyholder:user_profiles!insurance_policies(policyholder_id) (
        id,
        first_name,
        surname,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters?.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority)
  }

  if (filters?.claim_type && filters.claim_type.length > 0) {
    query = query.in('claim_type', filters.claim_type)
  }

  if (filters?.handler_id && filters.handler_id.length > 0) {
    query = query.in('handler_id', filters.handler_id)
  }

  if (filters?.date_range?.from) {
    query = query.gte('incident_date', filters.date_range.from.toISOString().split('T')[0])
  }

  if (filters?.date_range?.to) {
    query = query.lte('incident_date', filters.date_range.to.toISOString().split('T')[0])
  }

  if (filters?.amount_range?.from) {
    query = query.gte('estimated_loss', filters.amount_range.from)
  }

  if (filters?.amount_range?.to) {
    query = query.lte('estimated_loss', filters.amount_range.to)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

const fetchClaimById = async (claimId: string): Promise<EnhancedClaim | null> => {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      policy:insurance_policies!policy_id (
        id,
        policy_number,
        policy_type,
        policyholder_id,
        coverage_details,
        policy_limits,
        excess_amounts
      ),
      handler:user_profiles!handler_id (
        id,
        first_name,
        surname,
        email,
        role,
        phone
      ),
      adjuster:user_profiles!adjuster_id (
        id,
        first_name,
        surname,
        email,
        role,
        phone
      ),
      policyholder:user_profiles!insurance_policies(policyholder_id) (
        id,
        first_name,
        surname,
        email,
        phone
      )
    `)
    .eq('id', claimId)
    .single()

  if (error) throw error
  return data
}

const createClaim = async (claimData: CreateClaimData): Promise<EnhancedClaim> => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .insert([{
        ...claimData,
        status: 'reported',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        policy:insurance_policies!policy_id (
          id,
          policy_number,
          policy_type,
          policyholder_id
        ),
        handler:user_profiles!handler_id (
          id,
          first_name,
          surname,
          email,
          role
        ),
        adjuster:user_profiles!adjuster_id (
          id,
          first_name,
          surname,
          email,
          role
        )
      `)
      .single()

    if (error) {
      console.warn('Database error creating claim:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating claim:', error)
    throw error
  }
}

const updateClaim = async (claimId: string, updates: UpdateClaimData): Promise<EnhancedClaim> => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .select(`
        *,
        policy:insurance_policies!policy_id (
          id,
          policy_number,
          policy_type,
          policyholder_id
        ),
        handler:user_profiles!handler_id (
          id,
          first_name,
          surname,
          email,
          role
        ),
        adjuster:user_profiles!adjuster_id (
          id,
          first_name,
          surname,
          email,
          role
        )
      `)
      .single()

    if (error) {
      console.warn('Database error updating claim:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error updating claim:', error)
    throw error
  }
}

const deleteClaim = async (claimId: string): Promise<void> => {
  const { error } = await supabase
    .from('claims')
    .delete()
    .eq('id', claimId)

  if (error) throw error
}

// Fetch related data
const fetchInsurancePolicies = async (): Promise<Pick<InsurancePolicy, 'id' | 'policy_number' | 'policy_type' | 'status'>[]> => {
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('id, policy_number, policy_type, status')
    .eq('status', 'active')
    .order('policy_number')

  if (error) throw error
  return data || []
}

const fetchClaimHandlers = async (): Promise<Pick<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'first_name' | 'surname' | 'role' | 'email'>[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, surname, role, email')
    .in('role', ['admin', 'claims_handler', 'adjuster'])
    .eq('is_active', true)
    .order('first_name')

  if (error) throw error
  return data || []
}

// Custom hooks
export function useClaims(filters?: Partial<ClaimFilters>) {
  return useQuery({
    queryKey: ['claims', filters],
    queryFn: () => fetchClaims(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })
}

export function useClaim(claimId?: string) {
  return useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => claimId ? fetchClaimById(claimId) : null,
    enabled: !!claimId,
    staleTime: 1 * 60 * 1000
  })
}

export function useInsurancePolicies() {
  return useQuery({
    queryKey: ['insurance-policies'],
    queryFn: fetchInsurancePolicies,
    staleTime: 10 * 60 * 1000
  })
}

export function useClaimHandlers() {
  return useQuery({
    queryKey: ['claim-handlers'],
    queryFn: fetchClaimHandlers,
    staleTime: 10 * 60 * 1000
  })
}

export function useClaimMutations() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  // const { invalidateNotifications } = useNotificationActions()

  const createClaimMutation = useMutation({
    mutationFn: createClaim,
    onSuccess: (newClaim) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      
      // Create notification for claim creation
      if (newClaim.handler_id && user?.id !== newClaim.handler_id) {
        if (typeof window !== 'undefined') {
          import('@/lib/notifications/NotificationSystem').then(({ notificationSystem }) => {
            notificationSystem.createNotification('task_assigned', newClaim.handler_id, {
              task_id: newClaim.id,
              task_title: `Handle claim ${newClaim.claim_number}`,
              priority: newClaim.priority || 'medium'
            })
          })
        }
      }
    }
  })

  const updateClaimMutation = useMutation({
    mutationFn: ({ claimId, updates, previousStatus }: { claimId: string; updates: UpdateClaimData; previousStatus?: string }) => 
      updateClaim(claimId, updates),
    onSuccess: (updatedClaim, { updates, previousStatus }) => {
      // Update specific claim in cache
      queryClient.setQueryData(['claim', updatedClaim.id], updatedClaim)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      
      // Create notification for status change
      if (updates.status && previousStatus && updates.status !== previousStatus && typeof window !== 'undefined') {
        import('@/lib/notifications/NotificationSystem').then(({ notificationSystem }) => {
          // Notify the handler if different from current user
          if (updatedClaim.handler_id && user?.id !== updatedClaim.handler_id) {
            notificationSystem.createNotification('claim_status_changed', updatedClaim.handler_id, {
              claim_id: updatedClaim.id,
              claim_number: updatedClaim.claim_number,
              old_status: previousStatus,
              new_status: updates.status
            })
          }
          
          // Notify policyholder if claim is approved or settled
          if ((updates.status === 'approved' || updates.status === 'settled') && updatedClaim.policy?.policyholder_id) {
            notificationSystem.createNotification('claim_status_changed', updatedClaim.policy.policyholder_id, {
              claim_id: updatedClaim.id,
              claim_number: updatedClaim.claim_number,
              old_status: previousStatus,
              new_status: updates.status
            })
          }
        })
      }
      
      // Refresh notifications
      // invalidateNotifications()
    }
  })

  const deleteClaimMutation = useMutation({
    mutationFn: deleteClaim,
    onSuccess: (_, claimId) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.removeQueries({ queryKey: ['claim', claimId] })
    }
  })

  return {
    createClaim: createClaimMutation,
    updateClaim: updateClaimMutation,
    deleteClaim: deleteClaimMutation
  }
}

// Helper functions
export const getClaimStatusColor = (status: string) => {
  switch (status) {
    case 'reported': return 'bg-yellow-500'
    case 'investigating': return 'bg-blue-500'
    case 'pending_approval': return 'bg-orange-500'
    case 'approved': return 'bg-green-500'
    case 'declined': return 'bg-red-500'
    case 'settled': return 'bg-green-600'
    case 'closed': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

export const getClaimPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'bg-gray-500'
    case 'normal': return 'bg-blue-500'
    case 'high': return 'bg-orange-500'
    case 'urgent': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

export const getClaimStatusLabel = (status: string) => {
  switch (status) {
    case 'reported': return 'Reported'
    case 'investigating': return 'Under Investigation'
    case 'pending_approval': return 'Pending Approval'
    case 'approved': return 'Approved'
    case 'declined': return 'Declined'
    case 'settled': return 'Settled'
    case 'closed': return 'Closed'
    default: return status
  }
}

export const getClaimPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'low': return 'Low'
    case 'normal': return 'Normal'
    case 'high': return 'High'
    case 'urgent': return 'Urgent'
    default: return priority
  }
}

export const getClaimTypeLabel = (claimType: string) => {
  switch (claimType) {
    case 'property_damage': return 'Property Damage'
    case 'liability': return 'Liability'
    case 'business_interruption': return 'Business Interruption'
    case 'motor': return 'Motor'
    case 'travel': return 'Travel'
    case 'personal_accident': return 'Personal Accident'
    case 'professional_indemnity': return 'Professional Indemnity'
    default: return claimType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

export const formatCurrency = (amount?: number) => {
  if (!amount) return '£0'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const generateClaimNumber = () => {
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `CLM-${year}-${timestamp}`
}