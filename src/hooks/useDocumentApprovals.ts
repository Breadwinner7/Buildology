'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import type { UserProfile } from '@/types/database'

// Enhanced interfaces for document approval workflows
export interface ApprovalRequest {
  id: string
  project_id?: string
  request_type: string
  requested_by: string
  amount?: number
  description: string
  justification?: string
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  required_authority_level: string
  approvers: string[]
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  escalated: boolean
  escalated_at?: string
  expires_at?: string
  metadata: any
  created_at: string
  requested_by_user?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>
  approved_by_user?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>
}

export interface DocumentApproval {
  id: string
  document_id: string
  approval_request_id?: string
  workflow_stage: string
  approval_status: 'pending' | 'approved' | 'rejected' | 'auto_approved'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  visibility_level: 'internal' | 'contractors' | 'customers' | 'public'
  requires_approval: boolean
  approval_level_required: string
  document?: {
    id: string
    name: string
    type: string
    project_id?: string
    uploaded_by?: string
  }
  approved_by_user?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>
}

export interface CreateApprovalRequestData {
  project_id?: string
  request_type: string
  description: string
  justification?: string
  urgency?: 'low' | 'normal' | 'high' | 'urgent'
  required_authority_level: string
  approvers: string[]
  amount?: number
  metadata?: any
}

export interface ApprovalFilters {
  status?: ('pending' | 'approved' | 'rejected' | 'escalated')[]
  project_id?: string
  request_type?: string
  urgency?: ('low' | 'normal' | 'high' | 'urgent')[]
  date_range?: {
    start: string
    end: string
  }
}

// API Functions
const fetchApprovalRequests = async (filters?: Partial<ApprovalFilters>): Promise<ApprovalRequest[]> => {
  let query = supabase
    .from('approval_requests')
    .select(`
      *,
      requested_by_user:user_profiles!requested_by (
        id,
        first_name,
        surname,
        role,
        avatar_url
      ),
      approved_by_user:user_profiles!approved_by (
        id,
        first_name,
        surname,
        role,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.request_type) {
    query = query.eq('request_type', filters.request_type)
  }

  if (filters?.urgency && filters.urgency.length > 0) {
    query = query.in('urgency', filters.urgency)
  }

  if (filters?.date_range) {
    query = query
      .gte('created_at', filters.date_range.start)
      .lte('created_at', filters.date_range.end)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

const fetchDocumentApprovals = async (projectId?: string): Promise<DocumentApproval[]> => {
  let query = supabase
    .from('documents')
    .select(`
      id,
      name,
      type,
      project_id,
      workflow_stage,
      approval_status,
      approved_by,
      approved_at,
      visibility_level,
      approved_by_user:user_profiles!approved_by (
        id,
        first_name,
        surname,
        role,
        avatar_url
      )
    `)
    .not('approval_status', 'is', null)
    .order('uploaded_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map(doc => ({
    id: doc.id,
    document_id: doc.id,
    workflow_stage: doc.workflow_stage || 'uploaded',
    approval_status: doc.approval_status as any,
    approved_by: doc.approved_by,
    approved_at: doc.approved_at,
    visibility_level: doc.visibility_level as any || 'internal',
    requires_approval: doc.approval_status === 'pending',
    approval_level_required: getRequiredApprovalLevel(doc.type),
    document: {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      project_id: doc.project_id
    },
    approved_by_user: doc.approved_by_user
  }))
}

const fetchPendingApprovals = async (userId: string): Promise<ApprovalRequest[]> => {
  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      requested_by_user:user_profiles!requested_by (
        id,
        first_name,
        surname,
        role,
        avatar_url
      )
    `)
    .eq('status', 'pending')
    .contains('approvers', [userId])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

const createApprovalRequest = async (requestData: CreateApprovalRequestData): Promise<ApprovalRequest> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Set expiry date based on urgency
  let expiresAt = new Date()
  switch (requestData.urgency) {
    case 'urgent':
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours
      break
    case 'high':
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days
      break
    case 'normal':
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days
      break
    default:
      expiresAt.setDate(expiresAt.getDate() + 14) // 14 days
  }

  const { data, error } = await supabase
    .from('approval_requests')
    .insert([{
      project_id: requestData.project_id,
      request_type: requestData.request_type,
      requested_by: user.id,
      amount: requestData.amount,
      description: requestData.description,
      justification: requestData.justification,
      urgency: requestData.urgency || 'normal',
      required_authority_level: requestData.required_authority_level,
      approvers: requestData.approvers,
      expires_at: expiresAt.toISOString(),
      metadata: requestData.metadata || {},
      status: 'pending',
      escalated: false
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

const approveRequest = async (requestId: string, comments?: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('approval_requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      metadata: {
        approval_comments: comments
      }
    })
    .eq('id', requestId)

  if (error) throw error
}

const rejectRequest = async (requestId: string, reason: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('approval_requests')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', requestId)

  if (error) throw error
}

const approveDocument = async (documentId: string, approvalLevel: string, visibility?: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updates: any = {
    approval_status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    workflow_stage: 'approved'
  }

  if (visibility) {
    updates.visibility_level = visibility
  }

  const { error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)

  if (error) throw error
}

const rejectDocument = async (documentId: string, reason: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('documents')
    .update({
      approval_status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      workflow_stage: 'rejected'
    })
    .eq('id', documentId)

  if (error) throw error
}

const escalateRequest = async (requestId: string, reason: string): Promise<void> => {
  const { error } = await supabase
    .from('approval_requests')
    .update({
      status: 'escalated',
      escalated: true,
      escalated_at: new Date().toISOString(),
      metadata: {
        escalation_reason: reason
      }
    })
    .eq('id', requestId)

  if (error) throw error
}

const fetchApprovalUsers = async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, surname, role, avatar_url')
    .in('role', [
      'super_admin',
      'underwriting_manager',
      'claims_director',
      'claims_manager',
      'senior_claims_handler',
      'finance_controller',
      'litigation_manager'
    ])
    .eq('is_active', true)
    .order('first_name')

  if (error) throw error
  return data || []
}

// Helper functions
export const getRequiredApprovalLevel = (documentType: string): string => {
  switch (documentType) {
    case 'Contract':
    case 'Quote':
      return 'manager'
    case 'Invoice':
      return 'finance'
    case 'Policy Document':
    case 'Claims Document':
      return 'director'
    case 'Certificate':
    case 'Technical Drawing':
      return 'specialist'
    default:
      return 'standard'
  }
}

export const getApprovalStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-500'
    case 'rejected': return 'bg-red-500'
    case 'pending': return 'bg-yellow-500'
    case 'escalated': return 'bg-orange-500'
    case 'expired': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

export const getApprovalStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Approved'
    case 'rejected': return 'Rejected'
    case 'pending': return 'Pending Review'
    case 'escalated': return 'Escalated'
    case 'expired': return 'Expired'
    default: return 'Unknown'
  }
}

