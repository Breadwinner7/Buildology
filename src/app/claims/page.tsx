'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Mock claims data (replace with real API data)
const mockClaims = [
  {
    id: 'CLM-2024-001234',
    title: 'Water Damage - Kitchen Pipe Burst',
    description: 'Significant water damage to kitchen and adjacent areas following pipe burst',
    customer: { name: 'Sarah Johnson', phone: '+44 20 1234 5678', email: 'sarah.j@email.com', avatar: '' },
    property: { address: '123 Oak Street, London, SW1A 1AA' },
    status: 'in_progress',
    priority: 'high',
    claimAmount: 15750,
    estimatedAmount: 18200,
    dateCreated: '2024-01-15T09:30:00Z',
    lastUpdated: '2024-01-18T14:22:00Z',
    assignedTo: { name: 'Michael Chen', avatar: 'MC' },
    category: 'water_damage',
    slaDeadline: '2024-01-22T17:00:00Z',
    nextAction: 'Site inspection scheduled',
    documents: 12,
    photos: 8,
    messages: 3
  },
  {
    id: 'CLM-2024-001235',
    title: 'Storm Damage - Roof Repairs',
    description: 'Storm damage to roof tiles and guttering requiring immediate attention',
    customer: { name: 'David Wilson', phone: '+44 20 2345 6789', email: 'david.w@email.com', avatar: '' },
    property: { address: '456 Elm Grove, Manchester, M1 1AB' },
    status: 'pending_review',
    priority: 'urgent',
    claimAmount: 8900,
    estimatedAmount: 9500,
    dateCreated: '2024-01-16T11:15:00Z',
    lastUpdated: '2024-01-16T11:15:00Z',
    assignedTo: { name: 'Emma Thompson', avatar: 'ET' },
    category: 'storm_damage',
    slaDeadline: '2024-01-17T17:00:00Z',
    nextAction: 'Awaiting adjuster review',
    documents: 5,
    photos: 15,
    messages: 1
  },
  {
    id: 'CLM-2024-001236',
    title: 'Fire Damage - Kitchen Fire',
    description: 'Kitchen fire causing smoke and heat damage to multiple rooms',
    customer: { name: 'Lisa Roberts', phone: '+44 20 3456 7890', email: 'lisa.r@email.com', avatar: '' },
    property: { address: '789 Pine Road, Birmingham, B1 1CD' },
    status: 'completed',
    priority: 'high',
    claimAmount: 22400,
    estimatedAmount: 22400,
    dateCreated: '2024-01-10T08:45:00Z',
    lastUpdated: '2024-01-17T16:30:00Z',
    assignedTo: { name: 'James Wright', avatar: 'JW' },
    category: 'fire_damage',
    slaDeadline: '2024-01-14T17:00:00Z',
    nextAction: 'Claim settled',
    documents: 18,
    photos: 22,
    messages: 7
  }
]

const statusConfig = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: Activity },
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  disputed: { label: 'Disputed', color: 'bg-red-500', icon: XCircle },
  on_hold: { label: 'On Hold', color: 'bg-gray-500', icon: AlertTriangle }
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500' },
  normal: { label: 'Normal', color: 'bg-blue-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500' }
}

const categoryConfig = {
  water_damage: { label: 'Water Damage', icon: '💧' },
  fire_damage: { label: 'Fire Damage', icon: '🔥' },
  storm_damage: { label: 'Storm Damage', icon: '⛈️' },
  theft: { label: 'Theft', icon: '🔒' },
  vandalism: { label: 'Vandalism', icon: '🔨' },
  other: { label: 'Other', icon: '📋' }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function ClaimsManagement() {
  const router = useRouter()
  const [selectedView, setSelectedView] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastUpdated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and search claims
  const filteredClaims = useMemo(() => {
    let claims = [...mockClaims]

    // Filter by view
    if (selectedView === 'pending') {
      claims = claims.filter(claim => claim.status === 'pending_review')
    } else if (selectedView === 'active') {
      claims = claims.filter(claim => claim.status === 'in_progress')
    } else if (selectedView === 'urgent') {
      claims = claims.filter(claim => claim.priority === 'urgent' || claim.priority === 'high')
    }

    // Search filter
    if (searchQuery) {
      claims = claims.filter(claim =>
        claim.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      claims = claims.filter(claim => claim.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      claims = claims.filter(claim => claim.priority === priorityFilter)
    }

    // Sort claims
    claims.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'customer':
          aValue = a.customer.name
          bValue = b.customer.name
          break
        case 'amount':
          aValue = a.claimAmount
          bValue = b.claimAmount
          break
        case 'lastUpdated':
        default:
          aValue = new Date(a.lastUpdated).getTime()
          bValue = new Date(b.lastUpdated).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return claims
  }, [selectedView, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getSLAStatus = (deadline: string, status: string) => {
    if (status === 'completed') return 'completed'
    
    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const timeDiff = deadlineTime - now
    
    if (timeDiff < 0) return 'overdue'
    if (timeDiff < 24 * 60 * 60 * 1000) return 'warning' // Less than 24 hours
    return 'good'
  }

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = mockClaims.length
    const pending = mockClaims.filter(c => c.status === 'pending_review').length
    const inProgress = mockClaims.filter(c => c.status === 'in_progress').length
    const completed = mockClaims.filter(c => c.status === 'completed').length
    const urgent = mockClaims.filter(c => c.priority === 'urgent').length
    const overdue = mockClaims.filter(c => getSLAStatus(c.slaDeadline, c.status) === 'overdue').length
    const totalValue = mockClaims.reduce((sum, claim) => sum + claim.claimAmount, 0)

    return { total, pending, inProgress, completed, urgent, overdue, totalValue }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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
                <p className="text-2xl font-bold">{summaryStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
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
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{summaryStats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xl font-bold">{formatCurrency(summaryStats.totalValue).replace('£', '£').slice(0, -3)}k</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
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
                    placeholder="Search claims by ID, title, or customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
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
                  {filteredClaims.length} of {mockClaims.length} claims shown
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
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-2">
                        Claim ID
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center gap-2">
                        Customer
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Amount
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('lastUpdated')}
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
                    const StatusIcon = statusConfig[claim.status as keyof typeof statusConfig]?.icon
                    const slaStatus = getSLAStatus(claim.slaDeadline, claim.status)
                    
                    return (
                      <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{claim.id}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium line-clamp-1">{claim.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{claim.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{categoryConfig[claim.category as keyof typeof categoryConfig]?.icon}</span>
                              <span>{categoryConfig[claim.category as keyof typeof categoryConfig]?.label}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {claim.assignedTo.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{claim.customer.name}</p>
                              <p className="text-xs text-muted-foreground">{claim.customer.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              statusConfig[claim.status as keyof typeof statusConfig]?.color
                            )} />
                            {statusConfig[claim.status as keyof typeof statusConfig]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={claim.priority === 'urgent' || claim.priority === 'high' ? 'destructive' : 'secondary'}>
                            {priorityConfig[claim.priority as keyof typeof priorityConfig]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(claim.claimAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              slaStatus === 'overdue' ? 'destructive' :
                              slaStatus === 'warning' ? 'secondary' : 'outline'
                            }
                            className={
                              slaStatus === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : ''
                            }
                          >
                            {slaStatus === 'overdue' && '⚠️ Overdue'}
                            {slaStatus === 'warning' && '⏰ Due Soon'}
                            {slaStatus === 'good' && '✅ On Track'}
                            {slaStatus === 'completed' && '✅ Complete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDistanceToNow(new Date(claim.lastUpdated))} ago</p>
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