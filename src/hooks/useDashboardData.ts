'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import type { Project, Task, UserProfile, Appointment, Document } from '@/types/database'

// Types for dashboard data
export interface DashboardMetrics {
  // Project metrics
  totalProjects: number
  activeProjects: number
  projectsOnHold: number
  projectsCompleted: number
  
  // Task metrics
  totalTasks: number
  overdueTasks: number
  tasksThisWeek: number
  myPendingTasks: number
  
  // Financial metrics
  totalBudget: number
  budgetSpent: number
  budgetRemaining: number
  overdueInvoices: number
  
  // Communication metrics
  unreadMessages: number
  activeThreads: number
  
  // Compliance metrics
  slaBreaches: number
  complianceAlerts: number
  fcaReportingEvents: number
  
  // Appointment metrics
  upcomingAppointments: number
  todaysAppointments: number
}

export interface RecentProject {
  id: string
  name: string
  status: string
  current_stage: string
  updated_at: string
  vulnerability_flags: string[]
  contact_name: string
  on_hold: boolean
  hold_reason: string
}

export interface PriorityTask {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  project_id: string
  project_name: string
  assigned_to: string
  assigned_user_name: string
}

export interface RecentActivity {
  id: string
  type: string
  content: string
  created_at: string
  project_id: string
  project_name: string
  user_id: string
  user_name: string
}

export interface ComplianceAlert {
  id: string
  type: string
  severity: string
  description: string
  project_id: string
  project_name: string
  due_date: string
  status: string
}

export interface UpcomingAppointment {
  id: string
  title: string
  appointment_type: string
  scheduled_start: string
  location_address: string
  project_id: string
  project_name: string
  status: string
  organizer_name: string
}

// Helper function for default metrics when data can't be loaded
const getDefaultMetrics = (): DashboardMetrics => ({
  totalProjects: 0,
  activeProjects: 0,
  projectsOnHold: 0,
  projectsCompleted: 0,
  totalTasks: 0,
  overdueTasks: 0,
  tasksThisWeek: 0,
  myPendingTasks: 0,
  totalBudget: 0,
  budgetSpent: 0,
  budgetRemaining: 0,
  overdueInvoices: 0,
  unreadMessages: 0,
  activeThreads: 0,
  slaBreaches: 0,
  complianceAlerts: 0,
  fcaReportingEvents: 0,
  upcomingAppointments: 0,
  todaysAppointments: 0
})

