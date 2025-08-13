'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
// import { useNotificationActions } from './useNotifications'
import type { Database } from '@/types/database'

// Database types
export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']
export type Project = Database['public']['Tables']['projects']['Row']

// Enhanced interfaces
export interface EnhancedQuote extends Quote {
  project?: Pick<Project, 'id' | 'name' | 'status' | 'contact_name' | 'contact_email'>
  contractor?: {
    id: string
    first_name?: string
    surname?: string
    email?: string
    role?: string
    organisation_id?: string
  }
  approver?: {
    id: string
    first_name?: string
    surname?: string
    email?: string
    role?: string
  }
}

export interface QuoteFilters {
  search: string
  status: string[]
  project_id: string[]
  contractor_id: string[]
  date_range: {
    from?: Date
    to?: Date
  }
  amount_range: {
    from?: number
    to?: number
  }
}

export interface CreateQuoteData {
  project_id: string
  contractor_id: string
  quote_number: string
  title: string
  description?: string
  line_items: QuoteLineItem[]
  subtotal: number
  vat_amount: number
  total_amount: number
  valid_until?: string
  terms_conditions?: string
  payment_terms?: string
  warranty_period?: number
}

export interface UpdateQuoteData {
  title?: string
  description?: string
  line_items?: QuoteLineItem[]
  subtotal?: number
  vat_amount?: number
  total_amount?: number
  valid_until?: string
  status?: string
  rejection_reason?: string
  terms_conditions?: string
  payment_terms?: string
  warranty_period?: number
}

export interface QuoteLineItem {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  category?: string
}

// API Functions
const fetchQuotes = async (filters?: Partial<QuoteFilters>): Promise<EnhancedQuote[]> => {
  let query = supabase
    .from('quotes')
    .select(`
      *,
      project:projects!project_id (
        id,
        name,
        status,
        contact_name,
        contact_email
      ),
      contractor:user_profiles!contractor_id (
        id,
        first_name,
        surname,
        email,
        role,
        organisation_id
      ),
      approver:user_profiles!approved_by (
        id,
        first_name,
        surname,
        email,
        role
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters?.project_id && filters.project_id.length > 0) {
    query = query.in('project_id', filters.project_id)
  }

  if (filters?.contractor_id && filters.contractor_id.length > 0) {
    query = query.in('contractor_id', filters.contractor_id)
  }

  if (filters?.date_range?.from) {
    query = query.gte('created_at', filters.date_range.from.toISOString())
  }

  if (filters?.date_range?.to) {
    query = query.lte('created_at', filters.date_range.to.toISOString())
  }

  if (filters?.amount_range?.from) {
    query = query.gte('total_amount', filters.amount_range.from)
  }

  if (filters?.amount_range?.to) {
    query = query.lte('total_amount', filters.amount_range.to)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

const fetchQuoteById = async (quoteId: string): Promise<EnhancedQuote | null> => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      project:projects!project_id (
        id,
        name,
        status,
        contact_name,
        contact_email,
        description
      ),
      contractor:user_profiles!contractor_id (
        id,
        first_name,
        surname,
        email,
        role,
        organisation_id,
        phone
      ),
      approver:user_profiles!approved_by (
        id,
        first_name,
        surname,
        email,
        role
      )
    `)
    .eq('id', quoteId)
    .single()

  if (error) throw error
  return data
}

