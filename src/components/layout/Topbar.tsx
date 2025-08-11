'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { UserMenu } from '@/components/shared/UserMenu'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
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
  Users,
  Calendar,
  BarChart3
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

// Main navigation links for overview pages
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/claims', label: 'Claims', icon: FileText },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/estimates', label: 'Estimates', icon: PoundSterling },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/compliance', label: 'Compliance', icon: AlertTriangle },
  { href: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
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
      <div className="flex h-16 items-center justify-between border-b px-4 sm:px-6 glass sticky top-0 z-50 shadow-sm">
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
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-gradient hover:scale-105 transition-smooth group"
          >
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all">
              <Building className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:inline">Buildology</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-1 ml-6" role="navigation" aria-label="Main navigation">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
              const taskNotifications = notifications.filter(n => n.type === 'task' && n.priority === 'high').length
              const financialNotifications = criticalCount
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-smooth relative group',
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`${link.label}${
                    link.href === '/tasks' && taskNotifications > 0 ? `, ${taskNotifications} high priority tasks` :
                    link.href === '/financials' && financialNotifications > 0 ? `, ${financialNotifications} critical financial items` :
                    ''
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                  
                  {/* Add badge for critical items on relevant pages */}
                  {link.href === '/tasks' && taskNotifications > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4" aria-label={`${taskNotifications} high priority tasks`}>
                      {taskNotifications}
                    </Badge>
                  )}
                  {link.href === '/financials' && financialNotifications > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4" aria-label={`${financialNotifications} critical financial items`}>
                      {financialNotifications}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Center - Enhanced Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <div className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )}>
              <Search className="h-4 w-4" />
            </div>
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
                "pl-10 pr-4 h-10 rounded-xl border-0 bg-muted/50 backdrop-blur-sm transition-all duration-200",
                "hover:bg-muted/80 focus:bg-background/80 focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/60"
              )}
            />
            <kbd className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs rounded border bg-muted/50 text-muted-foreground",
              "transition-opacity duration-200 hidden sm:inline-flex",
              searchFocused && "opacity-0"
            )}>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Enhanced Notification Center */}
          <NotificationCenter />

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Enhanced Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="border-b px-4 sm:px-6 py-3 bg-gradient-to-r from-muted/20 to-muted/10 backdrop-blur-sm">
          <nav className="flex items-center space-x-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/60 mx-1" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground px-2 py-1 rounded-lg bg-primary/10 text-primary">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-smooth px-2 py-1 rounded-lg hover:bg-muted/50"
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
        <div className="md:hidden border-b bg-background" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
          <nav className="px-4 py-2 space-y-1" role="navigation" aria-label="Mobile main navigation">
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
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`${link.label}${criticalNotifications > 0 ? `, ${criticalNotifications} critical items` : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.label}
                  </div>
                  {criticalNotifications > 0 && (
                    <Badge variant="destructive" className="text-xs" aria-label={`${criticalNotifications} critical items`}>
                      {criticalNotifications}
                    </Badge>
                  )}
                </Link>
              )
            })}
            
            {/* Mobile Search */}
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Label htmlFor="mobile-search" className="sr-only">Search</Label>
                <Input
                  id="mobile-search"
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
                  aria-describedby="mobile-search-description"
                />
                <span id="mobile-search-description" className="sr-only">
                  Search projects, tasks, invoices, and documents
                </span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}