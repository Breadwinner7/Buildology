'use client'

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabaseClient"
import {
  ClipboardList,
  FileText,
  MessageSquare,
  Home,
  PoundSterling,
  ArrowLeft,
  Settings,
  Plus,
  ChevronLeft,
  BookOpen,
  Clipboard,
  Search,
  Target
} from "lucide-react"

// Simplified navigation for project context
const navigationItems = [
  { 
    href: "", 
    label: "Overview", 
    icon: Home,
    description: "Project summary and details",
  },
  { 
    href: "tasks", 
    label: "Tasks", 
    icon: ClipboardList,
    badge: "taskCount",
    description: "Project tasks and assignments",
  },
  { 
    href: "messages", 
    label: "Messages", 
    icon: MessageSquare,
    badge: "messageCount",
    description: "Project communications",
  },
  { 
    href: "documents", 
    label: "Documents", 
    icon: FileText,
    badge: "docCount",
    description: "Files and documentation",
  },
  { 
    href: "surveys", 
    label: "Surveys", 
    icon: Clipboard,
    badge: "surveyCount",
    description: "Property surveys and assessments",
  },
  { 
    href: "financials", 
    label: "Financials", 
    icon: PoundSterling,
    badge: "invoiceCount",
    description: "Budget and invoices",
  },
  { 
    href: "reserves", 
    label: "Reserves", 
    icon: Target,
    description: "Reserve management and tracking",
  },
  { 
    href: "hod-codes", 
    label: "HOD Codes", 
    icon: BookOpen,
    description: "Head of Damage code reference",
  },
]

// Hook to fetch real project data
const useProjectSidebarData = (projectId: string) => {
  return useQuery({
    queryKey: ['project-sidebar-data', projectId],
    queryFn: async () => {
      if (!projectId) return null

      const [
        tasksResponse,
        docsResponse, 
        messagesResponse,
        milestonesResponse,
        financialsResponse,
        surveysResponse
      ] = await Promise.all([
        supabase.from('tasks').select('id, status').eq('project_id', projectId),
        supabase.from('documents').select('id, type').eq('project_id', projectId),
        supabase.from('messages').select('id').eq('project_id', projectId),
        supabase.from('project_milestones').select('id, status, completion_percentage').eq('project_id', projectId),
        supabase.from('project_financials').select('budget_total, budget_spent').eq('project_id', projectId).single(),
        supabase.from('survey_forms').select('id, form_status').eq('project_id', projectId)
      ])

      const tasks = tasksResponse.data || []
      const docs = docsResponse.data || []
      const messages = messagesResponse.data || []
      const milestones = milestonesResponse.data || []
      const surveys = surveysResponse.data || []
      
      return {
        taskCount: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        messageCount: messages.length,
        docCount: docs.length,
        surveyCount: surveys.length,
        completedSurveys: surveys.filter(s => s.form_status === 'completed').length,
        invoiceCount: Math.floor(Math.random() * 8), // Replace with real invoice data
        milestonesCount: milestones.length,
        completedMilestones: milestones.filter(m => m.status === 'completed').length,
        overallProgress: milestones.length > 0 
          ? Math.round(milestones.reduce((acc, m) => acc + (m.completion_percentage || 0), 0) / milestones.length)
          : 0,
        budgetTotal: financialsResponse.data?.budget_total || 0,
        budgetSpent: financialsResponse.data?.budget_spent || 0
      }
    },
    enabled: !!projectId,
    refetchInterval: 30000 // Refresh every 30 seconds
  })
}

export function ProjectSidebar() {
  const { id: projectId } = useParams()
  const pathname = usePathname()
  const [projectName, setProjectName] = useState<string>('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const { data: sidebarData, isLoading } = useProjectSidebarData(projectId as string)

  // Fetch project name
  useEffect(() => {
    if (projectId) {
      supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()
        .then(({ data }) => {
          if (data) setProjectName(data.name)
        })
    }
  }, [projectId])

  const getBadgeValue = (badgeKey: string) => {
    if (!sidebarData) return null
    const value = sidebarData[badgeKey as keyof typeof sidebarData]
    return typeof value === 'number' && value > 0 ? value : null
  }

  if (isCollapsed) {
    return (
      <aside className="h-full w-16 shrink-0 border-r bg-background flex flex-col">
        <div className="p-2 border-b">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
        <div className="flex-1 p-2 space-y-2">
          {navigationItems.map(({ href, icon: Icon }) => {
            const fullPath = `/projects/${projectId}/${href}`
            const isActive = pathname === fullPath || 
              (href === "" && pathname === `/projects/${projectId}`)
            
            return (
              <Link
                key={href}
                href={fullPath}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            )
          })}
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full w-64 shrink-0 border-r bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 px-2 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {projectName || 'Loading...'}
            </h2>
            <p className="text-xs text-muted-foreground">Project Workspace</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        {sidebarData && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="font-bold text-sm">{sidebarData.overallProgress}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Tasks</p>
              <p className="font-bold text-sm">{sidebarData.completedTasks}/{sidebarData.taskCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {navigationItems.map(({ href, label, icon: Icon, badge, description }) => {
            const fullPath = `/projects/${projectId}/${href}`
            const isActive = pathname === fullPath || 
              (href === "" && pathname === `/projects/${projectId}`)
            
            const badgeValue = badge ? getBadgeValue(badge) : null

            return (
              <Link
                key={href}
                href={fullPath}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : ""
                )} />
                <span className="flex-1">{label}</span>
                
                {badgeValue && (
                  <Badge 
                    variant={isActive ? "default" : "secondary"} 
                    className="h-5 px-1.5 text-xs"
                  >
                    {badgeValue > 99 ? '99+' : badgeValue}
                  </Badge>
                )}
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      {sidebarData && (
        <div className="p-4 border-t">
          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Overall Progress</span>
              <span>{sidebarData.overallProgress}%</span>
            </div>
            <Progress value={sidebarData.overallProgress} className="h-1.5" />
          </div>

          {/* Budget */}
          {sidebarData.budgetTotal > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Budget Used</span>
                <span>£{(sidebarData.budgetSpent / 1000).toFixed(0)}k / £{(sidebarData.budgetTotal / 1000).toFixed(0)}k</span>
              </div>
              <Progress 
                value={(sidebarData.budgetSpent / sidebarData.budgetTotal) * 100} 
                className="h-1.5" 
              />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}