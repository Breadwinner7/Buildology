'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell
} from '@/components/ui/table'

import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'

import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { 
  Search, Filter, Plus, MoreHorizontal, Eye, Edit, Trash2,
  FolderOpen, Calendar, MapPin, Activity, TrendingUp, AlertCircle,
  Download, FileText, Building, Hammer, Users, Clock,
  CheckSquare, Archive, Copy, Mail, PoundSterling,
  Settings, BarChart3, Target, AlertTriangle, Building2,
  HardHat, Home, Calendar as CalendarIcon, ChevronDown,
  Shield, Crown
} from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string
  region: string
  status: string
  project_type: string
  contract_value?: number
  client_name?: string
  client_contact?: string
  start_date?: string
  target_completion?: string
  created_at: string
  updated_at?: string
  postcode?: string
  site_address?: string
  contractor?: string
  template_used?: string
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  project_type: string
  default_status: string
  checklist_items: string[]
  estimated_duration_weeks: number
  typical_contract_value_range: string
}

// UK Building Industry Project Templates
const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'residential-extension',
    name: 'Residential Extension',
    description: 'Single/double storey home extensions, conservatories, and loft conversions',
    project_type: 'Residential Extension',
    default_status: 'Planning',
    checklist_items: [
      'Planning permission check',
      'Building regulations application',
      'Party wall agreements (if applicable)',
      'Structural engineer consultation',
      'Architect drawings',
      'Contractor selection',
      'Materials procurement',
      'Building control inspections'
    ],
    estimated_duration_weeks: 12,
    typical_contract_value_range: '£20,000 - £80,000'
  },
  {
    id: 'commercial-fit-out',
    name: 'Commercial Fit-Out',
    description: 'Office spaces, retail units, and commercial interior refurbishments',
    project_type: 'Commercial Fit-Out',
    default_status: 'Design',
    checklist_items: [
      'Space planning and design',
      'Fire safety compliance',
      'Accessibility compliance (DDA)',
      'M&E design and installation',
      'Data and telecoms infrastructure',
      'Health & safety documentation',
      'CDM compliance',
      'Handover and snagging'
    ],
    estimated_duration_weeks: 8,
    typical_contract_value_range: '£50,000 - £200,000'
  },
  {
    id: 'new-build-residential',
    name: 'New Build Residential',
    description: 'New construction of residential properties including houses and apartments',
    project_type: 'New Build',
    default_status: 'Planning',
    checklist_items: [
      'Land acquisition',
      'Planning permission',
      'Building regulations approval',
      'Site surveys and investigations',
      'Foundation design',
      'Structural design',
      'M&E design',
      'NHBC/warranty arrangements',
      'CIL and S106 agreements',
      'Final inspections and certification'
    ],
    estimated_duration_weeks: 26,
    typical_contract_value_range: '£150,000 - £500,000'
  },
  {
    id: 'renovation-refurb',
    name: 'Property Renovation',
    description: 'Full property renovations, modernization, and restoration projects',
    project_type: 'Renovation',
    default_status: 'Survey',
    checklist_items: [
      'Building survey',
      'Asbestos survey (pre-1980 buildings)',
      'Listed building consent (if applicable)',
      'Structural assessment',
      'Mechanical & electrical upgrade',
      'Insulation and energy efficiency',
      'Kitchen and bathroom installation',
      'Decorating and finishing'
    ],
    estimated_duration_weeks: 16,
    typical_contract_value_range: '£30,000 - £150,000'
  },
  {
    id: 'insurance-claim',
    name: 'Insurance Claim Project',
    description: 'Property repairs and restoration following insurance claims (fire, flood, subsidence)',
    project_type: 'Insurance Repair',
    default_status: 'Assessment',
    checklist_items: [
      'Initial damage assessment',
      'Insurance adjuster liaison',
      'Scope of works agreement',
      'Emergency make-safe works',
      'Specialist contractor appointment',
      'Materials matching and sourcing',
      'Progress monitoring',
      'Final account settlement'
    ],
    estimated_duration_weeks: 10,
    typical_contract_value_range: '£10,000 - £100,000'
  },
  {
    id: 'maintenance-contract',
    name: 'Maintenance Contract',
    description: 'Ongoing property maintenance, planned maintenance programmes, and reactive repairs',
    project_type: 'Maintenance',
    default_status: 'Active',
    checklist_items: [
      'Property condition survey',
      'Maintenance schedule creation',
      'Contractor framework agreement',
      'Emergency contact procedures',
      'Regular inspection regime',
      'Compliance monitoring',
      'Performance reporting',
      'Annual contract review'
    ],
    estimated_duration_weeks: 52,
    typical_contract_value_range: '£5,000 - £50,000'
  }
]

