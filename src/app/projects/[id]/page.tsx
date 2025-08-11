'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useProject } from '@/hooks/useProject'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HoldStatusBanner } from '@/components/features/projects/HoldStatusBanner'
import ProjectAppointmentsModule from '@/components/features/appointments/ProjectAppointmentsModule'
import ProjectComplianceModule from '@/components/features/compliance/ProjectComplianceModule'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { 
  Calendar, MapPin, PoundSterling, User, Phone, Mail, Clock,
  AlertTriangle, Building, TrendingUp, Target, CheckCircle, 
  FileText, MessageSquare, ClipboardList, Edit2, Save, X, 
  Shield, Flag, Activity, Users, Plus, Copy, ExternalLink,
  ChevronRight, Star, AlertCircle, Zap, Camera, Upload,
  History, Bell, Settings, MoreHorizontal, Trash2
} from 'lucide-react'

// Enhanced vulnerability options with severity levels
const VULNERABILITY_OPTIONS = [
  { label: 'Elderly (65+)', severity: 'medium', color: 'amber' },
  { label: 'Mobility Issues', severity: 'high', color: 'red' },
  { label: 'Mental Health Conditions', severity: 'high', color: 'red' },
  { label: 'Chronic Health Issues', severity: 'medium', color: 'amber' },
  { label: 'Single Parent', severity: 'low', color: 'blue' },
  { label: 'Language Barrier', severity: 'medium', color: 'amber' },
  { label: 'Financial Hardship', severity: 'medium', color: 'amber' },
  { label: 'Learning Disabilities', severity: 'high', color: 'red' },
  { label: 'Visual/Hearing Impairment', severity: 'high', color: 'red' },
  { label: 'Recent Bereavement', severity: 'medium', color: 'amber' },
  { label: 'Social Isolation', severity: 'medium', color: 'amber' },
  { label: 'Temporary Accommodation', severity: 'low', color: 'blue' }
]

