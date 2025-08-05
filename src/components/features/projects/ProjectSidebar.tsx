'use client'

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ClipboardList,
  FileText,
  MessageSquare,
  NotebookText,
  Clock,
  Home,
  Users,
  Camera,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
} from "lucide-react"

// Main navigation sections
const navigationSections = [
  {
    title: "Project",
    items: [
      { 
        href: "", 
        label: "Overview", 
        icon: Home,
        description: "Project summary and key metrics"
      },
      { 
        href: "progress", 
        label: "Progress", 
        icon: TrendingUp,
        description: "Track project milestones and completion"
      },
      { 
        href: "timeline", 
        label: "Timeline", 
        icon: Clock,
        description: "Project schedule and key dates"
      },
    ]
  },
  {
    title: "Work Management",
    items: [
      { 
        href: "tasks", 
        label: "Tasks", 
        icon: ClipboardList,
        badge: "taskCount",
        description: "Manage project tasks and assignments"
      },
      { 
        href: "issues", 
        label: "Issues & Claims", 
        icon: AlertTriangle,
        badge: "issueCount",
        description: "Track issues, claims, and risks"
      },
      { 
        href: "calendar", 
        label: "Calendar", 
        icon: Calendar,
        description: "View project schedule and events"
      },
    ]
  },
  {
    title: "Communication",
    items: [
      { 
        href: "messages", 
        label: "Messages", 
        icon: MessageSquare,
        badge: "messageCount",
        description: "Team communications and updates"
      },
      { 
        href: "notes", 
        label: "Notes", 
        icon: NotebookText,
        description: "Project notes and documentation"
      },
    ]
  },
  {
    title: "Resources",
    items: [
      { 
        href: "documents", 
        label: "Documents", 
        icon: FileText,
        badge: "docCount",
        description: "Files, contracts, and reports"
      },
      { 
        href: "photos", 
        label: "Photos", 
        icon: Camera,
        badge: "photoCount",
        description: "Site photos and visual documentation"
      },
      { 
        href: "team", 
        label: "Team", 
        icon: Users,
        description: "Project team and stakeholders"
      },
    ]
  }
]

// Mock data - replace with real data hooks
const useSidebarData = (projectId: string) => {
  const [data, setData] = useState({
    taskCount: 0,
    issueCount: 0,
    messageCount: 0,
    docCount: 0,
    photoCount: 0,
  })

  useEffect(() => {
    // Simulate API call
    setData({
      taskCount: 12,
      issueCount: 3,
      messageCount: 5,
      docCount: 8,
      photoCount: 24,
    })
  }, [projectId])

  return data
}

export function ProjectSidebar() {
  const { id: projectId } = useParams()
  const pathname = usePathname()
  const [collapsedSections, setCollapsedSections] = useState<string[]>([])
  const sidebarData = useSidebarData(projectId as string)

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => 
      prev.includes(sectionTitle)
        ? prev.filter(title => title !== sectionTitle)
        : [...prev, sectionTitle]
    )
  }

  const getBadgeValue = (badgeKey: string) => {
    const value = sidebarData[badgeKey as keyof typeof sidebarData]
    return value > 0 ? value : null
  }

  return (
    <aside className="h-full w-72 shrink-0 border-r bg-background flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Project Navigation
          </h2>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {navigationSections.map((section) => {
            const isCollapsed = collapsedSections.includes(section.title)
            
            return (
              <div key={section.title} className="mb-4">
                {/* Section Header */}
                <Button
                  variant="ghost"
                  className="w-full justify-between h-8 px-2 mb-1"
                  onClick={() => toggleSection(section.title)}
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {section.title}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>

                {/* Section Items */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {section.items.map(({ href, label, icon: Icon, badge, description }) => {
                      const fullPath = `/projects/${projectId}/${href}`
                      const isActive = pathname === fullPath || 
                        (href === "" && pathname === `/projects/${projectId}`)
                      
                      const badgeValue = badge ? getBadgeValue(badge) : null

                      return (
                        <Link
                          key={href}
                          href={fullPath}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-muted",
                            isActive && "bg-primary/10 text-primary border-r-2 border-primary"
                          )}
                          title={description}
                        >
                          <Icon className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          <span className="flex-1">{label}</span>
                          
                          {/* Badge for counts */}
                          {badgeValue && (
                            <Badge 
                              variant="secondary" 
                              className="h-5 px-1.5 text-xs"
                            >
                              {badgeValue > 99 ? '99+' : badgeValue}
                            </Badge>
                          )}

                          {/* New/Alert indicators */}
                          {label === "Issues & Claims" && badgeValue && badgeValue > 0 && (
                            <div className="h-2 w-2 bg-orange-500 rounded-full" />
                          )}
                          {label === "Messages" && badgeValue && badgeValue > 0 && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Quick Actions Footer */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add Task
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Filter className="h-4 w-4 mr-2" />
            Filter Views
          </Button>
        </div>
      </div>
    </aside>
  )
}