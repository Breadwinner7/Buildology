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
import { SkeletonProjectCard } from '@/components/ui/loading'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  PoundSterling,
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  Grid3X3,
  List,
  MoreHorizontal,
  Edit,
  Settings,
  Star,
  Archive
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types/database'

// Enhanced project interface with relations
interface EnhancedProject extends Project {
  project_financials?: {
    budget_total?: number
    budget_spent?: number
    budget_remaining?: number
  }[]
  project_team?: {
    role: string
    user_profiles: {
      id: string
      first_name?: string
      surname?: string
      email?: string
      avatar_url?: string
    }
  }[]
  _count?: {
    tasks: number
    claims: number
    documents: number
    appointments: number
  }
}

// Fetch projects with enhanced data
const fetchProjectsWithStats = async (): Promise<EnhancedProject[]> => {
  try {
    console.log('Fetching projects...')
    
    // First check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Current user:', user?.email || 'Not authenticated')
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication required to access projects')
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
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
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Projects fetched successfully:', data?.length || 0, 'projects')
    
    // For now, return projects without team data to isolate the issue
    const projectsWithBasicCounts = await Promise.all(
      (data || []).map(async (project) => {
        const [tasks, claims, documents, appointments] = await Promise.all([
          supabase.from('tasks').select('id').eq('project_id', project.id),
          supabase.from('claims').select('id').eq('project_id', project.id),  
          supabase.from('documents').select('id').eq('project_id', project.id),
          supabase.from('appointments').select('id').eq('project_id', project.id)
        ])

        return {
          ...project,
          project_team: [], // Empty for now
          _count: {
            tasks: tasks.data?.length || 0,
            claims: claims.data?.length || 0,
            documents: documents.data?.length || 0,
            appointments: appointments.data?.length || 0
          }
        }
      })
    )

    return projectsWithBasicCounts
  } catch (error: any) {
    console.error('Error in fetchProjectsWithStats:', error)
    throw error
  }
}

// Project status configuration
const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500', icon: FileText },
  { value: 'active', label: 'Active', color: 'bg-green-500', icon: Activity },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-500', icon: Clock },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500', icon: AlertTriangle },
  { value: 'archived', label: 'Archived', color: 'bg-gray-500', icon: Archive }
] as const

const getStatusConfig = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0]
}

