'use client'

import React, { useState } from 'react'
import { useSurveyForms, useReservingMutations, type SurveyForm } from '@/hooks/useReserving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SurveyForm as SurveyFormComponent } from '@/components/forms/SurveyForm'
import { 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Filter
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

const statusColors = {
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
}

const formTypeLabels = {
  initial_survey: 'Initial Survey',
  detailed_survey: 'Detailed Survey',
  progress_inspection: 'Progress Inspection',
  final_inspection: 'Final Inspection'
}

export default function ProjectSurveysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyForm | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: surveys = [], isLoading, error } = useSurveyForms(id)
  const { createSurveyForm } = useReservingMutations()

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.damage_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.surveyor?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.surveyor?.surname?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || survey.form_status === statusFilter
    const matchesType = typeFilter === 'all' || survey.form_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleCreateSuccess = (survey: SurveyForm) => {
    setShowCreateForm(false)
    setSelectedSurvey(survey)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const surveyStats = {
    total: surveys.length,
    inProgress: surveys.filter(s => s.form_status === 'in_progress').length,
    completed: surveys.filter(s => s.form_status === 'completed').length,
    approved: surveys.filter(s => s.form_status === 'approved').length
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading surveys...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load surveys. Please ensure the database is properly configured.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Surveys</h1>
          <p className="text-muted-foreground">Property assessments and damage surveys</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{surveyStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Surveys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{surveyStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{surveyStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{surveyStats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="initial_survey">Initial Survey</SelectItem>
                  <SelectItem value="detailed_survey">Detailed Survey</SelectItem>
                  <SelectItem value="progress_inspection">Progress Inspection</SelectItem>
                  <SelectItem value="final_inspection">Final Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surveys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Records</CardTitle>
          <CardDescription>
            {filteredSurveys.length} of {surveys.length} surveys
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSurveys.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No surveys found</h3>
              <p>Get started by creating your first property survey</p>
              <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Survey Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Surveyor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {survey.property_type ? `${survey.property_type} Property` : 'Property Survey'}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {survey.damage_summary}
                        </p>
                        {survey.urgent_actions_required && (
                          <Badge variant="destructive" className="mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent Actions Required
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formTypeLabels[survey.form_type as keyof typeof formTypeLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {survey.surveyor?.first_name} {survey.surveyor?.surname}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(survey.survey_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(survey.form_status)}
                        <Badge className={statusColors[survey.form_status as keyof typeof statusColors]}>
                          {survey.form_status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedSurvey(survey)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Survey Form */}
      <SurveyFormComponent
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        projectId={params.id}
        onSuccess={handleCreateSuccess}
      />

      {/* View/Edit Survey Form */}
      {selectedSurvey && (
        <SurveyFormComponent
          isOpen={true}
          onClose={() => setSelectedSurvey(null)}
          projectId={params.id}
          survey={selectedSurvey}
        />
      )}
    </div>
  )
}