const createQuote = async (quoteData: CreateQuoteData): Promise<EnhancedQuote> => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        ...quoteData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        project:projects!project_id (
          id,
          name,
          status,
          contact_name,
          contact_email
        ),
        contractor:user_profiles!contractor_id (
          id,
          first_name,
          surname,
          email,
          role,
          organisation_id
        )
      `)
      .single()

    if (error) {
      console.warn('Database error creating quote:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating quote:', error)
    throw error
  }
}

const updateQuote = async (quoteId: string, updates: UpdateQuoteData): Promise<EnhancedQuote> => {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // If approving quote, set approval timestamp
    if (updates.status === 'approved') {
      const { data: { user } } = await supabase.auth.getUser()
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = user?.id
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select(`
        *,
        project:projects!project_id (
          id,
          name,
          status,
          contact_name,
          contact_email
        ),
        contractor:user_profiles!contractor_id (
          id,
          first_name,
          surname,
          email,
          role,
          organisation_id
        ),
        approver:user_profiles!approved_by (
          id,
          first_name,
          surname,
          email,
          role
        )
      `)
      .single()

    if (error) {
      console.warn('Database error updating quote:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error updating quote:', error)
    throw error
  }
}

const deleteQuote = async (quoteId: string): Promise<void> => {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)

  if (error) throw error
}

// Fetch related data
const fetchQuoteProjects = async (): Promise<Pick<Project, 'id' | 'name' | 'status' | 'contact_name'>[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, contact_name')
    .neq('status', 'closed')
    .order('name')

  if (error) throw error
  return data || []
}

const fetchQuoteContractors = async (): Promise<Pick<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'first_name' | 'surname' | 'role' | 'email' | 'organisation_id'>[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, surname, role, email, organisation_id')
    .in('role', ['contractor', 'supplier'])
    .eq('is_active', true)
    .order('first_name')

  if (error) throw error
  return data || []
}

// Custom hooks
export function useQuotes(filters?: Partial<QuoteFilters>) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => fetchQuotes(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })
}

export function useQuote(quoteId?: string) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quoteId ? fetchQuoteById(quoteId) : null,
    enabled: !!quoteId,
    staleTime: 1 * 60 * 1000
  })
}

export function useQuoteProjects() {
  return useQuery({
    queryKey: ['quote-projects'],
    queryFn: fetchQuoteProjects,
    staleTime: 10 * 60 * 1000
  })
}

export function useQuoteContractors() {
  return useQuery({
    queryKey: ['quote-contractors'],
    queryFn: fetchQuoteContractors,
    staleTime: 10 * 60 * 1000
  })
}

export function useQuoteMutations() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  // const { invalidateNotifications } = useNotificationActions()

  const createQuoteMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: (newQuote) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      
      // Create notification for quote creation
      if (newQuote.project?.contact_name && newQuote.contractor_id && user?.id !== newQuote.contractor_id) {
        if (typeof window !== 'undefined') {
          import('@/lib/notifications/NotificationSystem').then(({ notificationSystem }) => {
            notificationSystem.createNotification('task_assigned', newQuote.contractor_id, {
              task_id: newQuote.id,
              task_title: `Review quote ${newQuote.quote_number}`,
              priority: 'medium'
            })
          })
        }
      }
    }
  })

  const updateQuoteMutation = useMutation({
    mutationFn: ({ quoteId, updates, previousStatus }: { quoteId: string; updates: UpdateQuoteData; previousStatus?: string }) => 
      updateQuote(quoteId, updates),
    onSuccess: (updatedQuote, { updates, previousStatus }) => {
      // Update specific quote in cache
      queryClient.setQueryData(['quote', updatedQuote.id], updatedQuote)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      
      // Create notifications for status changes
      if (updates.status && previousStatus && updates.status !== previousStatus && typeof window !== 'undefined') {
        import('@/lib/notifications/NotificationSystem').then(({ notificationSystem }) => {
          // Notify contractor if quote status changed
          if (updatedQuote.contractor_id && user?.id !== updatedQuote.contractor_id) {
            if (updates.status === 'approved') {
              notificationSystem.createNotification('quote_approved', updatedQuote.contractor_id, {
                quote_id: updatedQuote.id,
                quote_number: updatedQuote.quote_number,
                amount: updatedQuote.total_amount
              })
            } else if (updates.status === 'rejected') {
              notificationSystem.createNotification('quote_rejected', updatedQuote.contractor_id, {
                quote_id: updatedQuote.id,
                quote_number: updatedQuote.quote_number,
                reason: updates.rejection_reason || 'No reason provided'
              })
            }
          }
          
          // Notify approver if quote is submitted for approval
          if (updates.status === 'pending' && updatedQuote.approver_id && user?.id !== updatedQuote.approver_id) {
            notificationSystem.createNotification('approval_required', updatedQuote.approver_id, {
              item_type: 'Quote',
              item_title: `${updatedQuote.quote_number} - ${updatedQuote.project?.name}`,
              action_url: `/estimates/${updatedQuote.id}`
            })
          }
        })
      }
      
      // Refresh notifications
      // invalidateNotifications()
    }
  })

  const deleteQuoteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: (_, quoteId) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.removeQueries({ queryKey: ['quote', quoteId] })
    }
  })

  return {
    createQuote: createQuoteMutation,
    updateQuote: updateQuoteMutation,
    deleteQuote: deleteQuoteMutation
  }
}

// Helper functions
export const getQuoteStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-500'
    case 'pending': return 'bg-yellow-500'
    case 'approved': return 'bg-green-500'
    case 'rejected': return 'bg-red-500'
    case 'expired': return 'bg-orange-500'
    case 'submitted': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

export const getQuoteStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Draft'
    case 'pending': return 'Pending Review'
    case 'approved': return 'Approved'
    case 'rejected': return 'Rejected'
    case 'expired': return 'Expired'
    case 'submitted': return 'Submitted'
    default: return status
  }
}

export const getQuoteStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'approved': return 'default'
    case 'rejected': return 'destructive'
    case 'expired': return 'outline'
    default: return 'secondary'
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

export const generateQuoteNumber = () => {
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `QUO-${year}-${timestamp}`
}

export const calculateQuoteTotals = (lineItems: QuoteLineItem[], vatRate: number = 20) => {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0)
  const vat_amount = subtotal * (vatRate / 100)
  const total_amount = subtotal + vat_amount
  
  return { subtotal, vat_amount, total_amount }
}

export const isQuoteExpired = (validUntil?: string) => {
  if (!validUntil) return false
  return new Date(validUntil) < new Date()
}