export const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'urgent': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'normal': return 'bg-blue-500'
    case 'low': return 'bg-gray-500'
    default: return 'bg-blue-500'
  }
}

export const formatApprovalTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60)
    return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Custom hooks
export function useApprovalRequests(filters?: Partial<ApprovalFilters>) {
  return useQuery({
    queryKey: ['approval-requests', filters],
    queryFn: () => fetchApprovalRequests(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000 // 2 minutes
  })
}

export function useDocumentApprovals(projectId?: string) {
  return useQuery({
    queryKey: ['document-approvals', projectId],
    queryFn: () => fetchDocumentApprovals(projectId),
    staleTime: 30 * 1000,
    refetchInterval: 1 * 60 * 1000 // 1 minute
  })
}

export function usePendingApprovals(userId?: string) {
  return useQuery({
    queryKey: ['pending-approvals', userId],
    queryFn: () => userId ? fetchPendingApprovals(userId) : [],
    enabled: !!userId,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000 // 30 seconds for real-time feel
  })
}

export function useApprovalUsers() {
  return useQuery({
    queryKey: ['approval-users'],
    queryFn: fetchApprovalUsers,
    staleTime: 10 * 60 * 1000 // 10 minutes
  })
}

export function useApprovalMutations() {
  const queryClient = useQueryClient()

  const createRequestMutation = useMutation({
    mutationFn: createApprovalRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
    }
  })

  const approveMutation = useMutation({
    mutationFn: ({ requestId, comments }: { requestId: string, comments?: string }) => 
      approveRequest(requestId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string, reason: string }) => 
      rejectRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    }
  })

  const escalateMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string, reason: string }) => 
      escalateRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    }
  })

  const approveDocumentMutation = useMutation({
    mutationFn: ({ documentId, approvalLevel, visibility }: { 
      documentId: string, 
      approvalLevel: string, 
      visibility?: string 
    }) => approveDocument(documentId, approvalLevel, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    }
  })

  const rejectDocumentMutation = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string, reason: string }) => 
      rejectDocument(documentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    }
  })

  return {
    createRequest: createRequestMutation,
    approve: approveMutation,
    reject: rejectMutation,
    escalate: escalateMutation,
    approveDocument: approveDocumentMutation,
    rejectDocument: rejectDocumentMutation
  }
}