export default function PerfectProjectOverview() {
  const { id } = useParams()
  const projectId = id as string
  const { project: initialProject, loading } = useProject(projectId)
  
  // Separate edit states for different sections
  const [editingSections, setEditingSections] = useState({
    header: false,
    contact: false,
    vulnerability: false
  })
  
  const [project, setProject] = useState(initialProject)
  const [savingSection, setSavingSection] = useState('')
  const [projectStats, setProjectStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    openIssues: 0,
    documentsCount: 0,
    messagesCount: 0,
    milestonesCount: 0,
    budgetTotal: 0,
    budgetSpent: 0,
    completion: 0,
    teamMembers: 4,
    lastActivity: '2 hours ago'
  })

  useEffect(() => {
    if (initialProject) {
      let cleanProject = { ...initialProject }
      if (cleanProject.vulnerability_flags?.some(flag => flag.length === 1)) {
        cleanProject.vulnerability_flags = []
      }
      setProject(cleanProject)
    }
  }, [initialProject])

  useEffect(() => {
    if (projectId) {
      fetchProjectStats()
    }
  }, [projectId])

  const fetchProjectStats = async () => {
    try {
      const [tasksResponse, docsResponse, financialsResponse, milestonesResponse] = await Promise.all([
        supabase.from('tasks').select('id, status').eq('project_id', projectId),
        supabase.from('documents').select('id').eq('project_id', projectId),
        supabase.from('project_financials').select('budget_total, budget_spent').eq('project_id', projectId).single(),
        supabase.from('project_milestones').select('id, status').eq('project_id', projectId)
      ])

      const tasks = tasksResponse.data || []
      const completedTasks = tasks.filter(t => t.status === 'done').length
      const milestones = milestonesResponse.data || []
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      
      setProjectStats({
        totalTasks: tasks.length,
        completedTasks,
        openIssues: Math.floor(Math.random() * 5),
        documentsCount: docsResponse.data?.length || 0,
        messagesCount: Math.floor(Math.random() * 20),
        milestonesCount: milestones.length,
        budgetTotal: financialsResponse.data?.budget_total || 0,
        budgetSpent: financialsResponse.data?.budget_spent || 0,
        completion: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0,
        teamMembers: 4,
        lastActivity: '2 hours ago'
      })
    } catch (error) {
      console.error('Error fetching project stats:', error)
    }
  }

  const handleSectionSave = async (section: string) => {
    setSavingSection(section)
    try {
      const updateData: any = {}
      
      if (section === 'header') {
        updateData.name = project.name
        updateData.description = project.description
      } else if (section === 'contact') {
        updateData.contact_name = project.contact_name
        updateData.contact_phone = project.contact_phone
        updateData.contact_email = project.contact_email
        updateData.contact_address = project.contact_address
      } else if (section === 'vulnerability') {
        updateData.vulnerability_flags = project.vulnerability_flags?.filter(flag => flag.length > 1) || []
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)

      if (error) throw error

      toast.success(`${section} updated successfully`)
      setEditingSections(prev => ({ ...prev, [section]: false }))
    } catch (error) {
      toast.error(`Failed to update ${section}`)
    } finally {
      setSavingSection('')
    }
  }

  const toggleVulnerability = (flag: string) => {
    let current = project.vulnerability_flags || []
    if (current.length > 20 || current.some(item => item.length === 1)) {
      current = []
    }
    
    const updated = current.includes(flag)
      ? current.filter(v => v !== flag)
      : [...current, flag]
    setProject({ ...project, vulnerability_flags: updated })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'works_in_progress': return 'bg-blue-500'
      case 'works_complete': case 'closed': return 'bg-green-500'
      case 'on_hold': return 'bg-yellow-500'
      case 'planning': return 'bg-purple-500'
      case 'survey_booked': case 'survey_complete': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Active'
  }

  const getVulnerabilityConfig = (label: string) => {
    return VULNERABILITY_OPTIONS.find(v => v.label === label) || { severity: 'low', color: 'gray' }
  }

  const priorityTasks = [
    { id: '1', title: 'Schedule initial survey', due: 'Today', priority: 'high' },
    { id: '2', title: 'Contact customer for access', due: 'Tomorrow', priority: 'medium' },
    { id: '3', title: 'Upload damage photos', due: 'This week', priority: 'low' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-red-600">Project not found</h2>
            <p className="text-muted-foreground">The requested project could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Enhanced Project Header */}
        <div className="relative">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  {/* Project Name & Status */}
                  <div className="flex items-center gap-4">
                    {editingSections.header ? (
                      <div className="flex-1 space-y-3">
                        <Input
                          value={project.name}
                          onChange={(e) => setProject({ ...project, name: e.target.value })}
                          className="text-2xl font-bold h-auto py-2 px-3 border-2 border-blue-200"
                          placeholder="Project name"
                        />
                        <Textarea
                          value={project.description || ''}
                          onChange={(e) => setProject({ ...project, description: e.target.value })}
                          placeholder="Project description..."
                          rows={2}
                          className="resize-none border-2 border-blue-200"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`} />
                            <Badge variant="outline" className="text-sm">
                              {formatStatus(project.status)}
                            </Badge>
                            {project.on_hold && (
                              <Badge variant="destructive">ON HOLD</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {editingSections.header ? (
                        <>
                          <Button 
                            onClick={() => handleSectionSave('header')} 
                            disabled={savingSection === 'header'}
                            size="sm"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {savingSection === 'header' ? 'Saving...' : 'Save'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingSections(prev => ({ ...prev, header: false }))}
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingSections(prev => ({ ...prev, header: true }))}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit project details</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy project ID</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share project</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Project Meta Info */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Created {new Date(project.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>Last activity {projectStats.lastActivity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{projectStats.teamMembers} team members</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hold Status Banner */}
        <HoldStatusBanner projectId={projectId} />

        {/* Enhanced Metrics Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Progress Card */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {projectStats.completion >= 75 ? 'On Track' : projectStats.completion >= 50 ? 'Warning' : 'Behind'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overall Progress</p>
                <p className="text-2xl font-bold mb-2">{projectStats.completion}%</p>
                <Progress value={projectStats.completion} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card className="relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tasks</p>
                <p className="text-2xl font-bold">{projectStats.completedTasks}/{projectStats.totalTasks}</p>
                <p className="text-xs text-muted-foreground">
                  {projectStats.totalTasks - projectStats.completedTasks} remaining
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Issues Card */}
          <Card className={`relative ${projectStats.openIssues > 0 ? 'border-orange-200 bg-orange-50' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                {projectStats.openIssues > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Open Issues</p>
                <p className="text-2xl font-bold">{projectStats.openIssues}</p>
                <p className="text-xs text-muted-foreground">
                  {projectStats.openIssues > 0 ? 'Needs attention' : 'All clear'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Budget Card */}
          <Card className="relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PoundSterling className="w-5 h-5 text-purple-600" />
                </div>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Budget</p>
                {projectStats.budgetTotal > 0 ? (
                  <>
                    <p className="text-lg font-bold">
                      £{(projectStats.budgetSpent / 1000).toFixed(0)}k / £{(projectStats.budgetTotal / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((projectStats.budgetSpent / projectStats.budgetTotal) * 100).toFixed(0)}% utilized
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-muted-foreground">Not set</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Enhanced Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Contact & Details - 3/4 width */}
          <div className="xl:col-span-3 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <CardTitle>Contact Information</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingSections.contact ? (
                      <>
                        <Button 
                          onClick={() => handleSectionSave('contact')} 
                          disabled={savingSection === 'contact'}
                          size="sm"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingSection === 'contact' ? 'Saving...' : 'Save'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingSections(prev => ({ ...prev, contact: false }))}
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSections(prev => ({ ...prev, contact: true }))}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Contact Name
                      </label>
                      {editingSections.contact ? (
                        <Input
                          value={project.contact_name || ''}
                          onChange={(e) => setProject({ ...project, contact_name: e.target.value })}
                          placeholder="Enter contact name"
                          className="border-2"
                        />
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {project.contact_name?.split(' ').map(n => n[0]).join('') || 'NA'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{project.contact_name || 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Phone Number
                      </label>
                      {editingSections.contact ? (
                        <Input
                          value={project.contact_phone || ''}
                          onChange={(e) => setProject({ ...project, contact_phone: e.target.value })}
                          placeholder="Enter phone number"
                          className="border-2"
                        />
                      ) : project.contact_phone ? (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${project.contact_phone}`} className="text-blue-600 hover:underline font-medium">
                            {project.contact_phone}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>Not specified</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Email Address
                      </label>
                      {editingSections.contact ? (
                        <Input
                          value={project.contact_email || ''}
                          onChange={(e) => setProject({ ...project, contact_email: e.target.value })}
                          placeholder="Enter email address"
                          type="email"
                          className="border-2"
                        />
                      ) : project.contact_email ? (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${project.contact_email}`} className="text-blue-600 hover:underline font-medium">
                            {project.contact_email}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>Not specified</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Address */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Property Address
                    </label>
                    {editingSections.contact ? (
                      <Textarea
                        value={project.contact_address || ''}
                        onChange={(e) => setProject({ ...project, contact_address: e.target.value })}
                        placeholder="Enter property address"
                        rows={6}
                        className="border-2 resize-none"
                      />
                    ) : project.contact_address ? (
                      <div className="p-3 bg-gray-50 rounded-lg border min-h-[120px]">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium leading-relaxed">{project.contact_address}</p>
                            <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600 mt-2">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View on map
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border text-muted-foreground min-h-[120px]">
                        <div className="text-center">
                          <MapPin className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-sm">No address specified</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Vulnerability Assessment */}
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <div>
                      <CardTitle>Vulnerability Assessment</CardTitle>
                      <CardDescription className="mt-1">
                        Identify customer vulnerabilities for compliance and appropriate care
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.vulnerability_flags?.filter(f => f.length > 1).length > 0 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {project.vulnerability_flags.filter(f => f.length > 1).length} flag{project.vulnerability_flags.filter(f => f.length > 1).length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {editingSections.vulnerability ? (
                      <>
                        <Button 
                          onClick={() => handleSectionSave('vulnerability')} 
                          disabled={savingSection === 'vulnerability'}
                          size="sm"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingSection === 'vulnerability' ? 'Saving...' : 'Save'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingSections(prev => ({ ...prev, vulnerability: false }))}
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSections(prev => ({ ...prev, vulnerability: true }))}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Assess
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingSections.vulnerability ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {VULNERABILITY_OPTIONS.map(({ label, severity, color }) => {
                        const isSelected = project.vulnerability_flags?.includes(label)
                        return (
                          <div
                            key={label}
                            onClick={() => toggleVulnerability(label)}
                            className={`
                              cursor-pointer p-4 rounded-lg border-2 transition-all
                              ${isSelected 
                                ? (color === 'red' ? 'border-red-300 bg-red-50' :
                                   color === 'amber' ? 'border-amber-300 bg-amber-50' :
                                   'border-blue-300 bg-blue-50')
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  isSelected ? (
                                    color === 'red' ? 'bg-red-500 border-red-500' :
                                    color === 'amber' ? 'bg-amber-500 border-amber-500' :
                                    'bg-blue-500 border-blue-500'
                                  ) : 'border-gray-300'
                                }`}>
                                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <span className="font-medium">{label}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  severity === 'high' ? 'border-red-200 text-red-700' :
                                  severity === 'medium' ? 'border-amber-200 text-amber-700' :
                                  'border-blue-200 text-blue-700'
                                }`}
                              >
                                {severity}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Assessment Guidelines</p>
                          <p className="text-amber-700 mt-1">
                            Select all applicable vulnerabilities. High-severity flags require additional care protocols and documentation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {project.vulnerability_flags?.filter(flag => flag.length > 1).length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {project.vulnerability_flags
                            .filter(flag => flag.length > 1)
                            .map(flag => {
                              const config = getVulnerabilityConfig(flag)
                              return (
                                <Badge 
                                  key={flag} 
                                  variant="secondary" 
                                  className={`
                                    ${config.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                      config.severity === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                      'bg-blue-100 text-blue-800 border-blue-200'
                                    } px-3 py-1
                                  `}
                                >
                                  {flag}
                                  <span className="ml-2 text-xs opacity-75">
                                    {config.severity}
                                  </span>
                                </Badge>
                              )
                            })}
                        </div>
                        
                        {/* High severity warning */}
                        {project.vulnerability_flags?.some(flag => 
                          getVulnerabilityConfig(flag).severity === 'high'
                        ) && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-medium text-red-800">High Priority Vulnerabilities Identified</p>
                                <p className="text-red-700 mt-1">
                                  This customer requires enhanced care protocols. Ensure all team members are aware.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No vulnerabilities assessed</p>
                        <p className="text-sm mt-1">Click "Assess" to identify customer vulnerabilities for appropriate care</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointments Section */}
            <ProjectAppointmentsModule projectId={projectId} />

            {/* Compliance & Risk Section */}
            <ProjectComplianceModule projectId={projectId} />
          </div>

          {/* Enhanced Sidebar - 1/4 width */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Add Photos
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {/* Priority Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-600" />
                    Priority Tasks
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-8 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.due}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-auto p-1">
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">JS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">John Smith</p>
                    <p className="text-xs text-muted-foreground">Project Manager</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                </div>
                
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-purple-100 text-purple-700">SJ</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sarah Jones</p>
                    <p className="text-xs text-muted-foreground">Surveyor</p>
                  </div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full" title="Offline" />
                </div>
                
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </CardContent>
            </Card>

            {/* Project Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">John Smith</span> updated project status
                      </p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">Sarah Jones</span> completed survey task
                      </p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        Document uploaded: <span className="font-medium">Survey Report</span>
                      </p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="w-full text-blue-600">
                  View All Activity
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}