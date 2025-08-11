'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import type { Project, UserProfile } from '@/types/database'
import { format, formatDistanceToNow } from 'date-fns'

// Type definitions
export interface Thread {
  id: string
  title: string
  project_id?: string
  created_by: string
  created_at: string
  updated_at: string
  last_message?: Message
  participants_count: number
  unread_count: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_archived: boolean
  project?: Pick<Project, 'id' | 'name'>
  created_by_user?: Pick<UserProfile, 'id' | 'first_name' | 'surname'>
  participants?: Array<Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'avatar_url'>>
}

export interface Message {
  id: string
  thread_id: string
  content: string
  sender_id: string
  user_id: string
  created_at: string
  reply_to_id?: string
  is_edited?: boolean
  sender?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'avatar_url'>
  user?: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'avatar_url'>
  reply_to_message?: Message
  reactions?: Array<{
    id: string
    emoji: string
    user_id: string
    user?: Pick<UserProfile, 'id' | 'first_name' | 'surname'>
  }>
  attachments?: Array<{
    id: string
    file_name: string
    file_url: string
    file_size: number
  }>
}

export interface MessageFilters {
  search: string
  project_id?: string
  priority: string[]
  unread_only: boolean
  archived: boolean
}

export interface CreateThreadData {
  title: string
  project_id?: string
  participant_ids: string[]
  initial_message?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface SendMessageData {
  thread_id: string
  content: string
  reply_to_id?: string
  attachments?: File[]
}

// Mock data for development
const mockThreads: Thread[] = [
  {
    id: '1',
    title: 'Project Setup Discussion',
    project_id: '1',
    created_by: 'user-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
    participants_count: 3,
    unread_count: 2,
    priority: 'high',
    is_archived: false,
    project: { id: '1', name: 'Sample Project' },
    created_by_user: { id: 'user-1', first_name: 'John', surname: 'Doe' },
    last_message: {
      id: 'msg-1',
      thread_id: '1',
      content: 'Let\'s schedule a meeting to discuss the project requirements',
      sender_id: 'user-2',
      created_at: '2024-01-15T14:30:00Z',
      sender: { id: 'user-2', first_name: 'Jane', surname: 'Smith', avatar_url: undefined }
    }
  },
  {
    id: '2',
    title: 'Budget Review',
    created_by: 'user-1',
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-14T16:45:00Z',
    participants_count: 2,
    unread_count: 0,
    priority: 'normal',
    is_archived: false,
    created_by_user: { id: 'user-1', first_name: 'John', surname: 'Doe' }
  }
]

const mockUsers: Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role'>[] = [
  { id: 'user-1', first_name: 'John', surname: 'Doe', role: 'admin' },
  { id: 'user-2', first_name: 'Jane', surname: 'Smith', role: 'manager' },
  { id: 'user-3', first_name: 'Bob', surname: 'Wilson', role: 'user' }
]

// API Functions
const fetchThreads = async (filters?: Partial<MessageFilters>): Promise<Thread[]> => {
  try {
    // Try to fetch real data first
    const { data, error } = await supabase
      .from('threads')
      .select(`
        *,
        project:projects (id, name),
        created_by_user:user_profiles!created_by (id, first_name, surname)
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.warn('Failed to fetch threads, using mock data:', error)
      return mockThreads
    }

    return data || mockThreads
  } catch (error) {
    console.warn('Error fetching threads, using mock data:', error)
    return mockThreads
  }
}

const fetchMessages = async (threadId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:user_profiles!sender_id (id, first_name, surname, avatar_url)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Failed to fetch messages:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching messages:', error)
    return []
  }
}

const fetchProjects = async (): Promise<Pick<Project, 'id' | 'name'>[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name')

    if (error) {
      console.warn('Failed to fetch projects:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error fetching projects:', error)
    return []
  }
}

const fetchUsers = async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'surname' | 'role'>[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, surname, role')
      .order('first_name')

    if (error) {
      console.warn('Failed to fetch users, using mock data:', error)
      return mockUsers
    }

    return data || mockUsers
  } catch (error) {
    console.warn('Error fetching users, using mock data:', error)
    return mockUsers
  }
}

// Hooks
export const useThreads = (filters?: Partial<MessageFilters>) => {
  return useQuery({
    queryKey: ['threads', filters],
    queryFn: () => fetchThreads(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useThread = (threadId: string) => {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const threads = await fetchThreads()
      return threads.find(thread => thread.id === threadId) || null
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!threadId
  })
}

export const useMessages = (threadId: string) => {
  return useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => fetchMessages(threadId),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!threadId
  })
}

export const useMessagingProjects = () => {
  return useQuery({
    queryKey: ['messaging-projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useMessagingUsers = () => {
  return useQuery({
    queryKey: ['messaging-users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Mutations hook
export const useMessagingMutations = () => {
  const queryClient = useQueryClient()

  const createThread = useMutation({
    mutationFn: async (data: CreateThreadData) => {
      // For now, just return mock data
      return {
        id: `thread-${Date.now()}`,
        ...data,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        participants_count: data.participant_ids.length + 1,
        unread_count: 0,
        is_archived: false
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    }
  })

  const sendMessage = useMutation({
    mutationFn: async (data: SendMessageData) => {
      return {
        id: `msg-${Date.now()}`,
        thread_id: data.thread_id,
        content: data.content,
        sender_id: 'current-user',
        created_at: new Date().toISOString(),
        reply_to_id: data.reply_to_id
      }
    },
    onSuccess: (_, { thread_id }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread_id] })
      queryClient.invalidateQueries({ queryKey: ['threads'] })
      queryClient.invalidateQueries({ queryKey: ['thread', thread_id] })
    }
  })

  const markAsRead = useMutation({
    mutationFn: async (threadId: string) => {
      // TODO: Implement actual API call
      console.log('Marking thread as read:', threadId)
      return { threadId }
    },
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    }
  })

  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // TODO: Implement actual API call
      console.log('Adding reaction:', { messageId, emoji })
      return { messageId, emoji }
    },
    onSuccess: (_, { messageId }) => {
      // Find which thread this message belongs to and invalidate it
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })

  const removeReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // TODO: Implement actual API call
      console.log('Removing reaction:', { messageId, emoji })
      return { messageId, emoji }
    },
    onSuccess: (_, { messageId }) => {
      // Find which thread this message belongs to and invalidate it
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })

  return {
    createThread,
    sendMessage,
    markAsRead,
    addReaction,
    removeReaction
  }
}

// Utility functions
export const getThreadPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'normal': return 'bg-blue-500'
    case 'low': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

export const getThreadPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'urgent': return 'Urgent'
    case 'high': return 'High'
    case 'normal': return 'Normal'
    case 'low': return 'Low'
    default: return priority
  }
}

export const formatMessageTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm')
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE HH:mm')
    } else {
      return format(date, 'MMM d')
    }
  } catch (error) {
    return 'Unknown'
  }
}