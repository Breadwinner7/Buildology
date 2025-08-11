'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import type { Appointment, AppointmentStatus, Project, UserProfile } from '@/types/database'
import { addDays, format, startOfDay, endOfDay, parseISO } from 'date-fns'

// Enhanced appointment interface with relations
export interface EnhancedAppointment extends Appointment {
  project?: Pick<Project, 'id' | 'name' | 'status'>
  organizer?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>
  attendee_profiles?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role' | 'avatar_url'>[]
}

export interface AppointmentFilters {
  search: string
  type: string[]
  status: AppointmentStatus[]
  attendee: string[]
  project: string[]
  dateRange: {
    from?: Date
    to?: Date
  }
  myAppointments: boolean
}

export interface CreateAppointmentData {
  project_id?: string
  title: string
  description?: string
  appointment_type: string
  scheduled_start: string
  scheduled_end: string
  location_address?: string
  organizer_id?: string
  attendees: string[]
  access_instructions?: string
  special_requirements?: string
  confirmation_required?: boolean
}

export interface UpdateAppointmentData {
  title?: string
  description?: string
  appointment_type?: string
  scheduled_start?: string
  scheduled_end?: string
  location_address?: string
  attendees?: string[]
  status?: AppointmentStatus
  actual_start?: string
  actual_end?: string
  cancellation_reason?: string
  access_instructions?: string
  special_requirements?: string
  outcome_notes?: string
  follow_up_required?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  appointment_type: string
  status: AppointmentStatus
  location?: string
  project_name?: string
  organizer_name?: string
  attendee_count: number
}

// Appointment types
export const APPOINTMENT_TYPES = [
  'Initial Survey',
  'Follow-up Survey',
  'Damage Assessment',
  'Expert Inspection',
  'Progress Review',
  'Final Inspection',
  'Client Meeting',
  'Contractor Meeting',
  'Site Visit',
  'Settlement Meeting',
  'Court Hearing',
  'Mediation',
  'Other'
]

// API Functions
const fetchAppointments = async (filters?: Partial<AppointmentFilters>): Promise<EnhancedAppointment[]> => {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      projects:project_id (id, name, status),
      user_profiles:organizer_id (id, first_name, surname, role, avatar_url)
    `)

  // Apply date range filter
  if (filters?.dateRange?.from || filters?.dateRange?.to) {
    const from = filters.dateRange.from ? startOfDay(filters.dateRange.from).toISOString() : null
    const to = filters.dateRange.to ? endOfDay(filters.dateRange.to).toISOString() : null
    
    if (from && to) {
      query = query.gte('scheduled_start', from).lte('scheduled_start', to)
    } else if (from) {
      query = query.gte('scheduled_start', from)
    } else if (to) {
      query = query.lte('scheduled_start', to)
    }
  }

  // Apply status filter
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  // Apply type filter
  if (filters?.type && filters.type.length > 0) {
    query = query.in('appointment_type', filters.type)
  }

  // Apply project filter
  if (filters?.project && filters.project.length > 0) {
    query = query.in('project_id', filters.project)
  }

  query = query.order('scheduled_start', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching appointments:', error)
    throw error
  }

  // Enrich appointments with attendee profiles
  const enrichedAppointments = await Promise.all(
    (data || []).map(async (appointment) => {
      if (appointment.attendees && appointment.attendees.length > 0) {
        const { data: attendeeProfiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, surname, role, avatar_url')
          .in('id', appointment.attendees)

        return {
          ...appointment,
          attendee_profiles: attendeeProfiles || []
        } as EnhancedAppointment
      }
      return appointment as EnhancedAppointment
    })
  )

  // Apply search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    return enrichedAppointments.filter(appointment =>
      appointment.title.toLowerCase().includes(searchLower) ||
      appointment.description?.toLowerCase().includes(searchLower) ||
      appointment.appointment_type.toLowerCase().includes(searchLower) ||
      appointment.location_address?.toLowerCase().includes(searchLower) ||
      appointment.project?.name.toLowerCase().includes(searchLower)
    )
  }

  return enrichedAppointments
}

const fetchUserAppointments = async (userId: string): Promise<EnhancedAppointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      projects:project_id (id, name, status),
      user_profiles:organizer_id (id, first_name, surname, role, avatar_url)
    `)
    .or(`organizer_id.eq.${userId},attendees.cs.{"${userId}"}`)
    .order('scheduled_start', { ascending: true })

  if (error) {
    console.error('Error fetching user appointments:', error)
    throw error
  }

  // Enrich with attendee profiles
  const enrichedAppointments = await Promise.all(
    (data || []).map(async (appointment) => {
      if (appointment.attendees && appointment.attendees.length > 0) {
        const { data: attendeeProfiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, surname, role, avatar_url')
          .in('id', appointment.attendees)

        return {
          ...appointment,
          attendee_profiles: attendeeProfiles || []
        } as EnhancedAppointment
      }
      return appointment as EnhancedAppointment
    })
  )

  return enrichedAppointments
}

const fetchCalendarEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, title, appointment_type, status, scheduled_start, scheduled_end, location_address,
      attendees,
      projects:project_id (name),
      user_profiles:organizer_id (first_name, surname)
    `)
    .gte('scheduled_start', startDate.toISOString())
    .lte('scheduled_end', endDate.toISOString())
    .order('scheduled_start', { ascending: true })

  if (error) {
    console.error('Error fetching calendar events:', error)
    throw error
  }

  return (data || []).map(appointment => ({
    id: appointment.id,
    title: appointment.title,
    start: parseISO(appointment.scheduled_start),
    end: parseISO(appointment.scheduled_end),
    appointment_type: appointment.appointment_type,
    status: appointment.status,
    location: appointment.location_address,
    project_name: appointment.projects?.name,
    organizer_name: appointment.user_profiles ? 
      `${appointment.user_profiles.first_name} ${appointment.user_profiles.surname}` : '',
    attendee_count: appointment.attendees?.length || 0
  }))
}

const createAppointment = async (data: CreateAppointmentData): Promise<Appointment> => {
  try {
    // Get current user for organizer_id field
    const { data: { user } } = await supabase.auth.getUser()
    
    // Prepare the appointment data with proper formatting
    const appointmentData = {
      project_id: data.project_id || null, // Can be null according to schema
      title: data.title,
      description: data.description || null,
      appointment_type: data.appointment_type,
      scheduled_start: data.scheduled_start,
      scheduled_end: data.scheduled_end,
      location_address: data.location_address || null,
      organizer_id: data.organizer_id || user?.id || null,
      attendees: data.attendees || [], // Ensure it's an array, even if empty
      access_instructions: data.access_instructions || null,
      special_requirements: data.special_requirements || null,
      status: 'scheduled' as const,
      confirmation_required: data.confirmation_required ?? true,
      reminder_sent: false,
      follow_up_required: false
    }

    console.log('Creating appointment with data:', appointmentData)
    
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()

    if (error) {
      console.error('Database error creating appointment:', error)
      throw error
    }

    return appointment
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
}

const updateAppointment = async (id: string, data: UpdateAppointmentData): Promise<Appointment> => {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating appointment:', error)
    throw error
  }

  return appointment
}

const deleteAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
}

// Hook for fetching appointments with filters
export const useAppointments = (filters?: Partial<AppointmentFilters>) => {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => fetchAppointments(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook for fetching user's appointments
export const useUserAppointments = (userId?: string) => {
  return useQuery({
    queryKey: ['user-appointments', userId],
    queryFn: () => userId ? fetchUserAppointments(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// Hook for fetching calendar events
export const useCalendarEvents = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['calendar-events', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetchCalendarEvents(startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes for calendar
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for appointment mutations
export const useAppointmentMutations = () => {
  const queryClient = useQueryClient()

  const createAppointmentMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming-appointments'] })
    },
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) => 
      updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming-appointments'] })
    },
  })

  const deleteAppointmentMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming-appointments'] })
    },
  })

  return {
    createAppointment: createAppointmentMutation,
    updateAppointment: updateAppointmentMutation,
    deleteAppointment: deleteAppointmentMutation,
  }
}

// Utility functions
export const getAppointmentStatusColor = (status: AppointmentStatus): string => {
  switch (status) {
    case 'scheduled': return 'bg-blue-500'
    case 'confirmed': return 'bg-green-500'
    case 'cancelled': return 'bg-red-500'
    case 'completed': return 'bg-gray-500'
    case 'no_show': return 'bg-orange-500'
    default: return 'bg-gray-400'
  }
}

export const getAppointmentStatusLabel = (status: AppointmentStatus): string => {
  switch (status) {
    case 'scheduled': return 'Scheduled'
    case 'confirmed': return 'Confirmed'
    case 'cancelled': return 'Cancelled'
    case 'completed': return 'Completed'
    case 'no_show': return 'No Show'
    default: return status
  }
}

export const formatAppointmentTime = (startTime: string, endTime?: string): string => {
  const start = parseISO(startTime)
  const startFormatted = format(start, 'h:mm a')
  
  if (endTime) {
    const end = parseISO(endTime)
    const endFormatted = format(end, 'h:mm a')
    return `${startFormatted} - ${endFormatted}`
  }
  
  return startFormatted
}

export const isAppointmentToday = (scheduledStart: string): boolean => {
  const appointmentDate = parseISO(scheduledStart)
  const today = new Date()
  return format(appointmentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
}

export const isAppointmentUpcoming = (scheduledStart: string): boolean => {
  const appointmentDate = parseISO(scheduledStart)
  const now = new Date()
  return appointmentDate > now
}

export const getAppointmentDuration = (startTime: string, endTime: string): number => {
  const start = parseISO(startTime)
  const end = parseISO(endTime)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // Minutes
}

export const canCancelAppointment = (scheduledStart: string): boolean => {
  const appointmentDate = parseISO(scheduledStart)
  const now = new Date()
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntilAppointment > 2 // Can cancel if more than 2 hours away
}

export const canRescheduleAppointment = (scheduledStart: string, status: AppointmentStatus): boolean => {
  return status === 'scheduled' && canCancelAppointment(scheduledStart)
}