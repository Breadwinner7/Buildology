'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  useClaims,
  useClaimHandlers,
  useInsurancePolicies,
  useClaimMutations,
  getClaimStatusColor,
  getClaimStatusLabel,
  getClaimPriorityColor,
  getClaimPriorityLabel,
  getClaimTypeLabel,
  formatCurrency,
  type ClaimFilters,
  type EnhancedClaim
} from '@/hooks/useClaimsManagement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Edit,
  Calendar,
  User,
  MapPin,
  PoundSterling,
  Phone,
  Mail,
  Camera,
  Paperclip,
  MessageSquare,
  RefreshCw,
  ArrowUpDown,
  MoreHorizontal,
  Zap,
  Flag,
  Target,
  Activity,
  TrendingUp,
  Building2,
  Archive
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Status configuration for display
const CLAIM_STATUSES = [
  { value: 'reported', label: 'Reported', color: 'bg-yellow-500', icon: Clock },
  { value: 'investigating', label: 'Investigating', color: 'bg-blue-500', icon: Search },
  { value: 'pending_approval', label: 'Pending Approval', color: 'bg-orange-500', icon: AlertTriangle },
  { value: 'approved', label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  { value: 'declined', label: 'Declined', color: 'bg-red-500', icon: XCircle },
  { value: 'settled', label: 'Settled', color: 'bg-green-600', icon: CheckCircle },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500', icon: Archive }
] as const

const CLAIM_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
] as const

const CLAIM_TYPES = [
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'liability', label: 'Liability' },
  { value: 'business_interruption', label: 'Business Interruption' },
  { value: 'motor', label: 'Motor' },
  { value: 'travel', label: 'Travel' },
  { value: 'personal_accident', label: 'Personal Accident' },
  { value: 'professional_indemnity', label: 'Professional Indemnity' }
] as const

// Helper function to get claim type icon
const getClaimTypeIcon = (claimType: string) => {
  switch (claimType) {
    case 'property_damage': return '🏠'
    case 'liability': return '⚖️'
    case 'business_interruption': return '💼'
    case 'motor': return '🚗'
    case 'travel': return '✈️'
    case 'personal_accident': return '🩹'
    case 'professional_indemnity': return '👔'
    default: return '📋'
  }
}

