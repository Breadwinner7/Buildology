'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calculator,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Edit,
  Eye,
  Copy,
  Share2,
  Printer,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  Wrench,
  PaintBucket,
  Zap,
  Droplets,
  Home,
  DollarSign,
  BarChart3,
  TrendingUp,
  Archive,
  Database,
  Star,
  Bookmark
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Mock estimates data
const mockEstimates = [
  {
    id: 'EST-2024-0001',
    title: 'Kitchen Water Damage Restoration',
    description: 'Complete kitchen restoration following water damage incident',
    project: { id: 'PRJ-001', name: 'Johnson Residence - Water Damage', client: 'Sarah Johnson' },
    status: 'approved',
    category: 'water_damage',
    totalAmount: 15750,
    laborCost: 8400,
    materialCost: 6200,
    equipmentCost: 1150,
    markup: 12.5,
    dateCreated: '2024-01-15T10:30:00Z',
    dateUpdated: '2024-01-18T15:45:00Z',
    validUntil: '2024-02-15T23:59:59Z',
    estimatedDuration: '5-7 days',
    createdBy: { name: 'Michael Chen', role: 'Senior Estimator' },
    lineItems: [
      { id: 1, description: 'Remove damaged flooring', quantity: 25, unit: 'sq ft', unitPrice: 8.50, total: 212.50, category: 'demolition' },
      { id: 2, description: 'Install new vinyl flooring', quantity: 25, unit: 'sq ft', unitPrice: 24.00, total: 600.00, category: 'flooring' },
      { id: 3, description: 'Kitchen cabinet repair', quantity: 3, unit: 'units', unitPrice: 450.00, total: 1350.00, category: 'carpentry' },
      { id: 4, description: 'Drywall replacement', quantity: 40, unit: 'sq ft', unitPrice: 12.75, total: 510.00, category: 'drywall' },
      { id: 5, description: 'Paint walls and ceiling', quantity: 180, unit: 'sq ft', unitPrice: 3.25, total: 585.00, category: 'painting' }
    ]
  },
  {
    id: 'EST-2024-0002',
    title: 'Storm Damage Roof Repairs',
    description: 'Emergency roof repairs following recent storm damage',
    project: { id: 'PRJ-002', name: 'Wilson Property - Storm Damage', client: 'David Wilson' },
    status: 'pending',
    category: 'storm_damage',
    totalAmount: 8900,
    laborCost: 4200,
    materialCost: 3800,
    equipmentCost: 900,
    markup: 15.0,
    dateCreated: '2024-01-16T09:15:00Z',
    dateUpdated: '2024-01-16T09:15:00Z',
    validUntil: '2024-02-16T23:59:59Z',
    estimatedDuration: '3-4 days',
    createdBy: { name: 'Emma Thompson', role: 'Roofing Specialist' },
    lineItems: [
      { id: 1, description: 'Replace damaged roof tiles', quantity: 120, unit: 'tiles', unitPrice: 18.50, total: 2220.00, category: 'roofing' },
      { id: 2, description: 'Repair guttering system', quantity: 40, unit: 'ft', unitPrice: 25.00, total: 1000.00, category: 'guttering' },
      { id: 3, description: 'Emergency tarpaulin installation', quantity: 1, unit: 'job', unitPrice: 850.00, total: 850.00, category: 'emergency' }
    ]
  }
]

const estimateTemplates = [
  {
    id: 'TEMP-001',
    name: 'Water Damage - Kitchen',
    description: 'Standard water damage restoration for kitchen areas',
    category: 'water_damage',
    estimatedAmount: 12000,
    duration: '4-6 days',
    items: 8
  },
  {
    id: 'TEMP-002',
    name: 'Fire Damage - Living Room',
    description: 'Comprehensive fire damage restoration',
    category: 'fire_damage',
    estimatedAmount: 25000,
    duration: '2-3 weeks',
    items: 15
  },
  {
    id: 'TEMP-003',
    name: 'Storm Damage - Roof',
    description: 'Standard roof repair and replacement',
    category: 'storm_damage',
    estimatedAmount: 8500,
    duration: '3-5 days',
    items: 6
  }
]

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-muted', variant: 'secondary' as const },
  pending: { label: 'Pending Review', color: 'bg-yellow-500', variant: 'secondary' as const },
  approved: { label: 'Approved', color: 'bg-green-500', variant: 'default' as const },
  rejected: { label: 'Rejected', color: 'bg-red-500', variant: 'destructive' as const },
  expired: { label: 'Expired', color: 'bg-muted', variant: 'outline' as const }
}

