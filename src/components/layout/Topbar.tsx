'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  Building
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

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

// Mock notifications - replace with real data
const mockNotifications = [
  { id: 1, title: 'New task assigned', message: 'You have been assigned to "Install roofing"', time: '5m ago', unread: true },
  { id: 2, title: 'Project update', message: 'Kitchen renovation is 75% complete', time: '1h ago', unread: true },
  { id: 3, title: 'Message received', message: 'Client responded about material choices', time: '2h ago', unread: false },
]

export function Topbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const unreadCount = mockNotifications.filter(n => n.unread).length

  // Fixed breadcrumbs generation to avoid duplicates
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    
    // Only add Home breadcrumb if we're not on the dashboard page
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
        const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
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
      // Implement search functionality
      console.log('Searching for:', searchQuery)
      // You could navigate to a search results page or open a search modal
    }
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
              const isActive = pathname.startsWith(link.href)
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Center - Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, tasks, or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "pl-10 pr-4 transition-all duration-200",
                searchFocused && "ring-2 ring-primary/20"
              )}
            />
          </form>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <h4 className="font-semibold">Notifications</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs">
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              {mockNotifications.length > 0 ? (
                mockNotifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-sm">{notification.title}</h5>
                          {notification.unread && (
                            <div className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <span className="text-xs text-muted-foreground mt-1">{notification.time}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">No notifications</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/notifications" className="w-full text-center text-sm">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Breadcrumbs - Fixed with unique keys */}
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

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background">
          <nav className="px-4 py-2 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname.startsWith(link.href)
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
            
            {/* Mobile Search */}
            <div className="pt-2">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}