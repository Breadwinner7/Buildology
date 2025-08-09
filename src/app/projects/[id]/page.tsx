'use client'

import { useParams } from 'next/navigation'
import { useProject } from '@/hooks/useProject'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectProgressTracker } from '@/components/features/projects/ProjectProgressTracker'
import { HoldStatusBanner } from '@/components/features/projects/HoldStatusBanner'
import { ProjectOverviewPanel } from '@/components/features/projects/ProjectOverviewPanel'
import { ProjectDetailsCard } from '@/components/features/projects/ProjectDetailsCard'
import DocumentsModule from '@/components/features/documents/DocumentsModule' // Add this import
import { 
  Calendar, MapPin, PoundSterling, Clock, User, 
  AlertTriangle, ArrowLeft, Settings, Download, Share, 
  TrendingUp, Target, CheckCircle
} from 'lucide-react'

export default function ProjectOverviewPage() {
  const { id } = useParams()
  const projectId = id as string
  const { project, loading } = useProject(projectId)

  // Add debug logging for projectId
  console.log('🎯 Project Overview - projectId:', projectId, typeof projectId)

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
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': case 'practical completion': return 'bg-green-100 text-green-800 border-green-200'
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Projects</span>
            <span>/</span>
            <span className="font-medium text-foreground">{project.name}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge 
                variant="outline" 
                className={`${getStatusColor(project.status)} border text-xs px-3 py-1`}
              >
                {project.status || 'Active'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>Ref:</span>
                <span className="font-medium">{project.reference || project.id}</span>
              </div>
              {project.project_type && (
                <div className="flex items-center gap-1">
                  <span>Type:</span>
                  <span className="font-medium">{project.project_type}</span>
                </div>
              )}
              {project.contract_value && (
                <div className="flex items-center gap-1">
                  <PoundSterling className="w-3 h-3" />
                  <span className="font-medium">£{project.contract_value.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Hold Status Banner */}
      <HoldStatusBanner projectId={projectId} />

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold">{project.client_name || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-semibold">
                  {project.start_date 
                    ? new Date(project.start_date).toLocaleDateString('en-GB')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target Completion</p>
                <p className="font-semibold">
                  {project.target_completion 
                    ? new Date(project.target_completion).toLocaleDateString('en-GB')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-semibold">{project.region || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectDetailsCard project={project} />
          
          {/* Project Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Progress Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Progress Overview
              </CardTitle>
              <CardDescription>Current project status and completion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectProgressTracker projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content - 1/3 width */}
        <div className="space-y-6">
          <ProjectOverviewPanel project={project} />
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Open Tasks</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Issues</span>
                <Badge variant="destructive">3</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Team Members</span>
                <Badge variant="outline">8</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Documents</span>
                <Badge variant="outline">24</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-4">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documents Section - Add this new section */}
      <div className="mt-8">
        <DocumentsModule projectId={projectId} />
      </div>
    </div>
  )
}