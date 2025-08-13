'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Users, 
  User,
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  FileText
} from 'lucide-react'

// Import the API functions
import { 
  getPolicyholders, 
  getPolicyholderById,
  createPolicyholder, 
  updatePolicyholder, 
  deletePolicyholder,
  getPolicyholderStats,
  searchPolicyholders,
  type Policyholder,
  type PolicyholderWithDetails,
  type PolicyholderFilters
} from '@/lib/api/policyholders'

export default function PolicyholderManagement() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [policyholders, setPolicyholders] = useState<PolicyholderWithDetails[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPolicyholder, setSelectedPolicyholder] = useState<PolicyholderWithDetails | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [filters, setFilters] = useState<PolicyholderFilters>({
    limit: 25,
    offset: 0
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Load data on component mount
  useEffect(() => {
    loadPolicyholders()
    loadStats()
  }, [filters])

  const loadPolicyholders = async () => {
    try {
      setLoading(true)
      const result = await getPolicyholders(filters)
      setPolicyholders(result.policyholders)
    } catch (error) {
      console.error('Error loading policyholders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const policyholderStats = await getPolicyholderStats()
      setStats(policyholderStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSearch = () => {
    setFilters({ ...filters, search: searchQuery, offset: 0 })
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value, offset: 0 })
  }

  const handleViewPolicyholder = async (policyholderId: string) => {
    try {
      const policyholder = await getPolicyholderById(policyholderId)
      setSelectedPolicyholder(policyholder)
      setSelectedTab('details')
    } catch (error) {
      console.error('Error loading policyholder details:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'prospect': return 'bg-blue-100 text-blue-800'
      case 'lapsed': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-orange-100 text-orange-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'standard': return 'bg-blue-100 text-blue-800'
      case 'elevated': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const formatName = (policyholder: PolicyholderWithDetails) => {
    if (policyholder.type === 'business') {
      return policyholder.business_name || 'Unnamed Business'
    }
    return `${policyholder.first_name || ''} ${policyholder.last_name || ''}`.trim() || 'Unnamed Individual'
  }

  if (loading && !policyholders.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Customer Management</h1>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Customer Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new policyholder in the system
              </DialogDescription>
            </DialogHeader>
            <CreatePolicyholderForm 
              onSuccess={() => {
                setShowCreateDialog(false)
                loadPolicyholders()
                loadStats()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPolicyholders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.newThisMonth} new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePolicyholders}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.activePolicyholders / stats.totalPolicyholders) * 100 || 0).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPolicies}</div>
              <p className="text-xs text-muted-foreground">Active policies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{(stats.totalPremiumValue / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground">Annual premiums</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">Customers</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Customers</CardTitle>
                <CardDescription>Newly added policyholders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {policyholders.slice(0, 5).map((policyholder) => (
                    <div key={policyholder.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {policyholder.type === 'business' ? '🏢' : '👤'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{formatName(policyholder)}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {policyholder.type} • {policyholder.policies.length} policies
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(policyholder.customer_status)}>
                          {policyholder.customer_status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {policyholder.assigned_agent?.first_name} {policyholder.assigned_agent?.surname}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Types */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Breakdown</CardTitle>
                <CardDescription>Distribution by customer type and risk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Individual Customers</span>
                    </span>
                    <div className="text-right">
                      <div className="font-bold">{stats?.individualCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {((stats?.individualCustomers / stats?.totalPolicyholders) * 100 || 0).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Business Customers</span>
                    </span>
                    <div className="text-right">
                      <div className="font-bold">{stats?.businessCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {((stats?.businessCustomers / stats?.totalPolicyholders) * 100 || 0).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>High Risk</span>
                    </span>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{stats?.highRiskCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        Require attention
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common customer management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <Download className="h-4 w-4 mb-1" />
                    <div className="font-medium">Export Customers</div>
                    <div className="text-xs text-muted-foreground">Download customer list</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <Mail className="h-4 w-4 mb-1" />
                    <div className="font-medium">Send Newsletter</div>
                    <div className="text-xs text-muted-foreground">Marketing communications</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <Shield className="h-4 w-4 mb-1" />
                    <div className="font-medium">Risk Review</div>
                    <div className="text-xs text-muted-foreground">Assess high-risk customers</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 justify-start">
                  <div className="text-left">
                    <Calendar className="h-4 w-4 mb-1" />
                    <div className="font-medium">Renewal Reminders</div>
                    <div className="text-xs text-muted-foreground">Upcoming renewals</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                <Select onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Customer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="estate">Estate</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="lapsed">Lapsed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => handleFilterChange('risk_category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Risk Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Risk Levels</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="standard">Standard Risk</SelectItem>
                    <SelectItem value="elevated">Elevated Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customers ({policyholders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policyholders.map((policyholder) => (
                  <div key={policyholder.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {policyholder.type === 'business' ? '🏢' : '👤'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{formatName(policyholder)}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="capitalize">{policyholder.type}</span>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{policyholder.email}</span>
                            </div>
                            {policyholder.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{policyholder.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Badge className={getStatusColor(policyholder.customer_status)}>
                            {policyholder.customer_status}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {policyholder.policies.length} policies
                          </div>
                        </div>
                        <Badge className={getRiskColor(policyholder.risk_category)}>
                          {policyholder.risk_category} risk
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPolicyholder(policyholder.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Agent:</span>
                        <p className="text-muted-foreground">
                          {policyholder.assigned_agent 
                            ? `${policyholder.assigned_agent.first_name} ${policyholder.assigned_agent.surname}`
                            : 'Unassigned'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Customer Since:</span>
                        <p className="text-muted-foreground">
                          {new Date(policyholder.customer_since).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Location:</span>
                        <p className="text-muted-foreground">
                          {`${policyholder.city || 'Unknown'}, ${policyholder.postcode || ''}`}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Total Premium:</span>
                        <p className="text-muted-foreground font-medium">
                          £{policyholder.policies.reduce((sum, policy) => sum + (policy.annual_premium || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {selectedPolicyholder ? (
            <PolicyholderDetailView policyholder={selectedPolicyholder} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Customer Selected</h3>
                  <p className="text-muted-foreground">
                    Select a customer from the list to view details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Analytics</CardTitle>
                <CardDescription>Key customer metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Customer Retention Rate</span>
                    <span className="font-bold text-green-600">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Customer Lifetime Value</span>
                    <span className="font-bold">£15,240</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Customer Acquisition Cost</span>
                    <span className="font-bold">£320</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Policies per Customer</span>
                    <span className="font-bold">
                      {((stats?.totalPolicies || 0) / (stats?.totalPolicyholders || 1)).toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Customer risk category breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Low Risk</span>
                    </span>
                    <span className="font-bold">
                      {Math.floor((stats?.totalPolicyholders || 0) * 0.6)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Standard Risk</span>
                    </span>
                    <span className="font-bold">
                      {Math.floor((stats?.totalPolicyholders || 0) * 0.3)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Elevated Risk</span>
                    </span>
                    <span className="font-bold">
                      {Math.floor((stats?.totalPolicyholders || 0) * 0.07)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>High Risk</span>
                    </span>
                    <span className="font-bold text-red-600">
                      {stats?.highRiskCustomers || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Create Policyholder Form Component
function CreatePolicyholderForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    type: 'individual' as 'individual' | 'business',
    first_name: '',
    last_name: '',
    business_name: '',
    email: '',
    phone: '',
    address_line_1: '',
    city: '',
    postcode: '',
    country: 'UK'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createPolicyholder(formData)
      onSuccess()
    } catch (error) {
      console.error('Error creating policyholder:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="type">Customer Type *</Label>
        <Select
          onValueChange={(value: 'individual' | 'business') => setFormData({ ...formData, type: value })}
          defaultValue="individual"
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === 'individual' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="business_name">Business Name *</Label>
          <Input
            id="business_name"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address_line_1">Address *</Label>
        <Input
          id="address_line_1"
          value={formData.address_line_1}
          onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode *</Label>
          <Input
            id="postcode"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            disabled
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Customer'}
        </Button>
      </div>
    </form>
  )
}

// Policyholder Detail View Component
function PolicyholderDetailView({ policyholder }: { policyholder: PolicyholderWithDetails }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-medium text-2xl">
                  {policyholder.type === 'business' ? '🏢' : '👤'}
                </span>
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {policyholder.type === 'business' ? policyholder.business_name : `${policyholder.first_name} ${policyholder.last_name}`}
                </CardTitle>
                <CardDescription className="text-lg capitalize">
                  {policyholder.type} Customer • {policyholder.policies.length} Policies
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={`px-3 py-1 text-sm ${
                policyholder.customer_status === 'active' ? 'bg-green-100 text-green-800' :
                policyholder.customer_status === 'prospect' ? 'bg-blue-100 text-blue-800' :
                policyholder.customer_status === 'lapsed' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {policyholder.customer_status}
              </Badge>
              <Badge className={`px-3 py-1 text-sm ${
                policyholder.risk_category === 'low' ? 'bg-green-100 text-green-800' :
                policyholder.risk_category === 'standard' ? 'bg-blue-100 text-blue-800' :
                policyholder.risk_category === 'elevated' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {policyholder.risk_category} Risk
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Personal/Business Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {policyholder.type === 'business' ? 'Business Information' : 'Personal Information'}
              </h4>
              <div className="space-y-2">
                {policyholder.type === 'individual' && (
                  <>
                    <div>
                      <span className="font-medium text-sm">Full Name:</span>
                      <p className="text-sm">{policyholder.first_name} {policyholder.middle_names} {policyholder.last_name}</p>
                    </div>
                    {policyholder.date_of_birth && (
                      <div>
                        <span className="font-medium text-sm">Date of Birth:</span>
                        <p className="text-sm">{new Date(policyholder.date_of_birth).toLocaleDateString()}</p>
                      </div>
                    )}
                    {policyholder.occupation && (
                      <div>
                        <span className="font-medium text-sm">Occupation:</span>
                        <p className="text-sm">{policyholder.occupation}</p>
                      </div>
                    )}
                  </>
                )}
                {policyholder.type === 'business' && (
                  <>
                    <div>
                      <span className="font-medium text-sm">Business Name:</span>
                      <p className="text-sm">{policyholder.business_name}</p>
                    </div>
                    {policyholder.business_type && (
                      <div>
                        <span className="font-medium text-sm">Business Type:</span>
                        <p className="text-sm">{policyholder.business_type}</p>
                      </div>
                    )}
                    {policyholder.registration_number && (
                      <div>
                        <span className="font-medium text-sm">Registration Number:</span>
                        <p className="text-sm">{policyholder.registration_number}</p>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <span className="font-medium text-sm">Customer Since:</span>
                  <p className="text-sm">{new Date(policyholder.customer_since).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{policyholder.email}</span>
                </div>
                {policyholder.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{policyholder.phone}</span>
                  </div>
                )}
                {policyholder.mobile && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{policyholder.mobile} (Mobile)</span>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div>{policyholder.address_line_1}</div>
                    {policyholder.address_line_2 && <div>{policyholder.address_line_2}</div>}
                    <div>{policyholder.city}, {policyholder.county}</div>
                    <div>{policyholder.postcode}</div>
                    <div>{policyholder.country}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Account Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-sm">Assigned Agent:</span>
                  <p className="text-sm">
                    {policyholder.assigned_agent 
                      ? `${policyholder.assigned_agent.first_name} ${policyholder.assigned_agent.surname}`
                      : 'Unassigned'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-sm">Payment Method:</span>
                  <p className="text-sm capitalize">{policyholder.payment_method?.replace('_', ' ') || 'Not set'}</p>
                </div>
                {policyholder.no_claims_discount_years > 0 && (
                  <div>
                    <span className="font-medium text-sm">No Claims Discount:</span>
                    <p className="text-sm">{policyholder.no_claims_discount_years} years</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-sm">Marketing Consent:</span>
                  <p className="text-sm">{policyholder.marketing_consent ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      {policyholder.policies && policyholder.policies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insurance Policies</CardTitle>
            <CardDescription>Active and historical policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policyholder.policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{policy.policy_number}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{policy.policy_type}</p>
                    </div>
                    <Badge className={`${
                      policy.status === 'active' ? 'bg-green-100 text-green-800' :
                      policy.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {policy.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Sum Insured:</span>
                      <p className="text-muted-foreground">£{policy.sum_insured?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Annual Premium:</span>
                      <p className="text-muted-foreground">£{policy.annual_premium?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Start Date:</span>
                      <p className="text-muted-foreground">{new Date(policy.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">End Date:</span>
                      <p className="text-muted-foreground">{new Date(policy.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}