'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  FolderKanban,
  Settings,
} from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
  { href: '/projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r bg-background px-4 py-6">
      <div className="text-2xl font-bold text-primary mb-8 tracking-tight">
        Buildology
      </div>
      <nav className="space-y-1">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith(link.href)
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