// Create new project
const createProject = async (projectData: {
  name: string
  description?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  property_address?: string
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
    property_address: ''
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
        property_address: ''
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
        <Button className="shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to track claims, manage tasks, and collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Kitchen Renovation - 123 Main St"
                required
                className="focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the project scope..."
                rows={3}
                className="focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Smith"
                  className="focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="07123 456789"
                  className="focus:ring-2 focus:ring-primary/20"
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
                placeholder="john.smith@email.com"
                className="focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_address">Property Address</Label>
              <Textarea
                id="property_address"
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                placeholder="123 Main Street, London, SW1A 1AA"
                rows={2}
                className="focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
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
function ProjectCard({ project }: { project: EnhancedProject }) {
  const router = useRouter()
  const statusConfig = getStatusConfig(project.status)
  const StatusIcon = statusConfig.icon
  
  const budget = project.project_financials?.[0]
  const budgetProgress = budget?.budget_total ? 
    ((budget.budget_spent || 0) / budget.budget_total) * 100 : 0

  const teamMembers = project.project_team || []
  const displayTeam = teamMembers.slice(0, 3)
  const remainingCount = teamMembers.length - 3

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 hover:scale-[1.02]" 
          style={{ borderLeftColor: statusConfig.color.replace('bg-', '#') }}
          onClick={() => router.push(`/projects/${project.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {project.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {project.description || 'No description provided'}
            </CardDescription>
          </div>
          <div className="ml-4 flex flex-col items-end gap-2">
            <Badge variant="outline" className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
            {project.priority && (
              <Badge variant={project.priority === 'high' ? 'destructive' : 'secondary'}>
                {project.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Contact Info */}
          {project.contact_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{project.contact_name}</span>
              {project.contact_phone && (
                <>
                  <span>•</span>
                  <span>{project.contact_phone}</span>
                </>
              )}
            </div>
          )}
          
          {project.property_address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{project.property_address}</span>
            </div>
          )}

          {/* Budget Progress */}
          {budget?.budget_total && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budget Progress</span>
                <span className="font-medium">
                  £{(budget.budget_spent || 0).toLocaleString()} / £{budget.budget_total.toLocaleString()}
                </span>
              </div>
              <Progress value={budgetProgress} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                {budgetProgress.toFixed(1)}% spent
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">{project._count?.tasks || 0}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600">{project._count?.claims || 0}</div>
              <div className="text-xs text-muted-foreground">Claims</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{project._count?.documents || 0}</div>
              <div className="text-xs text-muted-foreground">Docs</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{project._count?.appointments || 0}</div>
              <div className="text-xs text-muted-foreground">Meetings</div>
            </div>
          </div>

          {/* Team & Updated */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {displayTeam.length > 0 ? (
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {displayTeam.map((member, index) => (
                      <Avatar key={index} className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={member.user_profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {member.user_profiles?.first_name?.[0]}{member.user_profiles?.surname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {remainingCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      +{remainingCount} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  No team assigned
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(project.updated_at || project.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main component
export default function ProjectsOverview() {
  const { user } = useUser()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'status'>('updated')
  
  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjectsWithStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000
  })

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.property_address?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at || b.created_at).getTime() - 
                 new Date(a.updated_at || a.created_at).getTime()
      }
    })

    return filtered
  }, [projects, searchTerm, statusFilter, sortBy])

  // Summary stats
  const summaryStats = useMemo(() => {
    const stats = projects.reduce((acc, project) => {
      acc.total++
      acc[project.status] = (acc[project.status] || 0) + 1
      acc.totalTasks += project._count?.tasks || 0
      acc.totalClaims += project._count?.claims || 0
      
      const budget = project.project_financials?.[0]
      if (budget?.budget_total) {
        acc.totalBudget += budget.budget_total
        acc.totalSpent += budget.budget_spent || 0
      }
      
      return acc
    }, {
      total: 0,
      planning: 0,
      active: 0,
      on_hold: 0,
      completed: 0,
      cancelled: 0,
      archived: 0,
      totalTasks: 0,
      totalClaims: 0,
      totalBudget: 0,
      totalSpent: 0
    } as any)

    return stats
  }, [projects])

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load projects. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              Projects Overview
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Manage your construction and insurance projects
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <CreateProjectDialog />
          </div>
        </div>

        {/* Summary Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.planning}</p>
                <p className="text-sm text-muted-foreground">Planning</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.totalTasks}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-lg font-bold">£{summaryStats.totalBudget.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls - Mobile Optimized */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects by name, description, contact, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filters - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PROJECT_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Last Updated</SelectItem>
                    <SelectItem value="created">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center border rounded-md w-full sm:w-auto">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none flex-1 sm:flex-none"
                  >
                    <Grid3X3 className="w-4 h-4 sm:mr-0" />
                    <span className="ml-2 sm:hidden">Grid</span>
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-l-none flex-1 sm:flex-none"
                  >
                    <List className="w-4 h-4 sm:mr-0" />
                    <span className="ml-2 sm:hidden">Table</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Display */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
                <SkeletonProjectCard />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first project to get started'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <CreateProjectDialog />
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const statusConfig = getStatusConfig(project.status)
                  const budget = project.project_financials?.[0]
                  
                  return (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {project.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <statusConfig.icon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{project.contact_name || 'N/A'}</div>
                          <div className="text-muted-foreground">{project.contact_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {project.project_team?.slice(0, 3).map((member, index) => (
                            <Avatar key={index} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {member.user_profiles?.first_name?.[0]}{member.user_profiles?.surname?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {budget ? (
                          <div className="text-sm">
                            <div className="font-medium">£{budget.budget_total?.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {budget.budget_spent ? `£${budget.budget_spent.toLocaleString()} spent` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{project._count?.tasks || 0}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(project.updated_at || project.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        
        {/* Results Summary */}
        {filteredProjects.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        )}
      </div>
    </div>
  )
}