function ClaimsManagement() {
  const { user } = useUser()
  const router = useRouter()
  const [selectedView, setSelectedView] = useState('all')
  const [filters, setFilters] = useState<Partial<ClaimFilters>>({
    search: '',
    status: [],
    priority: [],
    claim_type: [],
    handler_id: []
  })
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Data fetching
  const claimsQuery = useClaims(filters)
  const { data: handlers = [] } = useClaimHandlers()
  const { data: policies = [] } = useInsurancePolicies()
  const { updateClaim } = useClaimMutations()

  const claims = claimsQuery.data || []
  const isLoading = claimsQuery.isLoading
  const error = claimsQuery.error

  // Filter and search claims
  const filteredClaims = useMemo(() => {
    let filteredClaims = [...claims]

    // Filter by view
    if (selectedView === 'pending') {
      filteredClaims = filteredClaims.filter(claim => claim.status === 'reported' || claim.status === 'pending_approval')
    } else if (selectedView === 'active') {
      filteredClaims = filteredClaims.filter(claim => claim.status === 'investigating' || claim.status === 'approved')
    } else if (selectedView === 'urgent') {
      filteredClaims = filteredClaims.filter(claim => claim.priority === 'urgent' || claim.priority === 'high')
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredClaims = filteredClaims.filter(claim => {
        const searchableText = [
          claim.claim_number,
          claim.incident_description,
          claim.cause_of_loss,
          claim.claim_type,
          claim.handler?.first_name,
          claim.handler?.surname,
          claim.policyholder?.first_name,
          claim.policyholder?.surname,
          claim.policy?.policy_number
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(searchLower)
      })
    }

    // Sort claims
    filteredClaims.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'claim_number':
          aValue = a.claim_number
          bValue = b.claim_number
          break
        case 'policyholder':
          aValue = `${a.policyholder?.first_name} ${a.policyholder?.surname}`
          bValue = `${b.policyholder?.first_name} ${b.policyholder?.surname}`
          break
        case 'estimated_loss':
          aValue = a.estimated_loss || 0
          bValue = b.estimated_loss || 0
          break
        case 'updated_at':
        default:
          aValue = new Date(a.updated_at || a.created_at).getTime()
          bValue = new Date(b.updated_at || b.created_at).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filteredClaims
  }, [claims, selectedView, filters, sortBy, sortOrder])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = claims.length
    const reported = claims.filter(c => c.status === 'reported').length
    const investigating = claims.filter(c => c.status === 'investigating').length
    const approved = claims.filter(c => c.status === 'approved').length
    const settled = claims.filter(c => c.status === 'settled').length
    const urgent = claims.filter(c => c.priority === 'urgent').length
    const totalValue = claims.reduce((sum, claim) => sum + (claim.estimated_loss || 0), 0)
    const settledValue = claims
      .filter(c => c.status === 'settled')
      .reduce((sum, claim) => sum + (claim.final_settlement || claim.estimated_loss || 0), 0)

    return { total, reported, investigating, approved, settled, urgent, totalValue, settledValue }
  }, [claims])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-screen-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-48" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Claims Management</h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive claim processing and workflow management
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => router.push('/claims/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Claim
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load claims data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Claims</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.reported}</p>
                <p className="text-sm text-muted-foreground">Reported</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.investigating}</p>
                <p className="text-sm text-muted-foreground">Investigating</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-600">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.settled}</p>
                <p className="text-sm text-muted-foreground">Settled</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.urgent}</p>
                <p className="text-sm text-muted-foreground">Urgent</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-lg font-bold">{formatCurrency(summaryStats.totalValue)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-lg font-bold">{formatCurrency(summaryStats.settledValue)}</p>
                <p className="text-sm text-muted-foreground">Settled Value</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search claims by number, description, or policyholder..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => claimsQuery.refetch()}
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Claims Overview</CardTitle>
                <CardDescription>
                  {filteredClaims.length} of {claims.length} claims shown
                </CardDescription>
              </div>
              
              <Tabs value={selectedView} onValueChange={setSelectedView}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('claim_number')}
                    >
                      <div className="flex items-center gap-2">
                        Claim Number
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('policyholder')}
                    >
                      <div className="flex items-center gap-2">
                        Policyholder
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('estimated_loss')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Estimated Loss
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Handler</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center gap-2">
                        Last Updated
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => {
                    return (
                      <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{claim.claim_number}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium line-clamp-2">{claim.incident_description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{getClaimTypeIcon(claim.claim_type)}</span>
                              <span>{getClaimTypeLabel(claim.claim_type)}</span>
                              {claim.cause_of_loss && (
                                <>
                                  <span>•</span>
                                  <span>{claim.cause_of_loss}</span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Policy: {claim.policy?.policy_number || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {claim.policyholder?.first_name?.[0]}{claim.policyholder?.surname?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {claim.policyholder?.first_name} {claim.policyholder?.surname}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {claim.policyholder?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              getClaimStatusColor(claim.status)
                            )} />
                            {getClaimStatusLabel(claim.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={claim.priority === 'urgent' || claim.priority === 'high' ? 'destructive' : 'secondary'}
                            className={cn(
                              "gap-1",
                              getClaimPriorityColor(claim.priority || 'normal')
                            )}
                          >
                            {getClaimPriorityLabel(claim.priority || 'normal')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(claim.estimated_loss || 0)}
                          {claim.final_settlement && claim.final_settlement !== claim.estimated_loss && (
                            <div className="text-xs text-green-600">
                              Settled: {formatCurrency(claim.final_settlement)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {claim.handler ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {claim.handler.first_name?.[0]}{claim.handler.surname?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {claim.handler.first_name} {claim.handler.surname}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDistanceToNow(new Date(claim.updated_at || claim.created_at))} ago
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reported: {format(new Date(claim.reported_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/claims/${claim.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/claims/${claim.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withErrorBoundary(ClaimsManagement)