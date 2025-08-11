'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  User,
  MapPin,
  Shield,
  Flag,
  Clock,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  PoundSterling
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus, UserProfile } from '@/types/database'

// Enhanced project interface with relations
interface EnhancedProject extends Project {
  project_financials?: {
    budget_total?: number
    budget_spent?: number
    budget_remaining?: number
  }[]
  tasks_aggregate?: {
    count: number
  }
  documents_aggregate?: {
    count: number
  }
  project_members?: {
    user_profiles: Pick<UserProfile, 'first_name' | 'surname' | 'role'>
  }[]
}

interface ProjectFilters {
  search: string
  status: string[]
  onHold: boolean | null
  vulnerabilityFlags: boolean | null
  dateRange: {
    from?: Date
    to?: Date
  }
  budgetRange: {
    min?: number
    max?: number
  }
}

const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'bg-purple-500' },
  { value: 'survey_booked', label: 'Survey Booked', color: 'bg-orange-500' },
  { value: 'survey_complete', label: 'Survey Complete', color: 'bg-orange-600' },
  { value: 'awaiting_agreement', label: 'Awaiting Agreement', color: 'bg-amber-500' },
  { value: 'planning_authorisation', label: 'Planning Auth', color: 'bg-yellow-500' },
  { value: 'scheduling_works', label: 'Scheduling Works', color: 'bg-cyan-500' },
  { value: 'works_in_progress', label: 'Works in Progress', color: 'bg-blue-500' },
  { value: 'works_complete', label: 'Works Complete', color: 'bg-green-500' },
  { value: 'snagging', label: 'Snagging', color: 'bg-pink-500' },
  { value: 'final_accounts', label: 'Final Accounts', color: 'bg-indigo-500' },
  { value: 'closed', label: 'Closed', color: 'bg-green-600' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-600' }
]

// Fetch projects with comprehensive data
const fetchProjects = async (): Promise<EnhancedProject[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_financials (
        budget_total,
        budget_spent,
        budget_remaining
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
  return data || []
}

// Create new project
const createProject = async (projectData: {
  name: string
  description?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  contact_address?: string
}) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{
      ...projectData,
      status: 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Project creation dialog
function CreateProjectDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_address: ''
  })
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setCreating(true)
    try {
      const project = await createProject(formData)
      setOpen(false)
      setFormData({
        name: '',
        description: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        contact_address: ''
      })
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to track claims, manage tasks, and collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief project description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Contact person"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_address">Property Address</Label>
            <Textarea
              id="contact_address"
              value={formData.contact_address}
              onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
              placeholder="Full property address"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !formData.name.trim()}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Project card component
function ProjectCard({ project, onClick }: { project: EnhancedProject; onClick: () => void }) {
  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status)
  const totalBudget = project.project_financials?.[0]?.budget_total || 0
  const budgetSpent = project.project_financials?.[0]?.budget_spent || 0
  const tasksCount = 0 // Will be populated after database enhancement
  const documentsCount = 0 // Will be populated after database enhancement
  const teamSize = 0 // Will be populated after database enhancement

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                {project.on_hold && (
                  <Badge variant="destructive" className="text-xs">
                    <Flag className="w-3 h-3 mr-1" />
                    ON HOLD
                  </Badge>
                )}
                {project.vulnerability_flags && project.vulnerability_flags.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Vulnerable
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <div className={cn("w-3 h-3 rounded-full", statusConfig?.color)} />
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {statusConfig?.label || project.status}
              </Badge>
            </div>
          </div>

          {/* Contact & Location */}
          {(project.contact_name || project.contact_address) && (
            <div className="space-y-1">
              {project.contact_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{project.contact_name}</span>
                </div>
              )}
              {project.contact_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{project.contact_address}</span>
                </div>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>Team: {teamSize}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                <span>Tasks: {tasksCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>Docs: {documentsCount}</span>
              </div>
              {totalBudget > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <PoundSterling className="w-3 h-3" />
                  <span>Budget: £{(totalBudget / 1000).toFixed(0)}k</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Updated {formatDistanceToNow(new Date(project.updated_at || project.created_at), { addSuffix: true })}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main projects page component
export default function ProjectsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: [],
    onHold: null,
    vulnerabilityFlags: null,
    dateRange: {},
    budgetRange: {}
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 2 * 60 * 1000
  })

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const searchableText = [
          project.name,
          project.description,
          project.contact_name,
          project.contact_address
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(project.status)) {
        return false
      }

      // On hold filter
      if (filters.onHold !== null && project.on_hold !== filters.onHold) {
        return false
      }

      // Vulnerability flags filter
      if (filters.vulnerabilityFlags !== null) {
        const hasVulnerability = project.vulnerability_flags && project.vulnerability_flags.length > 0
        if (hasVulnerability !== filters.vulnerabilityFlags) return false
      }

      return true
    })
  }, [projects, filters])

  const projectStats = useMemo(() => {
    const total = filteredProjects.length
    const active = filteredProjects.filter(p => 
      ['works_in_progress', 'survey_booked', 'survey_complete', 'scheduling_works'].includes(p.status)
    ).length
    const onHold = filteredProjects.filter(p => p.on_hold).length
    const vulnerable = filteredProjects.filter(p => p.vulnerability_flags && p.vulnerability_flags.length > 0).length

    return { total, active, onHold, vulnerable }
  }, [filteredProjects])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-48" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your construction projects and insurance claims
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <CreateProjectDialog />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load projects. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{projectStats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{projectStats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold">{projectStats.onHold}</p>
                </div>
                <Flag className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vulnerable Customers</p>
                  <p className="text-2xl font-bold">{projectStats.vulnerable}</p>
                </div>
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects, contacts, or addresses..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status.length > 0 ? filters.status[0] : 'all'}
                      onValueChange={(value) => 
                        setFilters({ ...filters, status: value === 'all' ? [] : [value] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {PROJECT_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", status.color)} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onHold"
                      checked={filters.onHold === true}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, onHold: checked ? true : null })
                      }
                    />
                    <Label htmlFor="onHold">Show only projects on hold</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vulnerable"
                      checked={filters.vulnerabilityFlags === true}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, vulnerabilityFlags: checked ? true : null })
                      }
                    />
                    <Label htmlFor="vulnerable">Show only vulnerable customers</Label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/projects/${project.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-6">
                {filters.search || filters.status.length > 0 || filters.onHold || filters.vulnerabilityFlags
                  ? "No projects match your current filters."
                  : "Get started by creating your first project."
                }
              </p>
              {filters.search || filters.status.length > 0 || filters.onHold || filters.vulnerabilityFlags ? (
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    search: '',
                    status: [],
                    onHold: null,
                    vulnerabilityFlags: null,
                    dateRange: {},
                    budgetRange: {}
                  })}
                >
                  Clear Filters
                </Button>
              ) : (
                <CreateProjectDialog />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}