// API functions
const fetchDashboardMetrics = async (userId: string): Promise<DashboardMetrics> => {
  try {
    // Get user's accessible projects based on RLS policies
    const { data: accessibleProjects, error: projectError } = await supabase
      .from('projects')
      .select('id, status, on_hold')
    
    if (projectError) {
      console.warn('Could not fetch projects for metrics:', projectError)
      return getDefaultMetrics()
    }
    
    const projectIds = accessibleProjects?.map(p => p.id) || []
    
    // Fetch various metrics in parallel
    const [
      projectFinancials,
      tasks,
      messages,
      slaTracking,
      complianceChecks,
      fcaEvents,
      appointments,
      invoices
    ] = await Promise.all([
      supabase.from('project_financials').select('budget_total, budget_spent, budget_remaining').in('project_id', projectIds),
      supabase.from('tasks').select('id, status, due_date, assigned_to').in('project_id', projectIds),
      supabase.from('thread_participants').select('thread_id, last_read_at, threads!inner(updated_at)').eq('user_id', userId),
      supabase.from('sla_tracking').select('id, breach_logged').in('project_id', projectIds),
      supabase.from('compliance_checks').select('id, compliance_status').in('project_id', projectIds),
      supabase.from('fca_reporting_events').select('id, status').in('project_id', projectIds),
      supabase.from('appointments').select('id, scheduled_start, status').in('project_id', projectIds),
      supabase.from('invoices').select('id, status, due_date').in('project_id', projectIds)
    ])
    
    // Calculate metrics
    const totalProjects = accessibleProjects?.length || 0
    const activeProjects = accessibleProjects?.filter(p => 
      ['works_in_progress', 'survey_booked', 'survey_complete', 'scheduling_works'].includes(p.status)
    ).length || 0
    const projectsOnHold = accessibleProjects?.filter(p => p.on_hold).length || 0
    const projectsCompleted = accessibleProjects?.filter(p => p.status === 'closed').length || 0
    
    const totalTasks = tasks.data?.length || 0
    const overdueTasks = tasks.data?.filter(t => 
      t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
    ).length || 0
    const myPendingTasks = tasks.data?.filter(t => 
      t.assigned_to === userId && t.status !== 'done'
    ).length || 0
    const tasksThisWeek = tasks.data?.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return dueDate <= weekFromNow && t.status !== 'done'
    }).length || 0
    
    const totalBudget = projectFinancials.data?.reduce((sum, f) => sum + (f.budget_total || 0), 0) || 0
    const budgetSpent = projectFinancials.data?.reduce((sum, f) => sum + (f.budget_spent || 0), 0) || 0
    const budgetRemaining = projectFinancials.data?.reduce((sum, f) => sum + (f.budget_remaining || 0), 0) || 0
    
    const overdueInvoices = invoices.data?.filter(i => 
      i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date()
    ).length || 0
    
    const unreadMessages = messages.data?.filter(m => 
      !m.last_read_at || new Date(m.last_read_at) < new Date(m.threads.updated_at)
    ).length || 0
    const activeThreads = messages.data?.length || 0
    
    const slaBreaches = slaTracking.data?.filter(s => s.breach_logged).length || 0
    const complianceAlerts = complianceChecks.data?.filter(c => 
      c.compliance_status === 'non_compliant' || c.compliance_status === 'expired'
    ).length || 0
    const fcaReportingEvents = fcaEvents.data?.filter(f => f.status === 'open').length || 0
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todaysAppointments = appointments.data?.filter(a => {
      const appointmentDate = new Date(a.scheduled_start)
      return appointmentDate >= today && appointmentDate < tomorrow && a.status !== 'cancelled'
    }).length || 0
    
    const upcomingAppointments = appointments.data?.filter(a => {
      const appointmentDate = new Date(a.scheduled_start)
      return appointmentDate >= now && a.status !== 'cancelled'
    }).length || 0
    
    return {
      totalProjects,
      activeProjects,
      projectsOnHold,
      projectsCompleted,
      totalTasks,
      overdueTasks,
      tasksThisWeek,
      myPendingTasks,
      totalBudget,
      budgetSpent,
      budgetRemaining,
      overdueInvoices,
      unreadMessages,
      activeThreads,
      slaBreaches,
      complianceAlerts,
      fcaReportingEvents,
      upcomingAppointments,
      todaysAppointments
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw error
  }
}

const fetchRecentProjects = async (limit: number = 10): Promise<RecentProject[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, current_stage, updated_at, vulnerability_flags, contact_name, on_hold, hold_reason')
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

const fetchPriorityTasks = async (userId: string, limit: number = 10): Promise<PriorityTask[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, title, description, status, priority, due_date, project_id, assigned_to,
      projects!inner(name),
      user_profiles!assigned_to(first_name, surname)
    `)
    .or(`assigned_to.eq.${userId},priority.eq.urgent,priority.eq.high`)
    .neq('status', 'done')
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.warn('Could not fetch priority tasks:', error)
    return []
  }
  
  return data?.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    project_id: task.project_id,
    project_name: task.projects?.name || '',
    assigned_to: task.assigned_to || '',
    assigned_user_name: task.user_profiles ? 
      `${task.user_profiles.first_name} ${task.user_profiles.surname}` : ''
  })) || []
}

const fetchRecentActivity = async (limit: number = 15): Promise<RecentActivity[]> => {
  const { data, error } = await supabase
    .from('timeline_events')
    .select(`
      id, type, content, created_at, project_id,
      projects!inner(name),
      user_profiles!user_id(first_name, surname)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.warn('Could not fetch timeline events:', error)
    return []
  }
  
  return data?.map(event => ({
    id: event.id,
    type: event.type,
    content: event.content,
    created_at: event.created_at,
    project_id: event.project_id,
    project_name: event.projects?.name || '',
    user_id: event.user_id || '',
    user_name: event.user_profiles ? 
      `${event.user_profiles.first_name} ${event.user_profiles.surname}` : ''
  })) || []
}

