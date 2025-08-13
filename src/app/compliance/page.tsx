'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useComplianceChecks,
  useFCAEvents,
  useRiskAssessments,
  useComplianceMutations,
  COMPLIANCE_CHECK_TYPES,
  RISK_LEVELS,
  FCA_EVENT_CATEGORIES,
  getComplianceStatusColor,
  getComplianceStatusLabel,
  getRiskLevelColor,
  getRiskLevelLabel,
  getFCAEventStatusColor,
  isComplianceExpiring,
  isComplianceOverdue,
  type EnhancedComplianceCheck,
  type EnhancedFCAEvent,
  type EnhancedRiskAssessment,
  type ComplianceFilters,
  type RiskFilters,
  type CreateComplianceCheckData,
  type CreateFCAEventData,
  type UpdateComplianceCheckData
} from '@/hooks/useCompliance'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  Flag,
  Activity,
  BarChart3,
  PieChart,
  AlertCircle,
  Target,
  Zap,
  MapPin
} from 'lucide-react'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Compliance check card component
function ComplianceCheckCard({ 
  check, 
  onEdit, 
  onView 
}: { 
  check: EnhancedComplianceCheck
  onEdit: () => void
  onView: () => void
}) {
  const isExpiring = check.expiry_date ? isComplianceExpiring(check.expiry_date) : false
  const isOverdue = false // No next_review_date field in current schema
  const checkType = COMPLIANCE_CHECK_TYPES.find(type => type.value === check.regulation_type) || { label: check.regulation_type, description: '', value: check.regulation_type }

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
                <Badge className={cn("text-xs text-white", getRiskLevelColor(check.risk_rating))}>
                  {getRiskLevelLabel(check.risk_rating)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{checkType?.description}</p>
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
              <span className="text-muted-foreground">Assessment Date:</span>
              <span>{format(parseISO(check.assessment_date), 'MMM d, yyyy')}</span>
            </div>
            
            {check.expiry_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires:</span>
                <span className={isExpiring ? "text-orange-600 font-medium" : ""}>
                  {format(parseISO(check.expiry_date), 'MMM d, yyyy')}
                  {isExpiring && (
                    <span className="ml-1 text-xs">
                      ({differenceInDays(parseISO(check.expiry_date), new Date())} days)
                    </span>
                  )}
                </span>
              </div>
            )}

            {check.reference_number && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs">
                  {check.reference_number}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              <strong>Notes:</strong> {check.notes}
            </p>
            
            {check.compliance_status === 'non_compliant' && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="w-3 h-3" />
                <span>Non-Compliant</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            {check.project && (
              <Badge variant="secondary" className="text-xs">
                {check.project.name}
              </Badge>
            )}
            
            {check.assessed_by_user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-xs">
                    {check.assessed_by_user.first_name?.[0]}{check.assessed_by_user.surname?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{check.assessed_by_user.first_name} {check.assessed_by_user.surname}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// FCA Event card component
function FCAEventCard({ 
  event, 
  onEdit, 
  onView 
}: { 
  event: EnhancedFCAEvent
  onEdit: () => void
  onView: () => void
}) {
  const category = FCA_EVENT_CATEGORIES.find(cat => cat.value === event.event_category)
  const daysSinceOccurred = differenceInDays(new Date(), parseISO(event.occurred_date))
  const daysUntilDue = differenceInDays(parseISO(event.due_date), new Date())

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      event.severity === 'critical' && "border-red-300 bg-red-50/50",
      event.severity === 'high' && "border-orange-200 bg-orange-50/50",
      daysUntilDue < 0 && "border-red-200 bg-red-50/30"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{event.event_type}</h4>
                <Badge className={cn("text-xs text-white", getFCAEventStatusColor(event.status))}>
                  {event.status.replace('_', ' ').toUpperCase()}
                </Badge>
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
              <p className="text-xs text-muted-foreground">{category?.label}</p>
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

          <p className="text-sm line-clamp-2">{event.description}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Occurred:</span>
              <span>{format(parseISO(event.occurred_date), 'MMM d, yyyy')} ({daysSinceOccurred} days ago)</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Due Date:</span>
              <span className={daysUntilDue < 0 ? "text-red-600 font-medium" : daysUntilDue <= 7 ? "text-orange-600" : ""}>
                {format(parseISO(event.due_date), 'MMM d, yyyy')}
                {daysUntilDue < 0 && <span className="ml-1 text-xs">(Overdue)</span>}
                {daysUntilDue >= 0 && daysUntilDue <= 7 && <span className="ml-1 text-xs">({daysUntilDue} days)</span>}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Regulatory Impact:</span>
              <Badge className={cn("text-xs", getRiskLevelColor(event.regulatory_impact))}>
                {getRiskLevelLabel(event.regulatory_impact)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            {event.project && (
              <Badge variant="secondary" className="text-xs">
                {event.project.name}
              </Badge>
            )}
            
            {event.reported_by_user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{event.reported_by_user.first_name} {event.reported_by_user.surname}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Create compliance check dialog
function CreateComplianceDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formData, setFormData] = useState<CreateComplianceCheckData>({
    regulation_type: '',
    compliance_status: 'pending_review',
    check_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    reference_number: '',
    notes: ''
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-compliance'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name')
      return data || []
    }
  })

  const { createComplianceCheck } = useComplianceMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createComplianceCheck.mutateAsync(formData)
      toast.success('Compliance check created successfully')
      onOpenChange(false)
      setFormData({
        regulation_type: '',
        compliance_status: 'pending_review',
        check_date: format(new Date(), 'yyyy-MM-dd'),
        expiry_date: '',
        reference_number: '',
        notes: ''
      })
    } catch (error) {
      console.error('Error creating compliance check:', error)
      toast.error('Failed to create compliance check')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Compliance Check</DialogTitle>
          <DialogDescription>
            Create a new compliance assessment
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regulation_type">Regulation Type*</Label>
            <Select 
              value={formData.regulation_type}
              onValueChange={(value) => setFormData({ ...formData, regulation_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select regulation type" />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_CHECK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.label}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_id">Project (Optional)</Label>
            <Select
              value={formData.project_id || ''}
              onValueChange={(value) => setFormData({ ...formData, project_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">No specific project</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_date">Check Date*</Label>
              <Input
                id="check_date"
                type="date"
                value={formData.check_date}
                onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compliance_status">Status*</Label>
              <Select
                value={formData.compliance_status}
                onValueChange={(value) => setFormData({ ...formData, compliance_status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value || '' })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number || ''}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="e.g., COMP-2024-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Assessment notes and observations..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createComplianceCheck.isPending || !formData.regulation_type}
            >
              {createComplianceCheck.isPending ? 'Creating...' : 'Create Check'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit compliance check form
function EditComplianceForm({ 
  check, 
  onClose 
}: { 
  check: EnhancedComplianceCheck
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    compliance_status: check.compliance_status,
    notes: check.notes || '',
    reference_number: check.reference_number || ''
  })

  const { updateComplianceCheck } = useComplianceMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateComplianceCheck.mutateAsync({ 
        id: check.id, 
        data: formData 
      })
      toast.success('Compliance check updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating compliance check:', error)
      toast.error('Failed to update compliance check')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="compliance_status">Status*</Label>
        <Select
          value={formData.compliance_status}
          onValueChange={(value) => setFormData({ ...formData, compliance_status: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="non_compliant">Non-Compliant</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference_number">Reference Number</Label>
        <Input
          id="reference_number"
          value={formData.reference_number}
          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
          placeholder="e.g., COMP-2024-001"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Updated notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateComplianceCheck.isPending}>
          {updateComplianceCheck.isPending ? 'Updating...' : 'Update'}
        </Button>
      </div>
    </form>
  )
}

// Edit FCA event form
function EditFCAEventForm({ 
  event, 
  onClose 
}: { 
  event: EnhancedFCAEvent
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    status: event.status,
    remedial_action: event.remedial_action || '',
    lessons_learned: event.lessons_learned || '',
    reported_to_fca: event.reported_to_fca || false,
    fca_reference: event.fca_reference || ''
  })

  const { updateFCAEvent } = useComplianceMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateFCAEvent.mutateAsync({ 
        id: event.id, 
        data: formData 
      })
      toast.success('FCA event updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating FCA event:', error)
      toast.error('Failed to update FCA event')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status*</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remedial_action">Remedial Action</Label>
        <Textarea
          id="remedial_action"
          value={formData.remedial_action}
          onChange={(e) => setFormData({ ...formData, remedial_action: e.target.value })}
          placeholder="Actions taken to remedy the issue..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessons_learned">Lessons Learned</Label>
        <Textarea
          id="lessons_learned"
          value={formData.lessons_learned}
          onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
          placeholder="What was learned from this event..."
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reported_to_fca"
          checked={formData.reported_to_fca}
          onCheckedChange={(checked) => setFormData({ ...formData, reported_to_fca: !!checked })}
        />
        <Label htmlFor="reported_to_fca" className="text-sm">Reported to FCA</Label>
      </div>

      {formData.reported_to_fca && (
        <div className="space-y-2">
          <Label htmlFor="fca_reference">FCA Reference</Label>
          <Input
            id="fca_reference"
            value={formData.fca_reference}
            onChange={(e) => setFormData({ ...formData, fca_reference: e.target.value })}
            placeholder="FCA reference number"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateFCAEvent.isPending}>
          {updateFCAEvent.isPending ? 'Updating...' : 'Update'}
        </Button>
      </div>
    </form>
  )
}

// Create FCA event dialog
function CreateFCAEventDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formData, setFormData] = useState<CreateFCAEventData>({
    event_type: '',
    event_category: 'other',
    severity: 'medium',
    description: '',
    occurred_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    regulatory_impact: 'medium'
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-fca'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name')
      return data || []
    }
  })

  const { createFCAEvent } = useComplianceMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createFCAEvent.mutateAsync(formData)
      toast.success('FCA event reported successfully')
      onOpenChange(false)
      setFormData({
        event_type: '',
        event_category: 'other',
        severity: 'medium',
        description: '',
        occurred_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        regulatory_impact: 'medium'
      })
    } catch (error) {
      console.error('Error creating FCA event:', error)
      toast.error('Failed to report FCA event')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report FCA Event</DialogTitle>
          <DialogDescription>
            Report a new regulatory event for FCA reporting
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_type">Event Type*</Label>
            <Input
              id="event_type"
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              placeholder="Brief description of the event type..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_category">Category*</Label>
              <Select
                value={formData.event_category}
                onValueChange={(value) => setFormData({ ...formData, event_category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FCA_EVENT_CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      <div>
                        <div className="font-medium">{category.label}</div>
                        <div className="text-xs text-muted-foreground">{category.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity*</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_id">Related Project</Label>
            <Select
              value={formData.project_id || ''}
              onValueChange={(value) => setFormData({ ...formData, project_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">No specific project</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the event..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occurred_date">Occurred Date*</Label>
              <Input
                id="occurred_date"
                type="date"
                value={formData.occurred_date}
                onChange={(e) => setFormData({ ...formData, occurred_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Response Due Date*</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regulatory_impact">Regulatory Impact*</Label>
            <Select
              value={formData.regulatory_impact}
              onValueChange={(value) => setFormData({ ...formData, regulatory_impact: value as any })}
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

          <div className="space-y-2">
            <Label htmlFor="customer_impact">Customer Impact</Label>
            <Textarea
              id="customer_impact"
              value={formData.customer_impact || ''}
              onChange={(e) => setFormData({ ...formData, customer_impact: e.target.value || undefined })}
              placeholder="Description of impact on customers..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="financial_impact">Financial Impact (£)</Label>
            <Input
              id="financial_impact"
              type="number"
              min="0"
              step="0.01"
              value={formData.financial_impact || ''}
              onChange={(e) => setFormData({ ...formData, financial_impact: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createFCAEvent.isPending || !formData.event_type || !formData.description}
            >
              {createFCAEvent.isPending ? 'Creating...' : 'Report Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main compliance page
export default function CompliancePage() {
  const { user } = useUser()
  
  const [complianceFilters, setComplianceFilters] = useState<Partial<ComplianceFilters>>({
    search: '',
    status: [],
    checkType: [],
    riskRating: []
  })
  const [showComplianceFilters, setShowComplianceFilters] = useState(false)
  const [createComplianceDialogOpen, setCreateComplianceDialogOpen] = useState(false)
  const [createFCADialogOpen, setCreateFCADialogOpen] = useState(false)
  const [viewCheck, setViewCheck] = useState<EnhancedComplianceCheck | null>(null)
  const [viewEvent, setViewEvent] = useState<EnhancedFCAEvent | null>(null)
  const [editCheck, setEditCheck] = useState<EnhancedComplianceCheck | null>(null)
  const [editEvent, setEditEvent] = useState<EnhancedFCAEvent | null>(null)

  // Data fetching
  const complianceChecksQuery = useComplianceChecks(complianceFilters)
  const fcaEventsQuery = useFCAEvents()

  const complianceChecks = complianceChecksQuery.data || []
  const fcaEvents = fcaEventsQuery.data || []
  const isLoading = complianceChecksQuery.isLoading || fcaEventsQuery.isLoading

  // Statistics
  const stats = useMemo(() => {
    const compliantChecks = complianceChecks.filter(c => c.compliance_status === 'compliant').length
    const nonCompliantChecks = complianceChecks.filter(c => c.compliance_status === 'non_compliant').length
    const expiringChecks = complianceChecks.filter(c => c.expiry_date && isComplianceExpiring(c.expiry_date)).length
    const overdueReviews = complianceChecks.filter(c => c.next_review_date && isComplianceOverdue(c.next_review_date)).length
    
    const openFCAEvents = fcaEvents.filter(e => e.status === 'open').length
    const criticalEvents = fcaEvents.filter(e => e.severity === 'critical').length
    const overdueFCAEvents = fcaEvents.filter(e => differenceInDays(parseISO(e.due_date), new Date()) < 0).length
    
    const complianceRate = complianceChecks.length > 0 ? Math.round((compliantChecks / complianceChecks.length) * 100) : 100
    
    return {
      totalChecks: complianceChecks.length,
      compliantChecks,
      nonCompliantChecks,
      expiringChecks,
      overdueReviews,
      openFCAEvents,
      criticalEvents,
      overdueFCAEvents,
      complianceRate
    }
  }, [complianceChecks, fcaEvents])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
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
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance & Risk Management</h1>
            <p className="text-muted-foreground">
              Monitor regulatory compliance, risk assessments, and FCA reporting
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => complianceChecksQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateComplianceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Check
            </Button>
            <Button onClick={() => setCreateFCADialogOpen(true)} variant="outline">
              <Flag className="w-4 h-4 mr-2" />
              Report Event
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Compliance Rate</p>
                  <p className="text-2xl font-bold text-green-600">{stats.complianceRate}%</p>
                </div>
                <div className="relative">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <Progress value={stats.complianceRate} className="absolute -bottom-1 w-8 h-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Non-Compliant</p>
                  <p className="text-2xl font-bold text-red-600">{stats.nonCompliantChecks}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.expiringChecks}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Overdue Reviews</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdueReviews}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Open FCA Events</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.openFCAEvents}</p>
                </div>
                <Flag className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Critical Events</p>
                  <p className="text-2xl font-bold text-red-600">{stats.criticalEvents}</p>
                </div>
                <Zap className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Overdue Events</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.overdueFCAEvents}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Checks</p>
                  <p className="text-2xl font-bold">{stats.totalChecks}</p>
                </div>
                <Shield className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="compliance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compliance">
              <Shield className="w-4 h-4 mr-2" />
              Compliance Checks ({complianceChecks.length})
            </TabsTrigger>
            <TabsTrigger value="fca">
              <Flag className="w-4 h-4 mr-2" />
              FCA Events ({fcaEvents.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search compliance checks..."
                      value={complianceFilters.search}
                      onChange={(e) => setComplianceFilters({ ...complianceFilters, search: e.target.value })}
                      className="pl-10 max-w-md"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowComplianceFilters(!showComplianceFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {showComplianceFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>

                {showComplianceFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliant">Compliant</SelectItem>
                        <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by check type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_CHECK_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Checks Grid */}
            {complianceChecksQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24 mb-4" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : complianceChecksQuery.error ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-red-600">Failed to load compliance checks</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading your compliance data. Please try again.
                  </p>
                  <Button onClick={() => complianceChecksQuery.refetch()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : complianceChecks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {complianceChecks.map((check) => (
                  <ComplianceCheckCard
                    key={check.id}
                    check={check}
                    onEdit={() => setEditCheck(check)}
                    onView={() => setViewCheck(check)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No compliance checks found</h3>
                  <p className="text-muted-foreground mb-4">
                    {complianceFilters.search ? 
                      "No compliance checks match your search criteria." :
                      "Create your first compliance assessment to get started."
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    {complianceFilters.search && (
                      <Button 
                        variant="outline" 
                        onClick={() => setComplianceFilters({ ...complianceFilters, search: '' })}
                      >
                        Clear Search
                      </Button>
                    )}
                    <Button onClick={() => setCreateComplianceDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Compliance Check
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fca" className="space-y-4">
            {/* FCA Events Grid */}
            {fcaEventsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24 mb-4" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : fcaEventsQuery.error ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-red-600">Failed to load FCA events</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading your FCA event data. Please try again.
                  </p>
                  <Button onClick={() => fcaEventsQuery.refetch()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : fcaEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fcaEvents.map((event) => (
                  <FCAEventCard
                    key={event.id}
                    event={event}
                    onEdit={() => setEditEvent(event)}
                    onView={() => setViewEvent(event)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Flag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No FCA events reported</h3>
                  <p className="text-muted-foreground mb-4">
                    Report regulatory events as they occur for FCA compliance.
                  </p>
                  <Button onClick={() => setCreateFCADialogOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    Report FCA Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Trends</CardTitle>
                  <CardDescription>Track compliance performance over time</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <PieChart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Heat Map</CardTitle>
                  <CardDescription>Visualize risk distribution across checks</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Risk analytics coming soon</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Compliance Dialog */}
        <CreateComplianceDialog
          open={createComplianceDialogOpen}
          onOpenChange={setCreateComplianceDialogOpen}
        />

        {/* Create FCA Event Dialog */}
        <CreateFCAEventDialog
          open={createFCADialogOpen}
          onOpenChange={setCreateFCADialogOpen}
        />

        {/* View Compliance Check Dialog */}
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

                {viewCheck.remedial_actions && viewCheck.remedial_actions.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Remedial Actions</Label>
                    <div className="mt-1 space-y-1">
                      {viewCheck.remedial_actions.map((action, index) => (
                        <div key={index} className="text-sm p-2 bg-yellow-50 rounded-md">
                          • {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewCheck.project && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Related Project</Label>
                    <p className="text-sm mt-1">{viewCheck.project.name}</p>
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

        {/* Edit Compliance Check Dialog */}
        <Dialog open={!!editCheck} onOpenChange={() => setEditCheck(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Compliance Status</DialogTitle>
              <DialogDescription>
                Update the status and details of this compliance check
              </DialogDescription>
            </DialogHeader>
            {editCheck && <EditComplianceForm check={editCheck} onClose={() => setEditCheck(null)} />}
          </DialogContent>
        </Dialog>

        {/* Edit FCA Event Dialog */}
        <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Update FCA Event</DialogTitle>
              <DialogDescription>
                Update the status and details of this FCA event
              </DialogDescription>
            </DialogHeader>
            {editEvent && <EditFCAEventForm event={editEvent} onClose={() => setEditEvent(null)} />}
          </DialogContent>
        </Dialog>

        {/* View FCA Event Dialog */}
        <Dialog open={!!viewEvent} onOpenChange={() => setViewEvent(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewEvent?.event_type}</DialogTitle>
              <DialogDescription>
                FCA reporting event details
              </DialogDescription>
            </DialogHeader>
            
            {viewEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge className={cn("text-xs text-white mt-1", getFCAEventStatusColor(viewEvent.status))}>
                      {viewEvent.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
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
                    <Label className="text-xs text-muted-foreground">Regulatory Impact</Label>
                    <Badge className={cn("text-xs text-white mt-1", getRiskLevelColor(viewEvent.regulatory_impact))}>
                      {getRiskLevelLabel(viewEvent.regulatory_impact)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{viewEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Occurred Date</Label>
                    <p className="text-sm mt-1">{format(parseISO(viewEvent.occurred_date), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <p className="text-sm mt-1">{format(parseISO(viewEvent.due_date), 'MMMM d, yyyy')}</p>
                  </div>
                </div>

                {viewEvent.customer_impact && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer Impact</Label>
                    <p className="text-sm mt-1 p-3 bg-blue-50 rounded-md">{viewEvent.customer_impact}</p>
                  </div>
                )}

                {viewEvent.financial_impact && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Financial Impact</Label>
                    <p className="text-sm mt-1 font-medium">£{viewEvent.financial_impact.toLocaleString()}</p>
                  </div>
                )}

                {viewEvent.remedial_actions && viewEvent.remedial_actions.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Remedial Actions</Label>
                    <div className="mt-1 space-y-1">
                      {viewEvent.remedial_actions.map((action, index) => (
                        <div key={index} className="text-sm p-2 bg-green-50 rounded-md">
                          • {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewEvent.project && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Related Project</Label>
                    <p className="text-sm mt-1">{viewEvent.project.name}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  {viewEvent.reported_by_user && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reported By</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {viewEvent.reported_by_user.first_name?.[0]}{viewEvent.reported_by_user.surname?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{viewEvent.reported_by_user.first_name} {viewEvent.reported_by_user.surname}</span>
                      </div>
                    </div>
                  )}

                  {viewEvent.assigned_to_user && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Assigned To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {viewEvent.assigned_to_user.first_name?.[0]}{viewEvent.assigned_to_user.surname?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{viewEvent.assigned_to_user.first_name} {viewEvent.assigned_to_user.surname}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}