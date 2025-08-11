'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Settings,
  Filter,
  Archive,
  Trash2,
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Zap,
  Activity,
  Eye,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

// Mock notifications data
const mockNotifications = [
  {
    id: 'notif-001',
    type: 'claim_update',
    title: 'Claim Status Updated',
    message: 'Claim CLM-2024-001234 has been approved for processing',
    timestamp: '2024-01-18T14:30:00Z',
    read: false,
    priority: 'high',
    category: 'claims',
    actionUrl: '/claims/CLM-2024-001234',
    actor: { name: 'Sarah Johnson', avatar: 'SJ' },
    metadata: { claimId: 'CLM-2024-001234', amount: '£15,750' }
  },
  {
    id: 'notif-002',
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: 'You have been assigned to "Site Inspection - Wilson Property"',
    timestamp: '2024-01-18T13:45:00Z',
    read: false,
    priority: 'medium',
    category: 'tasks',
    actionUrl: '/tasks/TSK-001',
    actor: { name: 'Michael Chen', avatar: 'MC' },
    metadata: { taskId: 'TSK-001', dueDate: '2024-01-20T17:00:00Z' }
  },
  {
    id: 'notif-003',
    type: 'message_received',
    title: 'New Message',
    message: 'Emma Thompson sent you a message regarding the roof repairs estimate',
    timestamp: '2024-01-18T12:15:00Z',
    read: true,
    priority: 'low',
    category: 'messages',
    actionUrl: '/messages/thread-123',
    actor: { name: 'Emma Thompson', avatar: 'ET' },
    metadata: { messageId: 'MSG-456' }
  },
  {
    id: 'notif-004',
    type: 'estimate_approved',
    title: 'Estimate Approved',
    message: 'Your estimate EST-2024-0001 for kitchen restoration has been approved',
    timestamp: '2024-01-18T11:30:00Z',
    read: true,
    priority: 'high',
    category: 'estimates',
    actionUrl: '/estimates/EST-2024-0001',
    actor: { name: 'David Wilson', avatar: 'DW' },
    metadata: { estimateId: 'EST-2024-0001', amount: '£15,750' }
  },
  {
    id: 'notif-005',
    type: 'deadline_reminder',
    title: 'Deadline Reminder',
    message: 'SLA deadline for claim CLM-2024-001235 is approaching (due tomorrow)',
    timestamp: '2024-01-18T10:00:00Z',
    read: false,
    priority: 'urgent',
    category: 'deadlines',
    actionUrl: '/claims/CLM-2024-001235',
    metadata: { claimId: 'CLM-2024-001235', deadline: '2024-01-19T17:00:00Z' }
  },
  {
    id: 'notif-006',
    type: 'system_update',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight from 11 PM to 2 AM GMT',
    timestamp: '2024-01-18T09:00:00Z',
    read: true,
    priority: 'low',
    category: 'system',
    metadata: { maintenanceWindow: '2024-01-18T23:00:00Z - 2024-01-19T02:00:00Z' }
  }
]

// Mock activity feed data
const mockActivities = [
  {
    id: 'activity-001',
    type: 'claim_created',
    title: 'New claim created',
    description: 'Sarah Johnson created claim CLM-2024-001237 for water damage',
    timestamp: '2024-01-18T15:20:00Z',
    actor: { name: 'Sarah Johnson', avatar: 'SJ' },
    target: { type: 'claim', id: 'CLM-2024-001237', name: 'Water Damage - Basement' },
    metadata: { amount: '£8,500', location: '45 High Street, London' }
  },
  {
    id: 'activity-002',
    type: 'estimate_updated',
    title: 'Estimate revised',
    description: 'Michael Chen updated estimate EST-2024-0002 with additional line items',
    timestamp: '2024-01-18T14:45:00Z',
    actor: { name: 'Michael Chen', avatar: 'MC' },
    target: { type: 'estimate', id: 'EST-2024-0002', name: 'Storm Damage Roof Repairs' },
    metadata: { previousAmount: '£8,900', newAmount: '£9,200' }
  },
  {
    id: 'activity-003',
    type: 'task_completed',
    title: 'Task completed',
    description: 'Emma Thompson completed site inspection for Wilson Property',
    timestamp: '2024-01-18T13:30:00Z',
    actor: { name: 'Emma Thompson', avatar: 'ET' },
    target: { type: 'task', id: 'TSK-002', name: 'Site Inspection - Wilson Property' },
    metadata: { duration: '2.5 hours', photos: 15, notes: 'Extensive roof damage confirmed' }
  },
  {
    id: 'activity-004',
    type: 'document_uploaded',
    title: 'Documents uploaded',
    description: 'James Wright uploaded 8 photos to Johnson Residence project',
    timestamp: '2024-01-18T12:00:00Z',
    actor: { name: 'James Wright', avatar: 'JW' },
    target: { type: 'project', id: 'PRJ-001', name: 'Johnson Residence - Water Damage' },
    metadata: { fileCount: 8, fileTypes: ['JPG', 'PDF'], totalSize: '12.4 MB' }
  }
]

