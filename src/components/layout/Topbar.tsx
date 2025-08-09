'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { UserMenu } from '@/components/shared/UserMenu'
import { cn } from '@/lib/utils'
import { 
  Bell, 
  Search, 
  Menu, 
  X, 
  ChevronRight,
  Home,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Settings,
  Building,
  PoundSterling,
  AlertTriangle,
  Clock,
  FileText,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from '@/lib/supabaseClient'

// Enhanced navigation links with Financials
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/financials', label: 'Financials', icon: PoundSterling },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

// Types for real notifications
interface RealNotification {
  id: string
  type: 'task' | 'invoice' | 'message' | 'project' | 'quote' | 'deadline'
  title: string
  message: string
  time: string
  unread: boolean
  priority: 'low' | 'normal' | 'high' | 'critical'
  project_id?: string
  link?: string
}

// API function to fetch real notifications
const fetchNotifications = async (): Promise<RealNotification[]> => {
  try {
    const notifications: RealNotification[] = []

    // Fetch overdue tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select(`
        id, 
        title, 
        due_date, 
        project_id,
        projects(name)
      `)
      .neq('status', 'done')
      .lt('due_date', new Date().toISOString())
      .limit(5)

    overdueTasks?.forEach(task => {
      notifications.push({
        id: `task-${task.id}`,
        type: 'task',
        title: 'Task Overdue',
        message: `"${task.title}" was due ${new Date(task.due_date).toLocaleDateString()}`,
        time: getRelativeTime(task.due_date),
        unread: true,
        priority: 'high',
        project_id: task.project_id,
        link: `/projects/${task.project_id}/tasks`
      })
    })

    // Fetch overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select(`
        id, 
        invoice_number, 
        due_date, 
        total_amount,
        project_id
      `)
      .in('status', ['sent', 'overdue'])
      .lt('due_date', new Date().toISOString())
      .limit(3)

    overdueInvoices?.forEach(invoice => {
      notifications.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: 'Invoice Overdue',
        message: `Invoice ${invoice.invoice_number} (£${invoice.total_amount.toLocaleString()}) is overdue`,
        time: getRelativeTime(invoice.due_date),
        unread: true,
        priority: 'critical',
        project_id: invoice.project_id,
        link: `/projects/${invoice.project_id}/financials`
      })
    })

    // Fetch pending quotes
    const { data: pendingQuotes } = await supabase
      .from('quotes')
      .select(`
        id, 
        quote_number, 
        total_amount,
        project_id,
        submitted_at
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(3)

    pendingQuotes?.forEach(quote => {
      notifications.push({
        id: `quote-${quote.id}`,
        type: 'quote',
        title: 'Quote Awaiting Approval',
        message: `Quote ${quote.quote_number} (£${quote.total_amount.toLocaleString()}) needs review`,
        time: getRelativeTime(quote.submitted_at),
        unread: true,
        priority: 'normal',
        project_id: quote.project_id,
        link: `/projects/${quote.project_id}/financials`
      })
    })

    // Fetch upcoming deadlines (next 3 days)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const { data: upcomingTasks } = await supabase
      .from('tasks')
      .select(`
        id, 
        title, 
        due_date, 
        project_id,
        projects(name)
      `)
      .neq('status', 'done')
      .gte('due_date', new Date().toISOString())
      .lte('due_date', threeDaysFromNow.toISOString())
      .limit(3)

    upcomingTasks?.forEach(task => {
      notifications.push({
        id: `deadline-${task.id}`,
        type: 'deadline',
        title: 'Upcoming Deadline',
        message: `"${task.title}" is due ${new Date(task.due_date).toLocaleDateString()}`,
        time: getRelativeTime(task.due_date),
        unread: true,
        priority: 'normal',
        project_id: task.project_id,
        link: `/projects/${task.project_id}/tasks`
      })
    })

    // Fetch recent messages (if we have unread status)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select(`
        id, 
        content, 
        created_at,
        sender_id,
        thread_id,
        user_profiles!messages_sender_id_fkey(first_name, surname)
      `)
      .order('created_at', { ascending: false })
      .limit(3)

    recentMessages?.forEach(message => {
      const senderName = `${message.user_profiles?.first_name} ${message.user_profiles?.surname}`
      notifications.push({
        id: `message-${message.id}`,
        type: 'message',
        title: 'New Message',
        message: `${senderName}: ${message.content.substring(0, 50)}...`,
        time: getRelativeTime(message.created_at),
        unread: true,
        priority: 'low',
        link: `/messages/${message.thread_id}`
      })
    })

    // Sort by priority and time
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
    return notifications
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 10) // Limit to 10 most important

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Helper function to get relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Get notification icon
const getNotificationIcon = (type: RealNotification['type']) => {
  switch (type) {
    case 'task':
      return <CheckSquare className="w-4 h-4" />
    case 'invoice':
      return <PoundSterling className="w-4 h-4" />
    case 'message':
      return <MessageSquare className="w-4 h-4" />
    case 'project':
      return <FolderOpen className="w-4 h-4" />
    case 'quote':
      return <FileText className="w-4 h-4" />
    case 'deadline':
      return <Clock className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
  }
}

// Get notification color
const getNotificationColor = (priority: RealNotification['priority']) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600'
    case 'high':
      return 'text-orange-600'
    case 'normal':
      return 'text-blue-600'
    case 'low':
      return 'text-gray-600'
    default:
      return 'text-gray-600'
  }
}

export function Topbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  // Fetch real notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000 // Auto-refresh every 2 minutes
  })

  const unreadCount = notifications.filter(n => n.unread).length
  const criticalCount = notifications.filter(n => n.priority === 'critical').length

  // Enhanced breadcrumbs generation
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = []
    
    // Always start with Home unless we're already on dashboard root
    if (pathname !== '/dashboard') {
      breadcrumbs.push({ label: 'Home', href: '/dashboard', id: 'home' })
    }
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const navLink = navLinks.find(link => link.href === currentPath)
      
      if (navLink) {
        breadcrumbs.push({
          label: navLink.label,
          href: currentPath,
          id: `nav-${segment}-${index}`
        })
      } else {
        // Handle dynamic routes or specific pages
        let formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
        
        // Special handling for common routes
        if (segment === 'financials' && segments[index - 1]) {
          formattedLabel = 'Financials'
        }
        if (segment === 'tasks' && segments[index - 1]) {
          formattedLabel = 'Tasks'
        }
        if (segment === 'messages' && segments[index - 1]) {
          formattedLabel = 'Messages'
        }
        
        breadcrumbs.push({
          label: formattedLabel,
          href: currentPath,
          id: `segment-${segment}-${index}`
        })
      }
    })
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Enhanced search - could search projects, tasks, documents, etc.
      console.log('Searching for:', searchQuery)
      // TODO: Implement global search
    }
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    // TODO: Implement mark as read functionality
    console.log('Mark all notifications as read')
  }

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b px-4 sm:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sticky top-0 z-50">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity"
          >
            <Building className="h-6 w-6" />
            <span className="hidden sm:inline">Buildology</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-1 ml-6">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all relative',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  
                  {/* Add badge for critical items on relevant pages */}
                  {link.href === '/tasks' && notifications.filter(n => n.type === 'task' && n.priority === 'high').length > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4">
                      {notifications.filter(n => n.type === 'task' && n.priority === 'high').length}
                    </Badge>
                  )}
                  {link.href === '/financials' && criticalCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4">
                      {criticalCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Center - Enhanced Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, tasks, invoices, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e)
                }
              }}
              className={cn(
                "pl-10 pr-4 transition-all duration-200",
                searchFocused && "ring-2 ring-primary/20"
              )}
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Enhanced Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant={criticalCount > 0 ? "destructive" : "default"}
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <div className="flex items-center justify-between p-3">
                <h4 className="font-semibold">Notifications</h4>
                <div className="flex items-center gap-2">
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {criticalCount} critical
                    </Badge>
                  )}
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={markAllAsRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm">Loading notifications...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50" asChild>
                      <Link href={notification.link || '#'}>
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn("p-1 rounded", getNotificationColor(notification.priority), "bg-current/10")}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-sm truncate">{notification.title}</h5>
                                {notification.unread && (
                                  <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                                {notification.priority === 'critical' && (
                                  <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">{notification.time}</span>
                                <Badge variant="outline" className="text-xs">
                                  {notification.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                    <p className="text-xs">You're all caught up!</p>
                  </div>
                )}
              </div>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="w-full text-center text-sm font-medium">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Enhanced Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="border-b px-4 sm:px-6 py-2 bg-muted/30">
          <nav className="flex items-center space-x-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Enhanced Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background">
          <nav className="px-4 py-2 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
              const criticalNotifications = notifications.filter(n => 
                (link.href === '/tasks' && n.type === 'task' && n.priority === 'high') ||
                (link.href === '/financials' && n.priority === 'critical')
              ).length
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </div>
                  {criticalNotifications > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {criticalNotifications}
                    </Badge>
                  )}
                </Link>
              )
            })}
            
            {/* Mobile Search */}
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e)
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}