const categoryConfig = {
  water_damage: { label: 'Water Damage', icon: Droplets, color: 'bg-blue-100 text-blue-800' },
  fire_damage: { label: 'Fire Damage', icon: Zap, color: 'bg-red-100 text-red-800' },
  storm_damage: { label: 'Storm Damage', icon: Home, color: 'bg-purple-100 text-purple-800' },
  general_repair: { label: 'General Repair', icon: Wrench, color: 'bg-green-100 text-green-800' },
  renovation: { label: 'Renovation', icon: PaintBucket, color: 'bg-orange-100 text-orange-800' }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function EstimatesAndPricing() {
  const router = useRouter()
  const [selectedView, setSelectedView] = useState('estimates')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showNewEstimateDialog, setShowNewEstimateDialog] = useState(false)

  // Filter estimates
  const filteredEstimates = useMemo(() => {
    let estimates = [...mockEstimates]

    // Search filter
    if (searchQuery) {
      estimates = estimates.filter(estimate =>
        estimate.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.project.client.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      estimates = estimates.filter(estimate => estimate.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      estimates = estimates.filter(estimate => estimate.category === categoryFilter)
    }

    return estimates
  }, [searchQuery, statusFilter, categoryFilter])

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = mockEstimates.length
    const pending = mockEstimates.filter(e => e.status === 'pending').length
    const approved = mockEstimates.filter(e => e.status === 'approved').length
    const totalValue = mockEstimates.reduce((sum, estimate) => sum + estimate.totalAmount, 0)
    const avgValue = total > 0 ? totalValue / total : 0

    return { total, pending, approved, totalValue, avgValue }
  }, [])

  const handleCreateFromTemplate = (templateId: string) => {
    // Navigate to new estimate with template pre-filled
    router.push(`/estimates/new?template=${templateId}`)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Estimates & Pricing</h1>
            <p className="text-muted-foreground text-lg">
              Professional estimate creation and pricing management
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Pricing DB
            </Button>
            <Dialog open={showNewEstimateDialog} onOpenChange={setShowNewEstimateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Estimate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Estimate</DialogTitle>
                  <DialogDescription>
                    Start with a template or create from scratch
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="templates" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="templates">From Template</TabsTrigger>
                    <TabsTrigger value="scratch">From Scratch</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="templates" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {estimateTemplates.map((template) => {
                        const CategoryIcon = categoryConfig[template.category as keyof typeof categoryConfig]?.icon
                        return (
                          <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-blue-100">
                                    <CategoryIcon className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate">{template.name}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Est. Amount:</span>
                                    <p className="font-semibold">{formatCurrency(template.estimatedAmount)}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Duration:</span>
                                    <p className="font-semibold">{template.duration}</p>
                                  </div>
                                </div>
                                
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleCreateFromTemplate(template.id)}
                                >
                                  Use Template ({template.items} items)
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="scratch" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Quote Title</Label>
                          <Input id="title" placeholder="Enter quote title" />
                        </div>
                        <div>
                          <Label htmlFor="project">Select Project</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prj-001">Johnson Residence - Water Damage</SelectItem>
                              <SelectItem value="prj-002">Wilson Property - Storm Damage</SelectItem>
                              <SelectItem value="prj-003">Roberts Home - Fire Damage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="water_damage">Water Damage</SelectItem>
                              <SelectItem value="fire_damage">Fire Damage</SelectItem>
                              <SelectItem value="storm_damage">Storm Damage</SelectItem>
                              <SelectItem value="general_repair">General Repair</SelectItem>
                              <SelectItem value="renovation">Renovation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="Describe the work to be performed" rows={3} />
                        </div>
                        <div>
                          <Label htmlFor="duration">Estimated Duration</Label>
                          <Input id="duration" placeholder="e.g., 5-7 days" />
                        </div>
                        <div>
                          <Label htmlFor="markup">Markup (%)</Label>
                          <Input id="markup" type="number" placeholder="15" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewEstimateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setShowNewEstimateDialog(false)
                    router.push('/quotes/new')
                  }}>
                    Create Quote
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Estimates</p>
                  <p className="text-3xl font-bold">{summaryStats.total}</p>
                </div>
                <Calculator className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-3xl font-bold">{summaryStats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold">{summaryStats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold">{formatCurrency(summaryStats.totalValue).slice(0, -3)}k</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="estimates">All Estimates</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Database</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="estimates" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search estimates by ID, title, or client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="water_damage">Water Damage</SelectItem>
                        <SelectItem value="fire_damage">Fire Damage</SelectItem>
                        <SelectItem value="storm_damage">Storm Damage</SelectItem>
                        <SelectItem value="general_repair">General Repair</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimates Table */}
            <Card>
              <CardHeader>
                <CardTitle>Estimates Overview</CardTitle>
                <CardDescription>
                  {filteredEstimates.length} of {mockEstimates.length} estimates shown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estimate ID</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEstimates.map((estimate) => {
                        const CategoryIcon = categoryConfig[estimate.category as keyof typeof categoryConfig]?.icon
                        
                        return (
                          <TableRow key={estimate.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-mono text-sm">{estimate.id}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium line-clamp-1">{estimate.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{estimate.description}</p>
                                <p className="text-xs text-muted-foreground">Duration: {estimate.estimatedDuration}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{estimate.project.client}</p>
                                <p className="text-sm text-muted-foreground">{estimate.project.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={categoryConfig[estimate.category as keyof typeof categoryConfig]?.color}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {categoryConfig[estimate.category as keyof typeof categoryConfig]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[estimate.status as keyof typeof statusConfig]?.variant}>
                                {statusConfig[estimate.status as keyof typeof statusConfig]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <p className="font-bold">{formatCurrency(estimate.totalAmount)}</p>
                                <p className="text-sm text-muted-foreground">+{estimate.markup}% markup</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{format(new Date(estimate.validUntil), 'MMM dd, yyyy')}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/estimates/${estimate.id}`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/estimates/${estimate.id}/edit`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
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
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Estimate Templates</CardTitle>
                <CardDescription>Reusable templates for common estimate types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {estimateTemplates.map((template) => {
                    const CategoryIcon = categoryConfig[template.category as keyof typeof categoryConfig]?.icon
                    return (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                  <CategoryIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{template.name}</h3>
                                  <p className="text-sm text-muted-foreground">{template.description}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Star className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Est. Amount</p>
                                <p className="text-lg font-bold">{formatCurrency(template.estimatedAmount)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Duration</p>
                                <p className="text-lg font-bold">{template.duration}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{template.items} line items</Badge>
                              <Badge variant="outline" className={categoryConfig[template.category as keyof typeof categoryConfig]?.color}>
                                {categoryConfig[template.category as keyof typeof categoryConfig]?.label}
                              </Badge>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleCreateFromTemplate(template.id)}
                              >
                                Use Template
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Database</CardTitle>
                <CardDescription>Standardized pricing for materials, labor, and equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Pricing Database</h3>
                  <p className="text-muted-foreground mb-4">Comprehensive pricing data will be displayed here</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Pricing Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Estimate Analytics</CardTitle>
                <CardDescription>Performance metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground mb-4">Detailed analytics and reporting will be displayed here</p>
                  <Button>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default withErrorBoundary(EstimatesAndPricing)