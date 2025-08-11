'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useComplianceChecks,
  useFCAEvents,
  useComplianceMutations,
  COMPLIANCE_CHECK_TYPES,
  RISK_LEVELS,
  getComplianceStatusColor,
  getComplianceStatusLabel,
  getRiskLevelColor,
  getRiskLevelLabel,
  isComplianceExpiring,
  isComplianceOverdue,
  type EnhancedComplianceCheck,
  type EnhancedFCAEvent,
  type CreateComplianceCheckData
} from '@/hooks/useCompliance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  Eye,
  MoreHorizontal,
  Flag,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProjectComplianceModuleProps {
  projectId: string
}

// Compliance check card for project context
function ProjectComplianceCard({ 
  check, 
  onEdit, 
  onView 
}: { 
  check: EnhancedComplianceCheck
  onEdit: () => void
  onView: () => void
}) {
  const isExpiring = check.expiry_date ? isComplianceExpiring(check.expiry_date) : false
  const isOverdue = check.next_review_date ? isComplianceOverdue(check.next_review_date) : false
  const checkType = COMPLIANCE_CHECK_TYPES.find(type => type.value === check.check_type)

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      isExpiring && "border-orange-200 bg-orange-50/50",
      isOverdue && "border-red-200 bg-red-50/50",
      check.compliance_status === 'non_compliant' && "border-red-300 bg-red-50/70"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{checkType?.label}</h4>
                <Badge className={cn("text-xs text-white", getComplianceStatusColor(check.compliance_status))}>
                  {getComplianceStatusLabel(check.compliance_status)}
                </Badge>
              </div>
              <Badge className={cn("text-xs text-white", getRiskLevelColor(check.risk_rating))}>
                {getRiskLevelLabel(check.risk_rating)}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assessed:</span>
              <span>{format(parseISO(check.assessment_date), 'MMM d, yyyy')}</span>
            </div>
            
            {check.expiry_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires:</span>
                <span className={isExpiring ? "text-orange-600 font-medium" : ""}>
                  {format(parseISO(check.expiry_date), 'MMM d')}
                  {isExpiring && (
                    <span className="ml-1 text-xs">
                      ({differenceInDays(parseISO(check.expiry_date), new Date())} days)
                    </span>
                  )}
                </span>
              </div>
            )}

            {isOverdue && check.next_review_date && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Review overdue</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground line-clamp-2">
              <strong>Findings:</strong> {check.findings}
            </p>
            
            {check.action_required && (
              <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Action Required</span>
              </div>
            )}
          </div>

          {check.assessed_by_user && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-xs">
                  {check.assessed_by_user.first_name?.[0]}{check.assessed_by_user.surname?.[0]}
                </AvatarFallback>
              </Avatar>
              <span>{check.assessed_by_user.first_name} {check.assessed_by_user.surname}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// FCA Event card for project context
function ProjectFCAEventCard({ 
  event, 
  onView 
}: { 
  event: EnhancedFCAEvent
  onView: () => void
}) {
  const daysSinceOccurred = differenceInDays(new Date(), parseISO(event.occurred_date))
  const daysUntilDue = differenceInDays(parseISO(event.due_date), new Date())

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      event.severity === 'critical' && "border-red-300 bg-red-50/50",
      event.severity === 'high' && "border-orange-200 bg-orange-50/50"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{event.event_type}</h4>
                <Badge className={cn(
                  "text-xs",
                  event.severity === 'critical' ? 'bg-red-500 text-white' :
                  event.severity === 'high' ? 'bg-orange-500 text-white' :
                  event.severity === 'medium' ? 'bg-yellow-500 text-white' :
                  'bg-blue-500 text-white'
                )}>
                  {event.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{event.event_category.replace('_', ' ')}</p>
            </div>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm line-clamp-1">{event.description}</p>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Due:</span>
              <span className={daysUntilDue < 0 ? "text-red-600 font-medium" : daysUntilDue <= 7 ? "text-orange-600" : ""}>
                {format(parseISO(event.due_date), 'MMM d')}
                {daysUntilDue < 0 && <span className="ml-1 text-xs">(Overdue)</span>}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Create compliance check dialog for project
function CreateProjectComplianceDialog({ 
  open, 
  onOpenChange,
  projectId
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}) {
  const [formData, setFormData] = useState<CreateComplianceCheckData>({
    project_id: projectId,
    check_type: 'data_protection',
    assessment_date: format(new Date(), 'yyyy-MM-dd'),
    risk_rating: 'medium',
    findings: '',
    action_required: false
  })

  const { createComplianceCheck } = useComplianceMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createComplianceCheck.mutateAsync(formData)
      onOpenChange(false)
      setFormData({
        project_id: projectId,
        check_type: 'data_protection',
        assessment_date: format(new Date(), 'yyyy-MM-dd'),
        risk_rating: 'medium',
        findings: '',
        action_required: false
      })
    } catch (error) {
      console.error('Error creating compliance check:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Compliance Check</DialogTitle>
          <DialogDescription>
            Create a compliance assessment for this project
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="check_type">Check Type*</Label>
            <Select 
              value={formData.check_type}
              onValueChange={(value) => setFormData({ ...formData, check_type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_CHECK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessment_date">Assessment Date*</Label>
              <Input
                id="assessment_date"
                type="date"
                value={formData.assessment_date}
                onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_rating">Risk Rating*</Label>
              <Select
                value={formData.risk_rating}
                onValueChange={(value) => setFormData({ ...formData, risk_rating: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", level.color)} />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="findings">Findings*</Label>
            <Textarea
              id="findings"
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              placeholder="Assessment findings and observations..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations || ''}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value || undefined })}
              placeholder="Recommendations for improvement..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createComplianceCheck.isPending || !formData.findings}
            >
              {createComplianceCheck.isPending ? 'Creating...' : 'Create Check'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectComplianceModule({ projectId }: ProjectComplianceModuleProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewCheck, setViewCheck] = useState<EnhancedComplianceCheck | null>(null)
  const [viewEvent, setViewEvent] = useState<EnhancedFCAEvent | null>(null)

  // Fetch compliance data for this project
  const complianceChecksQuery = useComplianceChecks({ project: [projectId] })
  const fcaEventsQuery = useFCAEvents()

  const complianceChecks = complianceChecksQuery.data || []
  const projectFCAEvents = (fcaEventsQuery.data || []).filter(event => event.project_id === projectId)

  // Statistics for this project
  const stats = useMemo(() => {
    const compliantChecks = complianceChecks.filter(c => c.compliance_status === 'compliant').length
    const nonCompliantChecks = complianceChecks.filter(c => c.compliance_status === 'non_compliant').length
    const expiringChecks = complianceChecks.filter(c => c.expiry_date && isComplianceExpiring(c.expiry_date)).length
    const overdueReviews = complianceChecks.filter(c => c.next_review_date && isComplianceOverdue(c.next_review_date)).length
    const openEvents = projectFCAEvents.filter(e => e.status === 'open').length
    const complianceRate = complianceChecks.length > 0 ? Math.round((compliantChecks / complianceChecks.length) * 100) : 100
    
    return {
      totalChecks: complianceChecks.length,
      compliantChecks,
      nonCompliantChecks,
      expiringChecks,
      overdueReviews,
      openEvents,
      complianceRate
    }
  }, [complianceChecks, projectFCAEvents])

  // Get recent checks and events
  const recentChecks = complianceChecks.slice(0, 3)
  const recentEvents = projectFCAEvents.slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Compliance & Risk</h2>
          <p className="text-sm text-muted-foreground">
            Regulatory compliance tracking and risk assessment
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>{stats.complianceRate}% compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>{stats.totalChecks} checks</span>
            </div>
            {stats.openEvents > 0 && (
              <div className="flex items-center gap-1 text-red-600 font-medium">
                <Flag className="w-4 h-4" />
                <span>{stats.openEvents} open events</span>
              </div>
            )}
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Check
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      {stats.totalChecks > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Compliance Rate</p>
                  <p className={cn("text-lg font-bold", stats.complianceRate >= 80 ? "text-green-600" : "text-orange-600")}>
                    {stats.complianceRate}%
                  </p>
                </div>
                <TrendingUp className={cn("w-6 h-6", stats.complianceRate >= 80 ? "text-green-600" : "text-orange-600")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Non-Compliant</p>
                  <p className="text-lg font-bold text-red-600">{stats.nonCompliantChecks}</p>
                </div>
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Expiring Soon</p>
                  <p className="text-lg font-bold text-orange-600">{stats.expiringChecks}</p>
                </div>
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="text-lg font-bold text-red-600">{stats.overdueReviews}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Compliance Checks */}
      {recentChecks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Recent Compliance Checks</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {recentChecks.map((check) => (
              <ProjectComplianceCard
                key={check.id}
                check={check}
                onEdit={() => setViewCheck(check)}
                onView={() => setViewCheck(check)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent FCA Events */}
      {recentEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">FCA Reporting Events</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentEvents.map((event) => (
              <ProjectFCAEventCard
                key={event.id}
                event={event}
                onView={() => setViewEvent(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalChecks === 0 && projectFCAEvents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No compliance data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by creating a compliance assessment for this project.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Compliance Check
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Compliance Check Dialog */}
      <CreateProjectComplianceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
      />

      {/* View Check Dialog */}
      <Dialog open={!!viewCheck} onOpenChange={() => setViewCheck(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {COMPLIANCE_CHECK_TYPES.find(t => t.value === viewCheck?.check_type)?.label}
            </DialogTitle>
            <DialogDescription>
              Compliance check details and assessment
            </DialogDescription>
          </DialogHeader>
          
          {viewCheck && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={cn("text-xs text-white mt-1", getComplianceStatusColor(viewCheck.compliance_status))}>
                    {getComplianceStatusLabel(viewCheck.compliance_status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Risk Rating</Label>
                  <Badge className={cn("text-xs text-white mt-1", getRiskLevelColor(viewCheck.risk_rating))}>
                    {getRiskLevelLabel(viewCheck.risk_rating)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Assessment Date</Label>
                  <p className="text-sm mt-1">{format(parseISO(viewCheck.assessment_date), 'MMMM d, yyyy')}</p>
                </div>
                {viewCheck.expiry_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                    <p className="text-sm mt-1">{format(parseISO(viewCheck.expiry_date), 'MMMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Findings</Label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{viewCheck.findings}</p>
              </div>

              {viewCheck.recommendations && (
                <div>
                  <Label className="text-xs text-muted-foreground">Recommendations</Label>
                  <p className="text-sm mt-1 p-3 bg-blue-50 rounded-md">{viewCheck.recommendations}</p>
                </div>
              )}

              {viewCheck.assessed_by_user && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assessed By</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {viewCheck.assessed_by_user.first_name?.[0]}{viewCheck.assessed_by_user.surname?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{viewCheck.assessed_by_user.first_name} {viewCheck.assessed_by_user.surname}</span>
                    <Badge variant="secondary" className="text-xs">{viewCheck.assessed_by_user.role}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View FCA Event Dialog */}
      <Dialog open={!!viewEvent} onOpenChange={() => setViewEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewEvent?.event_type}</DialogTitle>
            <DialogDescription>FCA reporting event details</DialogDescription>
          </DialogHeader>
          
          {viewEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Badge className={cn(
                    "text-xs text-white mt-1",
                    viewEvent.severity === 'critical' ? 'bg-red-500' :
                    viewEvent.severity === 'high' ? 'bg-orange-500' :
                    viewEvent.severity === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  )}>
                    {viewEvent.severity.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {viewEvent.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{viewEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Occurred</Label>
                  <p className="text-sm mt-1">{format(parseISO(viewEvent.occurred_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p className="text-sm mt-1">{format(parseISO(viewEvent.due_date), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {viewEvent.customer_impact && (
                <div>
                  <Label className="text-xs text-muted-foreground">Customer Impact</Label>
                  <p className="text-sm mt-1">{viewEvent.customer_impact}</p>
                </div>
              )}

              {viewEvent.financial_impact && (
                <div>
                  <Label className="text-xs text-muted-foreground">Financial Impact</Label>
                  <p className="text-sm mt-1 font-medium">£{viewEvent.financial_impact.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}