const notificationTypeConfig = {
  claim_update: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  task_assigned: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  message_received: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  estimate_approved: { icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  deadline_reminder: { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  system_update: { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' }
}

const priorityConfig = {
  urgent: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  medium: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  low: { color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [activities] = useState(mockActivities)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [notificationSettings, setNotificationSettings] = useState({
    claims: true,
    tasks: true,
    messages: true,
    estimates: true,
    deadlines: true,
    system: false
  })

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') return notifications
    if (selectedFilter === 'unread') return notifications.filter(n => !n.read)
    return notifications.filter(n => n.category === selectedFilter)
  }, [notifications, selectedFilter])

  // Count unread notifications
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  )

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const NotificationItem = ({ notification }: { notification: typeof mockNotifications[0] }) => {
    const typeConfig = notificationTypeConfig[notification.type as keyof typeof notificationTypeConfig]
    const priorityStyle = priorityConfig[notification.priority as keyof typeof priorityConfig]
    const Icon = typeConfig?.icon || Info

    return (
      <div 
        className={cn(
          'p-4 border-l-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer',
          !notification.read && 'bg-blue-50/50',
          priorityStyle.borderColor
        )}
        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-full', typeConfig?.bgColor)}>
            <Icon className={cn('w-4 h-4', typeConfig?.color)} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  !notification.read && 'font-semibold'
                )}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!notification.read && (
                      <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                        <Check className="w-4 h-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDeleteNotification(notification.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notification.actor && (
                  <div className="flex items-center gap-1">
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-xs">{notification.actor.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{notification.actor.name}</span>
                  </div>
                )}
                <Badge variant="outline" className="text-xs">
                  {notification.category}
                </Badge>
              </div>
              
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.timestamp))} ago
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ActivityItem = ({ activity }: { activity: typeof mockActivities[0] }) => {
    return (
      <div className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs">{activity.actor.avatar}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm">
              <span className="font-medium">{activity.actor.name}</span>
              <span className="text-muted-foreground ml-1">{activity.title}</span>
            </p>
            <Badge variant="outline" className="text-xs">
              {activity.target.type}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">{activity.description}</p>
          
          {activity.metadata && (
            <div className="text-xs text-muted-foreground">
              {activity.type === 'claim_created' && (
                <span>Amount: {activity.metadata.amount} • Location: {activity.metadata.location}</span>
              )}
              {activity.type === 'estimate_updated' && (
                <span>Updated from {activity.metadata.previousAmount} to {activity.metadata.newAmount}</span>
              )}
              {activity.type === 'task_completed' && (
                <span>Duration: {activity.metadata.duration} • Photos: {activity.metadata.photos}</span>
              )}
              {activity.type === 'document_uploaded' && (
                <span>{activity.metadata.fileCount} files • {activity.metadata.totalSize}</span>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.timestamp))} ago
          </p>
        </div>
      </div>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[480px] p-0" side="right">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>
                  Stay updated with the latest activities
                </SheetDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="notifications" className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notifications">
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity">Activity Feed</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notifications" className="flex-1 flex flex-col mt-0">
              {/* Notification Filters */}
              <div className="px-6 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {['all', 'unread', 'claims', 'tasks', 'messages', 'estimates'].map((filter) => (
                    <Button
                      key={filter}
                      variant={selectedFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter(filter)}
                      className="flex-shrink-0 text-xs"
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      {filter === 'unread' && unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">No notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up! Check back later for updates.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 flex flex-col mt-0">
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}