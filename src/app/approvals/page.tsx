'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useApprovalRequests,
  usePendingApprovals,
  useApprovalMutations,
  useApprovalUsers,
  getApprovalStatusColor,
  getApprovalStatusLabel,
  getUrgencyColor,
  formatApprovalTime,
  type ApprovalRequest,
  type ApprovalFilters,
  type CreateApprovalRequestData
} from '@/hooks/useDocumentApprovals'
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
import {
  FileText,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Flag,
  Users,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Shield
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const REQUEST_TYPES = [
  'Document Approval',
  'Payment Authorization',
  'Contract Review',
  'Budget Approval',
  'Policy Exception',
  'Access Request',
  'Other'
]

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low Priority', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
]

// Create request dialog
function CreateRequestDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formData, setFormData] = useState<CreateApprovalRequestData>({
    request_type: 'Document Approval',
    description: '',
    justification: '',
    urgency: 'normal',
    required_authority_level: 'manager',
    approvers: []
  })

  const { data: users = [] } = useApprovalUsers()
  const { createRequest } = useApprovalMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createRequest.mutateAsync(formData)
      onOpenChange(false)
      setFormData({
        request_type: 'Document Approval',
        description: '',
        justification: '',
        urgency: 'normal',
        required_authority_level: 'manager',
        approvers: []
      })
    } catch (error) {
      console.error('Error creating approval request:', error)
    }
  }

  const toggleApprover = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.includes(userId)
        ? prev.approvers.filter(id => id !== userId)
        : [...prev.approvers, userId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
          <DialogDescription>
            Create a new approval request and assign reviewers
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request_type">Request Type*</Label>
            <Select 
              value={formData.request_type}
              onValueChange={(value) => setFormData({ ...formData, request_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
              placeholder="Describe what needs approval..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justification</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Explain why this approval is needed..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map(level => (
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
              <Label htmlFor="amount">Amount (Optional)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Approvers</Label>
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleApprover(user.id)}
                >
                  <Checkbox
                    checked={formData.approvers.includes(user.id)}
                    onChange={() => toggleApprover(user.id)}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.first_name?.[0]}{user.surname?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.first_name} {user.surname}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.approvers.length} approver{formData.approvers.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRequest.isPending || !formData.description || formData.approvers.length === 0}
            >
              {createRequest.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Request card component
function RequestCard({ 
  request, 
  onApprove,
  onReject,
  onEscalate
}: { 
  request: ApprovalRequest
  onApprove: () => void
  onReject: () => void
  onEscalate: () => void
}) {
  const { user } = useUser()
  const canApprove = user && request.approvers.includes(user.id) && request.status === 'pending'
  const isExpired = request.expires_at && new Date(request.expires_at) < new Date()

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      request.urgency === 'urgent' && "border-red-200 bg-red-50/50",
      isExpired && "border-orange-200 bg-orange-50/50"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{request.request_type}</h3>
                <Badge className={cn("text-xs text-white", getUrgencyColor(request.urgency))}>
                  {request.urgency.toUpperCase()}
                </Badge>
                {isExpired && (
                  <Badge variant="destructive" className="text-xs">EXPIRED</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {request.description}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canApprove && (
                  <>
                    <DropdownMenuItem onClick={onApprove} className="text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReject} className="text-red-600">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onEscalate}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Request details */}
          <div className="space-y-2">
            {request.amount && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Amount:</span>
                <span>£{request.amount.toLocaleString()}</span>
              </div>
            )}
            
            {request.justification && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Justification: </span>
                {request.justification}
              </div>
            )}
          </div>

          {/* Status and metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs text-white", getApprovalStatusColor(request.status))}>
                {getApprovalStatusLabel(request.status)}
              </Badge>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{request.approvers.length} approver{request.approvers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatApprovalTime(request.created_at)}</span>
            </div>
          </div>

          {/* Requester info */}
          {request.requested_by_user && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Avatar className="w-4 h-4">
                <AvatarImage src={request.requested_by_user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {request.requested_by_user.first_name?.[0]}{request.requested_by_user.surname?.[0]}
                </AvatarFallback>
              </Avatar>
              <span>Requested by {request.requested_by_user.first_name} {request.requested_by_user.surname}</span>
            </div>
          )}

          {/* Approved by info */}
          {request.approved_by_user && (
            <div className="flex items-center gap-2 text-xs text-green-600 pt-2 border-t">
              <CheckCircle className="w-4 h-4" />
              <span>Approved by {request.approved_by_user.first_name} {request.approved_by_user.surname}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main approvals page
export default function ApprovalsPage() {
  const { user } = useUser()
  
  const [filters, setFilters] = useState<Partial<ApprovalFilters>>({
    status: [],
    request_type: '',
    urgency: []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<{request: ApprovalRequest, action: 'approve' | 'reject' | 'escalate'} | null>(null)
  const [actionComments, setActionComments] = useState('')

  // Data fetching
  const allRequestsQuery = useApprovalRequests(filters)
  const pendingQuery = usePendingApprovals(user?.id)
  const { approve, reject, escalate } = useApprovalMutations()

  const allRequests = allRequestsQuery.data || []
  const pendingRequests = pendingQuery.data || []
  const isLoading = allRequestsQuery.isLoading || pendingQuery.isLoading

  // Statistics
  const stats = useMemo(() => {
    const total = allRequests.length
    const pending = allRequests.filter(r => r.status === 'pending').length
    const approved = allRequests.filter(r => r.status === 'approved').length
    const rejected = allRequests.filter(r => r.status === 'rejected').length
    const escalated = allRequests.filter(r => r.status === 'escalated').length
    const urgent = allRequests.filter(r => r.urgency === 'urgent' && r.status === 'pending').length
    
    return { total, pending, approved, rejected, escalated, urgent }
  }, [allRequests])

  const handleAction = async () => {
    if (!approvalAction) return

    try {
      switch (approvalAction.action) {
        case 'approve':
          await approve.mutateAsync({
            requestId: approvalAction.request.id,
            comments: actionComments
          })
          break
        case 'reject':
          await reject.mutateAsync({
            requestId: approvalAction.request.id,
            reason: actionComments || 'No reason provided'
          })
          break
        case 'escalate':
          await escalate.mutateAsync({
            requestId: approvalAction.request.id,
            reason: actionComments || 'No reason provided'
          })
          break
      }
      
      setApprovalAction(null)
      setActionComments('')
    } catch (error) {
      console.error('Error processing approval action:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
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
            <h1 className="text-3xl font-bold tracking-tight">Approval Management</h1>
            <p className="text-muted-foreground">
              Manage approval requests and workflow processes
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => allRequestsQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Escalated</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.escalated}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-2" />
              My Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all">All Requests ({allRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Requests Awaiting Your Approval</CardTitle>
                <CardDescription>
                  Review and approve or reject requests assigned to you
                </CardDescription>
              </CardHeader>
            </Card>

            {pendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => setApprovalAction({request, action: 'approve'})}
                    onReject={() => setApprovalAction({request, action: 'reject'})}
                    onEscalate={() => setApprovalAction({request, action: 'escalate'})}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    No approval requests are currently pending your review.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requests..."
                      className="pl-10 max-w-md"
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
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        {REQUEST_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_LEVELS.map(level => (
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
                )}
              </CardContent>
            </Card>

            {/* All requests */}
            {allRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => setApprovalAction({request, action: 'approve'})}
                    onReject={() => setApprovalAction({request, action: 'reject'})}
                    onEscalate={() => setApprovalAction({request, action: 'escalate'})}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No approval requests</h3>
                  <p className="text-muted-foreground">
                    Create your first approval request to get started.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Request Dialog */}
        <CreateRequestDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {/* Action Dialog */}
        <Dialog open={!!approvalAction} onOpenChange={() => setApprovalAction(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {approvalAction?.action === 'approve' && 'Approve Request'}
                {approvalAction?.action === 'reject' && 'Reject Request'}
                {approvalAction?.action === 'escalate' && 'Escalate Request'}
              </DialogTitle>
              <DialogDescription>
                {approvalAction?.action === 'approve' && 'Add any comments about this approval'}
                {approvalAction?.action === 'reject' && 'Provide a reason for rejection'}
                {approvalAction?.action === 'escalate' && 'Explain why this needs escalation'}
              </DialogDescription>
            </DialogHeader>
            
            {approvalAction && (
              <div className="space-y-4">
                <div className="border rounded-lg p-3 bg-muted/50">
                  <h4 className="font-medium">{approvalAction.request.request_type}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {approvalAction.request.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    {approvalAction.action === 'approve' && 'Comments (Optional)'}
                    {approvalAction.action === 'reject' && 'Rejection Reason*'}
                    {approvalAction.action === 'escalate' && 'Escalation Reason*'}
                  </Label>
                  <Textarea
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    placeholder={
                      approvalAction.action === 'approve' 
                        ? 'Add any comments...' 
                        : 'Provide reason...'
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setApprovalAction(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAction}
                    disabled={
                      (approvalAction.action !== 'approve' && !actionComments.trim()) ||
                      approve.isPending || reject.isPending || escalate.isPending
                    }
                    variant={approvalAction.action === 'reject' ? 'destructive' : 'default'}
                  >
                    {approvalAction.action === 'approve' && <CheckCircle className="w-4 h-4 mr-2" />}
                    {approvalAction.action === 'reject' && <XCircle className="w-4 h-4 mr-2" />}
                    {approvalAction.action === 'escalate' && <AlertTriangle className="w-4 h-4 mr-2" />}
                    {approvalAction.action === 'approve' && 'Approve'}
                    {approvalAction.action === 'reject' && 'Reject'}
                    {approvalAction.action === 'escalate' && 'Escalate'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}