const UK_REGIONS = [
  'London', 'South East', 'South West', 'East of England', 'East Midlands',
  'West Midlands', 'Yorkshire and the Humber', 'North West', 'North East',
  'Scotland', 'Wales', 'Northern Ireland'
]

const PROJECT_STATUSES = [
  'Planning', 'Design', 'Tender', 'Pre-Construction', 'In Progress', 
  'Practical Completion', 'Snagging', 'Final Account', 'Complete',
  'On Hold', 'Cancelled', 'Assessment', 'Survey', 'Active'
]

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [bulkActionOpen, setBulkActionOpen] = useState(false)

  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '', 
    region: '', 
    status: 'Planning',
    project_type: '',
    contract_value: '',
    client_name: '',
    client_contact: '',
    start_date: '',
    target_completion: '',
    postcode: '',
    site_address: '',
    contractor: '',
    template_used: ''
  })
  const [creating, setCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

// Replace your useEffect with this simplified version (after disabling RLS):

useEffect(() => {
  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Starting project fetch...')

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Authentication error:', authError)
        setError('Please log in to view projects')
        setLoading(false)
        return
      }

      console.log('👤 Authenticated user:', user.email, 'ID:', user.id)

      // Get user profile by email (RLS is now disabled)
      console.log('🔍 Fetching user profile by email...')
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, super_admin')
        .eq('email', user.email)
        .single()

      console.log('👤 Profile result:', { userProfile, profileError })

      if (profileError || !userProfile) {
        console.error('❌ Profile not found:', profileError)
        setError(`Profile not found for ${user.email}. Please contact administrator.`)
        setLoading(false)
        return
      }

      console.log('✅ Profile found:', {
        email: userProfile.email,
        role: userProfile.role,
        super_admin: userProfile.super_admin
      })

      setCurrentUser(userProfile)
      const isAdmin = userProfile.super_admin || userProfile.role === 'super_admin'
      setIsSuperAdmin(isAdmin)

      console.log('🔧 Access level:', { isAdmin })

      // Fetch all projects (you're super admin)
      console.log('🌟 Fetching all projects...')
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Projects result:', { 
        count: projectsData?.length || 0, 
        error: projectsError 
      })

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError)
        setError('Failed to load projects: ' + projectsError.message)
      } else {
        console.log('✅ Projects loaded successfully')
        setProjects(projectsData || [])
      }

    } catch (error: any) {
      console.error('💥 Unexpected error:', error)
      setError('An unexpected error occurred: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  fetchProjects()
}, [])

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.site_address?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter !== 'all' ? project.status === statusFilter : true
      const matchesRegion = regionFilter !== 'all' ? project.region === regionFilter : true
      const matchesType = typeFilter !== 'all' ? project.project_type === typeFilter : true
      return matchesSearch && matchesStatus && matchesRegion && matchesType
    })

    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Project]
      let bValue = b[sortBy as keyof Project]
      
      if (sortBy === 'created_at' || sortBy === 'start_date' || sortBy === 'target_completion') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [projects, searchTerm, statusFilter, regionFilter, typeFilter, sortBy, sortOrder])

  const handleCreateFromTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template)
    setNewProject({
      ...newProject,
      project_type: template.project_type,
      status: template.default_status,
      template_used: template.id
    })
    setShowTemplateDialog(false)
    setIsDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!newProject.name.trim()) return
    
    setCreating(true)
    const projectData = {
      ...newProject,
      contract_value: newProject.contract_value ? parseFloat(newProject.contract_value) : null
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()

    if (!error && data) {
      setProjects(prev => [data, ...prev])
      setNewProject({ 
        name: '', description: '', region: '', status: 'Planning',
        project_type: '', contract_value: '', client_name: '', client_contact: '',
        start_date: '', target_completion: '', postcode: '', site_address: '',
        contractor: '', template_used: ''
      })
      setSelectedTemplate(null)
      setIsDialogOpen(false)
    }
    setCreating(false)
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .in('id', selectedProjects)

    if (!error) {
      setProjects(prev => 
        prev.map(p => 
          selectedProjects.includes(p.id) ? { ...p, status: newStatus } : p
        )
      )
      setSelectedProjects([])
      setBulkActionOpen(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedProjects.length} selected projects? This cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .in('id', selectedProjects)

    if (!error) {
      setProjects(prev => prev.filter(p => !selectedProjects.includes(p.id)))
      setSelectedProjects([])
      setBulkActionOpen(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Project Name', 'Type', 'Status', 'Region', 'Client', 'Contract Value', 
      'Start Date', 'Target Completion', 'Site Address', 'Contractor', 'Created'
    ]
    
    const csvData = filteredAndSortedProjects.map(project => [
      project.name,
      project.project_type || '',
      project.status,
      project.region || '',
      project.client_name || '',
      project.contract_value ? `£${project.contract_value.toLocaleString()}` : '',
      project.start_date || '',
      project.target_completion || '',
      project.site_address || '',
      project.contractor || '',
      new Date(project.created_at).toLocaleDateString()
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projects-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Complete': case 'Practical Completion': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'Planning': case 'Design': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Tender': case 'Pre-Construction': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Snagging': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress': return <Activity className="w-3 h-3" />
      case 'On Hold': return <AlertCircle className="w-3 h-3" />
      case 'Complete': case 'Practical Completion': return <CheckSquare className="w-3 h-3" />
      case 'Planning': case 'Design': return <Target className="w-3 h-3" />
      case 'Cancelled': return <AlertTriangle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const stats = useMemo(() => {
    const total = projects.length
    const inProgress = projects.filter(p => p.status === 'In Progress').length
    const completed = projects.filter(p => ['Complete', 'Practical Completion'].includes(p.status)).length
    const planning = projects.filter(p => ['Planning', 'Design', 'Tender'].includes(p.status)).length
    const totalValue = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0)
    
    return { total, inProgress, completed, planning, totalValue }
  }, [projects])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Project Management</h1>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Project Management</h1>
              <p className="text-red-600">Error: {error}</p>
            </div>
          </div>
        </div>
        <Card className="p-6">
          <CardContent>
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to Load Projects</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Project Management
            {isSuperAdmin && (
              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin 
              ? "Full system access - viewing all projects" 
              : "Comprehensive project and claims management for the UK building industry"
            }
          </p>
          {currentUser && (
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as: {currentUser.email}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Template Dialog */}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="text-2xl">Choose Project Template</DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Select a template to quickly set up your project with industry-standard workflows and checklists
                </DialogDescription>
              </DialogHeader>
              
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-1 2xl:grid-cols-3 gap-8">
                  {PROJECT_TEMPLATES.map((template) => (
                    <Card key={template.id} className="h-full flex flex-col hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300">
                      <CardHeader className="flex-shrink-0">
                        <div className="space-y-3">
                          <div>
                            <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                            <Badge variant="outline" className="mt-2 text-xs px-2 py-1">
                              {template.project_type}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">~{template.estimated_duration_weeks} weeks</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <PoundSterling className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">{template.typical_contract_value_range}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium">{template.checklist_items.length} checklist items</span>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleCreateFromTemplate(template)}
                          className="w-full mt-4"
                          size="lg"
                        >
                          Use This Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="text-center mt-8 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Templates include:</strong> Pre-configured checklists, typical project durations, estimated costs, and industry best practices for UK building projects
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Project Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? `Create ${selectedTemplate.name}` : 'Create New Project'}
                </DialogTitle>
                {selectedTemplate && (
                  <DialogDescription>
                    Using template: {selectedTemplate.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="details">Project Details</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts & Dates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Brief project description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project_type">Project Type</Label>
                      <Select
                        value={newProject.project_type}
                        onValueChange={(val) => setNewProject({ ...newProject, project_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TEMPLATES.map(template => (
                            <SelectItem key={template.project_type} value={template.project_type}>
                              {template.project_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Initial Status</Label>
                      <Select
                        value={newProject.status}
                        onValueChange={(val) => setNewProject({ ...newProject, status: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select
                        value={newProject.region}
                        onValueChange={(val) => setNewProject({ ...newProject, region: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {UK_REGIONS.map(region => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_value">Contract Value (£)</Label>
                      <Input
                        id="contract_value"
                        type="number"
                        value={newProject.contract_value}
                        onChange={(e) => setNewProject({ ...newProject, contract_value: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_address">Site Address</Label>
                    <Textarea
                      id="site_address"
                      value={newProject.site_address}
                      onChange={(e) => setNewProject({ ...newProject, site_address: e.target.value })}
                      placeholder="Full site address"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={newProject.postcode}
                        onChange={(e) => setNewProject({ ...newProject, postcode: e.target.value })}
                        placeholder="SW1A 1AA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractor">Main Contractor</Label>
                      <Input
                        id="contractor"
                        value={newProject.contractor}
                        onChange={(e) => setNewProject({ ...newProject, contractor: e.target.value })}
                        placeholder="Contractor name"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Client Name</Label>
                      <Input
                        id="client_name"
                        value={newProject.client_name}
                        onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                        placeholder="Client/Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_contact">Client Contact</Label>
                      <Input
                        id="client_contact"
                        value={newProject.client_contact}
                        onChange={(e) => setNewProject({ ...newProject, client_contact: e.target.value })}
                        placeholder="Email or phone"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_completion">Target Completion</Label>
                      <Input
                        id="target_completion"
                        type="date"
                        value={newProject.target_completion}
                        onChange={(e) => setNewProject({ ...newProject, target_completion: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedTemplate(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={creating || !newProject.name.trim()}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Count Info */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {projects.length === 0 
            ? (isSuperAdmin ? "No projects exist in the system" : "You don't have access to any projects yet")
            : `Showing ${projects.length} project${projects.length !== 1 ? 's' : ''}`
          }
          {isSuperAdmin && projects.length > 0 && (
            <span className="ml-2 text-purple-600 font-medium">
              • System-wide view
            </span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planning Stage</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.planning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building2 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <PoundSterling className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              £{stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <Card className="p-12">
          <CardContent>
            <div className="text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {isSuperAdmin 
                  ? "No projects have been created in the system yet."
                  : "You haven't been added to any projects yet. Contact your administrator to get access."
                }
              </p>
              {(isSuperAdmin || true) && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSuperAdmin ? "Create First Project" : "Request Project Access"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show content only if there are projects */}
      {projects.length > 0 && (
        <>
          {/* Bulk Actions */}
          {selectedProjects.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">
                    {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProjects([])}
                  >
                    Clear Selection
                  </Button>
                </div>
                <DropdownMenu open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Bulk Actions
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="font-medium">
                      Update Status
                    </DropdownMenuItem>
                    {PROJECT_STATUSES.map(status => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleBulkStatusUpdate(status)}
                        className="pl-6"
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          )}

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search projects, clients, addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select onValueChange={setStatusFilter} value={statusFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Activity className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PROJECT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setTypeFilter} value={typeFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Building className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PROJECT_TEMPLATES.map(template => (
                      <SelectItem key={template.project_type} value={template.project_type}>
                        {template.project_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setRegionFilter} value={regionFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <MapPin className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {UK_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setSortBy} value={sortBy}>
                  <SelectTrigger className="w-full lg:w-48">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="name">Project Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="start_date">Start Date</SelectItem>
                    <SelectItem value="contract_value">Contract Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Projects Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects(filteredAndSortedProjects.map(p => p.id))
                          } else {
                            setSelectedProjects([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Project Details</TableHead>
                    <TableHead className="font-semibold">Type & Status</TableHead>
                    <TableHead className="font-semibold">Client & Location</TableHead>
                    <TableHead className="font-semibold">Timeline & Value</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground font-medium">No projects found</p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAndSortedProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects([...selectedProjects, project.id])
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== project.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {project.name}
                            {project.template_used && (
                              <Badge variant="secondary" className="text-xs">
                                Template
                              </Badge>
                            )}
                          </div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 max-w-md mt-1">
                              {project.description}
                            </div>
                          )}
                          {project.contractor && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <HardHat className="w-3 h-3" />
                              {project.contractor}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {project.project_type && (
                            <Badge variant="outline" className="text-xs">
                              {project.project_type}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline"
                            className={`${statusColor(project.status)} flex items-center gap-1 w-fit text-xs`}
                          >
                            {getStatusIcon(project.status)}
                            {project.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {project.client_name && (
                            <div className="text-sm font-medium">{project.client_name}</div>
                          )}
                          {project.site_address && (
                            <div className="text-xs text-muted-foreground flex items-start gap-1">
                              <Home className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{project.site_address}</span>
                            </div>
                          )}
                          {project.region && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {project.region}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {project.start_date && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-green-600" />
                              <span>Start: {new Date(project.start_date).toLocaleDateString('en-GB')}</span>
                            </div>
                          )}
                          {project.target_completion && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-orange-600" />
                              <span>End: {new Date(project.target_completion).toLocaleDateString('en-GB')}</span>
                            </div>
                          )}
                          {project.contract_value && (
                            <div className="flex items-center gap-1 font-medium text-emerald-700">
                              <PoundSterling className="w-3 h-3" />
                              <span>£{project.contract_value.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="text-muted-foreground">
                            Created: {new Date(project.created_at).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}`)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}/edit`)
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}/claims`)
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Manage Claims
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}/documents`)
                              }}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Documents
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                // Duplicate project logic would go here
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                if (project.client_contact?.includes('@')) {
                                  window.location.href = `mailto:${project.client_contact}`
                                }
                              }}
                              disabled={!project.client_contact?.includes('@')}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Email Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                // Delete functionality would go here
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Results summary */}
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {filteredAndSortedProjects.length} of {projects.length} projects
            {stats.totalValue > 0 && (
              <span className="ml-4">
                • Total value: £{stats.totalValue.toLocaleString()}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}