const fetchComplianceAlerts = async (limit: number = 10): Promise<ComplianceAlert[]> => {
  const { data, error } = await supabase
    .from('fca_reporting_events')
    .select(`
      id, event_type, severity, description, due_date, status, project_id,
      projects!inner(name)
    `)
    .eq('status', 'open')
    .order('severity', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  
  return data?.map(alert => ({
    id: alert.id,
    type: alert.event_type,
    severity: alert.severity,
    description: alert.description,
    project_id: alert.project_id,
    project_name: alert.projects?.name || '',
    due_date: alert.due_date,
    status: alert.status
  })) || []
}

const fetchUpcomingAppointments = async (limit: number = 5): Promise<UpcomingAppointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, title, appointment_type, scheduled_start, location_address, status, project_id,
      projects!inner(name),
      user_profiles!organizer_id(first_name, surname)
    `)
    .gte('scheduled_start', new Date().toISOString())
    .neq('status', 'cancelled')
    .order('scheduled_start', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  
  return data?.map(appointment => ({
    id: appointment.id,
    title: appointment.title,
    appointment_type: appointment.appointment_type,
    scheduled_start: appointment.scheduled_start,
    location_address: appointment.location_address,
    project_id: appointment.project_id,
    project_name: appointment.projects?.name || '',
    status: appointment.status,
    organizer_name: appointment.user_profiles ? 
      `${appointment.user_profiles.first_name} ${appointment.user_profiles.surname}` : ''
  })) || []
}

// Custom hook for dashboard data
export function useDashboardData() {
  const { user, loading: userLoading } = useUser()
  const queryClient = useQueryClient()
  
  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: () => fetchDashboardMetrics(user?.id || ''),
    enabled: !!user?.id && !userLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })
  
  const recentProjectsQuery = useQuery({
    queryKey: ['dashboard-recent-projects'],
    queryFn: () => fetchRecentProjects(8),
    enabled: !!user?.id && !userLoading,
    staleTime: 5 * 60 * 1000
  })
  
  const priorityTasksQuery = useQuery({
    queryKey: ['dashboard-priority-tasks', user?.id],
    queryFn: () => fetchPriorityTasks(user?.id || ''),
    enabled: !!user?.id && !userLoading,
    staleTime: 2 * 60 * 1000
  })
  
  const recentActivityQuery = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: () => fetchRecentActivity(12),
    enabled: !!user?.id && !userLoading,
    staleTime: 1 * 60 * 1000 // 1 minute for activity
  })
  
  const complianceAlertsQuery = useQuery({
    queryKey: ['dashboard-compliance-alerts'],
    queryFn: () => fetchComplianceAlerts(8),
    enabled: !!user?.id && !userLoading,
    staleTime: 5 * 60 * 1000
  })
  
  const upcomingAppointmentsQuery = useQuery({
    queryKey: ['dashboard-upcoming-appointments'],
    queryFn: () => fetchUpcomingAppointments(5),
    enabled: !!user?.id && !userLoading,
    staleTime: 5 * 60 * 1000
  })
  
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-priority-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-compliance-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming-appointments'] })
    ])
  }
  
  return {
    metrics: metricsQuery.data,
    recentProjects: recentProjectsQuery.data || [],
    priorityTasks: priorityTasksQuery.data || [],
    recentActivity: recentActivityQuery.data || [],
    complianceAlerts: complianceAlertsQuery.data || [],
    upcomingAppointments: upcomingAppointmentsQuery.data || [],
    
    // Loading states
    metricsLoading: metricsQuery.isLoading,
    projectsLoading: recentProjectsQuery.isLoading,
    tasksLoading: priorityTasksQuery.isLoading,
    activityLoading: recentActivityQuery.isLoading,
    complianceLoading: complianceAlertsQuery.isLoading,
    appointmentsLoading: upcomingAppointmentsQuery.isLoading,
    
    // Error states
    metricsError: metricsQuery.error,
    projectsError: recentProjectsQuery.error,
    tasksError: priorityTasksQuery.error,
    activityError: recentActivityQuery.error,
    complianceError: complianceAlertsQuery.error,
    appointmentsError: upcomingAppointmentsQuery.error,
    
    // Actions
    refreshAll,
    
    // Overall loading state
    isLoading: userLoading || metricsQuery.isLoading,
    hasErrors: !!(metricsQuery.error || recentProjectsQuery.error || priorityTasksQuery.error)
  }
}