import { supabase } from '@/lib/supabaseClient'
import { showInfoToast, showSuccessToast, showWarningToast, showErrorToast } from '@/lib/error-handling/errorHandler'

export type NotificationType = 
  | 'claim_status_changed'
  | 'quote_approved'
  | 'quote_rejected' 
  | 'task_assigned'
  | 'task_completed'
  | 'appointment_scheduled'
  | 'appointment_reminder'
  | 'project_status_changed'
  | 'message_received'
  | 'approval_required'
  | 'deadline_approaching'
  | 'system_alert'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface NotificationData {
  id: string
  user_id: string
  notification_type: string
  title: string
  message: string
  action_url?: string
  priority: NotificationPriority
  read: boolean
  read_at?: string
  expires_at?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface NotificationTemplate {
  title: string
  message: string
  priority: NotificationPriority
  action_url?: string
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, (data: any) => NotificationTemplate> = {
  claim_status_changed: (data) => ({
    title: 'Claim Status Updated',
    message: `Claim ${data.claim_number} status changed to ${data.new_status}`,
    priority: data.new_status === 'approved' ? 'high' : 'medium',
    action_url: `/claims/${data.claim_id}`
  }),
  
  quote_approved: (data) => ({
    title: 'Quote Approved',
    message: `Quote ${data.quote_number} has been approved for £${data.amount}`,
    priority: 'high',
    action_url: `/quotes/${data.quote_id}`
  }),
  
  quote_rejected: (data) => ({
    title: 'Quote Rejected',
    message: `Quote ${data.quote_number} has been rejected: ${data.reason}`,
    priority: 'medium',
    action_url: `/quotes/${data.quote_id}`
  }),
  
  task_assigned: (data) => ({
    title: 'New Task Assigned',
    message: `You have been assigned: ${data.task_title}`,
    priority: data.priority === 'urgent' ? 'urgent' : 'medium',
    action_url: `/tasks/${data.task_id}`
  }),
  
  task_completed: (data) => ({
    title: 'Task Completed',
    message: `Task "${data.task_title}" has been marked as complete`,
    priority: 'low',
    action_url: `/tasks/${data.task_id}`
  }),
  
  appointment_scheduled: (data) => ({
    title: 'New Appointment Scheduled',
    message: `Appointment: ${data.title} on ${data.date}`,
    priority: 'medium',
    action_url: `/appointments/${data.appointment_id}`
  }),
  
  appointment_reminder: (data) => ({
    title: 'Upcoming Appointment',
    message: `Reminder: ${data.title} in ${data.time_until}`,
    priority: 'high',
    action_url: `/appointments/${data.appointment_id}`
  }),
  
  project_status_changed: (data) => ({
    title: 'Project Status Updated',
    message: `Project "${data.project_name}" status changed to ${data.new_status}`,
    priority: 'medium',
    action_url: `/projects/${data.project_id}`
  }),
  
  message_received: (data) => ({
    title: 'New Message',
    message: `New message from ${data.sender_name} in "${data.thread_title}"`,
    priority: 'medium',
    action_url: `/messages/${data.thread_id}`
  }),
  
  approval_required: (data) => ({
    title: 'Approval Required',
    message: `${data.item_type} requires your approval: ${data.item_title}`,
    priority: 'high',
    action_url: data.action_url
  }),
  
  deadline_approaching: (data) => ({
    title: 'Deadline Approaching',
    message: `${data.item_type} "${data.item_title}" is due ${data.time_until}`,
    priority: 'urgent',
    action_url: data.action_url
  }),
  
  system_alert: (data) => ({
    title: data.title || 'System Alert',
    message: data.message,
    priority: data.priority || 'medium'
  })
}

class NotificationSystem {
  private subscription: any = null
  private userId: string | null = null

  // Initialize the notification system
  async initialize(userId: string) {
    this.userId = userId
    await this.subscribeToNotifications()
    await this.schedulePeriodicChecks()
  }

  // Subscribe to real-time notifications
  private async subscribeToNotifications() {
    if (!this.userId) return

    this.subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`
        },
        (payload) => {
          this.handleNewNotification(payload.new as NotificationData)
        }
      )
      .subscribe()
  }

  // Handle new notification
  private handleNewNotification(notification: NotificationData) {
    // Show toast based on priority
    switch (notification.priority) {
      case 'urgent':
        showErrorToast(notification.message, notification.title)
        break
      case 'high':
        showWarningToast(notification.message, notification.title)
        break
      case 'medium':
        showInfoToast(notification.message, notification.title)
        break
      case 'low':
        showSuccessToast(notification.message, notification.title)
        break
    }

    // Play notification sound (optional)
    this.playNotificationSound(notification.priority)

    // Show browser notification if permission granted
    this.showBrowserNotification(notification)
  }

  // Create a new notification
  async createNotification(
    type: NotificationType,
    userId: string,
    data: any,
    options?: {
      metadata?: Record<string, any>
      expiresAt?: Date
    }
  ) {
    try {
      const template = NOTIFICATION_TEMPLATES[type](data)
      
      const notification = {
        notification_type: type,
        title: template.title,
        message: template.message,
        priority: template.priority,
        user_id: userId,
        action_url: template.action_url,
        read: false,
        metadata: options?.metadata,
        expires_at: options?.expiresAt?.toISOString()
      }

      const { error } = await supabase
        .from('notifications')
        .insert([notification])

      if (error) {
        console.error('Error creating notification:', error)
      }
    } catch (error) {
      console.error('Error in createNotification:', error)
    }
  }

  // Fetch notifications for a user
  async getNotifications(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data as NotificationData[]
    } catch (error) {
      console.error('Error in getNotifications:', error)
      return []
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getUnreadCount:', error)
      return 0
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
      }
    } catch (error) {
      console.error('Error in markAsRead:', error)
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error marking all as read:', error)
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error)
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error)
    }
  }

  // Request browser notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  // Show browser notification
  private showBrowserNotification(notification: NotificationData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      })

      // Handle click to navigate
      browserNotification.onclick = () => {
        window.focus()
        if (notification.action_url) {
          window.location.href = notification.action_url
        }
        browserNotification.close()
      }

      // Auto close after 5 seconds (except urgent)
      if (notification.priority !== 'urgent') {
        setTimeout(() => browserNotification.close(), 5000)
      }
    }
  }

  // Play notification sound
  private playNotificationSound(priority: NotificationPriority) {
    // Create audio context for notification sounds
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Different frequencies for different priorities
        const frequencies = {
          low: 400,
          medium: 600,
          high: 800,
          urgent: 1000
        }

        oscillator.frequency.value = frequencies[priority]
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      } catch (error) {
        // Silently fail if audio is not supported
      }
    }
  }

  // Schedule periodic checks for deadlines and appointments
  private async schedulePeriodicChecks() {
    // Check every 5 minutes
    setInterval(async () => {
      if (this.userId) {
        await this.checkDeadlines()
        await this.checkAppointmentReminders()
      }
    }, 5 * 60 * 1000)

    // Initial check
    if (this.userId) {
      await this.checkDeadlines()
      await this.checkAppointmentReminders()
    }
  }

  // Check for approaching deadlines
  private async checkDeadlines() {
    if (!this.userId) return

    try {
      // Check claims approaching SLA deadlines
      // Check tasks approaching due dates
      // Check quotes approaching expiry
      // This would require additional database queries based on your specific requirements
    } catch (error) {
      console.error('Error checking deadlines:', error)
    }
  }

  // Check for appointment reminders
  private async checkAppointmentReminders() {
    if (!this.userId) return

    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .contains('attendees', [this.userId])
        .eq('status', 'scheduled')
        .gte('scheduled_start', new Date().toISOString())
        .lte('scheduled_start', tomorrow.toISOString())

      appointments?.forEach(appointment => {
        this.createNotification('appointment_reminder', this.userId!, {
          title: appointment.title,
          date: new Date(appointment.scheduled_start).toLocaleDateString(),
          time_until: '24 hours',
          appointment_id: appointment.id
        })
      })
    } catch (error) {
      console.error('Error checking appointment reminders:', error)
    }
  }

  // Cleanup when component unmounts
  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    this.userId = null
  }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem()

// Helper functions for common notification scenarios
export const notifyClaimStatusChange = (claimId: string, claimNumber: string, oldStatus: string, newStatus: string, userId: string) => {
  notificationSystem.createNotification('claim_status_changed', userId, {
    claim_id: claimId,
    claim_number: claimNumber,
    old_status: oldStatus,
    new_status: newStatus
  }, {
    relatedEntityType: 'claim',
    relatedEntityId: claimId
  })
}

export const notifyQuoteApproval = (quoteId: string, quoteNumber: string, amount: number, userId: string) => {
  notificationSystem.createNotification('quote_approved', userId, {
    quote_id: quoteId,
    quote_number: quoteNumber,
    amount
  }, {
    relatedEntityType: 'quote',
    relatedEntityId: quoteId
  })
}

export const notifyTaskAssignment = (taskId: string, taskTitle: string, priority: string, userId: string) => {
  notificationSystem.createNotification('task_assigned', userId, {
    task_id: taskId,
    task_title: taskTitle,
    priority
  }, {
    relatedEntityType: 'task',
    relatedEntityId: taskId
  })
}

export const notifyNewMessage = (threadId: string, threadTitle: string, senderName: string, userId: string) => {
  notificationSystem.createNotification('message_received', userId, {
    thread_id: threadId,
    thread_title: threadTitle,
    sender_name: senderName
  }, {
    relatedEntityType: 'message_thread',
    relatedEntityId: threadId
  })
}