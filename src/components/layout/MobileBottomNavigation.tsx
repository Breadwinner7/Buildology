'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Settings,
  PoundSterling,
  Calendar
} from 'lucide-react'

// Mobile navigation items
const mobileNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/financials', label: 'Finance', icon: PoundSterling },
]

interface MobileBottomNavigationProps {
  items?: typeof mobileNavItems
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ 
  items = mobileNavItems 
}) => {
  const pathname = usePathname()
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 py-1 z-40 md:hidden">
      <div className="flex justify-around">
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center px-3 py-2 rounded-lg transition-colors min-w-0",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs truncate max-w-full">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}