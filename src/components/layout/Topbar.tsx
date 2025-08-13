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
  ChevronDown,
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
  BarChart3,
  Shield,
  Database,
  Scale,
  CreditCard,
  DollarSign,
  UserCheck,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  HardDrive,
  Receipt
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from '@/lib/supabaseClient'

// Organized navigation structure with dropdowns
const navigationGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    type: 'single'
  },
  {
    id: 'claims-projects',
    label: 'Claims & Projects',
    icon: FolderOpen,
    type: 'dropdown',
    items: [
      { href: '/claims', label: 'Claims', icon: FileText, description: 'Manage insurance claims' },
      { href: '/projects', label: 'Projects', icon: FolderOpen, description: 'View all projects' },
      { href: '/appointments', label: 'Appointments', icon: Calendar, description: 'Schedule and manage appointments' },
    ]
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: PoundSterling,
    type: 'dropdown',
    items: [
      { href: '/estimates', label: 'Estimates', icon: Receipt, description: 'Project estimates and quotes' },
      { href: '/financials', label: 'Financials', icon: PoundSterling, description: 'Financial overview and reports' },
      { href: '/client-money', label: 'Client Money', icon: CreditCard, description: 'Client funds management' },
      { href: '/approvals', label: 'Approvals', icon: UserCheck, description: 'Financial approvals workflow' },
    ]
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Building,
    type: 'dropdown',
    items: [
      { href: '/admin/organizations', label: 'Organizations', icon: Building2, description: 'Manage organizations' },
      { href: '/admin/users', label: 'User Management', icon: Users, description: 'Manage system users' },
      { href: '/admin/policyholders', label: 'Customers/Policyholders', icon: Users, description: 'Customer database' },
    ]
  },
  {
    id: 'compliance-security',
    label: 'Compliance & Security',
    icon: Shield,
    type: 'dropdown',
    items: [
      { href: '/compliance', label: 'Compliance', icon: AlertTriangle, description: 'Compliance management' },
      { href: '/security', label: 'Security Center', icon: ShieldCheck, description: 'Security monitoring' },
      { href: '/compliance-dashboard', label: 'Compliance Reports', icon: Scale, description: 'Compliance reporting' },
      { href: '/backup-recovery', label: 'Backup & Recovery', icon: HardDrive, description: 'Data backup and recovery' },
    ]
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    href: '/reports',
    icon: BarChart3,
    type: 'single'
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    type: 'single'
  }
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
      return 'text-muted-foreground'
    default:
      return 'text-muted-foreground'
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
      
      // Find the link in the new navigation structure
      let navLink = null
      
      // Check single items first
      const singleItem = navigationGroups.find(group => 
        group.type === 'single' && group.href === currentPath
      )
      
      if (singleItem) {
        navLink = { label: singleItem.label, href: singleItem.href }
      } else {
        // Check dropdown items
        for (const group of navigationGroups) {
          if (group.type === 'dropdown' && group.items) {
            const foundItem = group.items.find(item => item.href === currentPath)
            if (foundItem) {
              navLink = { label: foundItem.label, href: foundItem.href }
              break
            }
          }
        }
      }
      
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
      <div className="flex h-20 items-center justify-between border-b px-6 sm:px-8 glass sticky top-0 z-50 shadow-md backdrop-blur-md bg-background/80">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted/60 transition-all duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
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
          <nav className="hidden lg:flex gap-1 ml-8" role="navigation" aria-label="Main navigation">
            {navigationGroups.map((group) => {
              const Icon = group.icon
              
              if (group.type === 'single') {
                const isActive = pathname === group.href || (group.href !== '/dashboard' && pathname.startsWith(group.href!))
                const taskNotifications = notifications.filter(n => n.type === 'task' && n.priority === 'high').length
                const financialNotifications = criticalCount
                
                return (
                  <Link
                    key={group.id}
                    href={group.href!}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative group hover:scale-[1.02]',
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-md border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="whitespace-nowrap">{group.label}</span>
                    
                    {/* Notification badges for specific pages */}
                    {group.href === '/reports' && taskNotifications > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-5 ml-1">
                        {taskNotifications}
                      </Badge>
                    )}
                  </Link>
                )
              } else {
                // Dropdown navigation
                const isGroupActive = group.items?.some(item => 
                  pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                )
                const criticalNotifications = notifications.filter(n => 
                  n.priority === 'critical' && group.items?.some(item => 
                    (item.href.includes('financial') || item.href.includes('estimates') || item.href.includes('approvals')) && 
                    (n.type === 'invoice' || n.type === 'quote')
                  )
                ).length
                
                return (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] h-auto',
                          isGroupActive
                            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-md border border-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm'
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="whitespace-nowrap">{group.label}</span>
                        <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        
                        {/* Critical notification badge for financial group */}
                        {group.id === 'financial' && criticalNotifications > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 min-w-5 ml-1">
                            {criticalNotifications}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-64 p-2 shadow-xl border-0 bg-background/95 backdrop-blur-md"
                      sideOffset={8}
                    >
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                        {group.label}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-2" />
                      {group.items?.map((item) => {
                        const ItemIcon = item.icon
                        const isItemActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        
                        return (
                          <DropdownMenuItem key={item.href} asChild className="p-0">
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-start gap-3 px-3 py-3 text-sm rounded-lg transition-all duration-200 cursor-pointer group w-full',
                                isItemActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'hover:bg-muted/50 hover:text-foreground'
                              )}
                            >
                              <ItemIcon className={cn(
                                "h-4 w-4 mt-0.5 transition-colors",
                                isItemActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className={cn(
                                  "font-medium truncate",
                                  isItemActive ? 'text-primary' : 'text-foreground'
                                )}>
                                  {item.label}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }
            })}
          </nav>
        </div>

        {/* Center - Enhanced Search */}
        <div className="hidden lg:flex flex-1 max-w-lg mx-12">
          <div className="relative w-full group">
            <div className={cn(
              "absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300",
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
                "pl-11 pr-16 h-12 rounded-2xl border-0 bg-muted/40 backdrop-blur-sm transition-all duration-300 text-sm",
                "hover:bg-muted/60 focus:bg-background/90 focus:ring-2 focus:ring-primary/30 focus:shadow-lg",
                "placeholder:text-muted-foreground/70 font-medium",
                searchFocused && "scale-[1.02] shadow-xl"
              )}
            />
            <kbd className={cn(
              "absolute right-4 top-1/2 transform -translate-y-1/2 px-2.5 py-1.5 text-xs rounded-lg border bg-muted/60 text-muted-foreground font-mono",
              "transition-all duration-300 hidden sm:inline-flex items-center gap-1 shadow-sm",
              searchFocused && "opacity-0 scale-95"
            )}>
              <span>⌘</span>
              <span>K</span>
            </kbd>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted/60 transition-all duration-200"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Enhanced Notification Center */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl hover:bg-muted/60 transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>

          {/* Theme Toggle */}
          <div className="border-l border-muted-foreground/20 pl-3">
            <ThemeToggle />
          </div>

          {/* User Menu */}
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
        <div className="lg:hidden border-b bg-background/95 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
          <nav className="px-6 py-4 space-y-2 max-h-[70vh] overflow-y-auto" role="navigation" aria-label="Mobile main navigation">
            {navigationGroups.map((group) => {
              if (group.type === 'single') {
                const Icon = group.icon
                const isActive = pathname === group.href || (group.href !== '/dashboard' && pathname.startsWith(group.href!))
                
                return (
                  <Link
                    key={group.id}
                    href={group.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>{group.label}</span>
                  </Link>
                )
              } else {
                // Render dropdown items as individual links on mobile
                return (
                  <div key={group.id} className="space-y-1">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider border-b border-muted/30">
                      {group.label}
                    </div>
                    {group.items?.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-4 px-6 py-3 text-sm rounded-xl transition-all duration-200 ml-2',
                            isItemActive
                              ? 'bg-primary/10 text-primary font-medium shadow-sm border border-primary/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          )}
                          aria-current={isItemActive ? 'page' : undefined}
                        >
                          <ItemIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.label}</div>
                            <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )
              }
            })}
            
            {/* Mobile Search */}
            <div className="pt-4 border-t border-muted/30">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder="Search projects, tasks, invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e)
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="pl-11 pr-4 h-12 rounded-xl border-0 bg-muted/40 placeholder:text-muted-foreground/70"
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