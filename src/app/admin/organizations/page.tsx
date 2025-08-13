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
  Building, 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Eye,
  Filter,
  Download
} from 'lucide-react'

// Import the API functions
import { 
  getCompanies, 
  getCompanyById,
  createCompany, 
  updateCompany, 
  deleteCompany,
  getCompanyStats,
  getCompaniesByType,
  addCompanyContact,
  type Company,
  type CompanyWithContacts,
  type CompanyFilters
} from '@/lib/api/companies'

export default function OrganizationManagement() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [filters, setFilters] = useState<CompanyFilters>({
    limit: 25,
    offset: 0
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Load data on component mount
  useEffect(() => {
    loadCompanies()
    loadStats()
  }, [filters])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const result = await getCompanies(filters)
      setCompanies(result.companies)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const companyStats = await getCompanyStats()
      setStats(companyStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSearch = () => {
    setFilters({ ...filters, search: searchQuery, offset: 0 })
  }

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" to empty string for the API
    const filterValue = value === 'all' ? '' : value
    setFilters({ ...filters, [key]: filterValue, offset: 0 })
  }

  const handleViewCompany = async (companyId: string) => {
    try {
      const company = await getCompanyById(companyId)
      setSelectedCompany(company)
      setSelectedTab('details')
    } catch (error) {
      console.error('Error loading company details:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-muted text-foreground'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const getCompanyTypeIcon = (type: string) => {
    switch (type) {
      case 'insurance_company': return '🏛️'
      case 'contractor': return '🔨'
      case 'service_provider': return '⚙️'
      case 'loss_adjuster': return '🔍'
      case 'surveyor': return '📋'
      default: return '🏢'
    }
  }

  if (loading && !companies.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Building className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Organization Management</h1>
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
          <Building className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Organization Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Organization</DialogTitle>
              <DialogDescription>
                Create a new organization in the system
              </DialogDescription>
            </DialogHeader>
            <CreateOrganizationForm 
              onSuccess={() => {
                setShowCreateDialog(false)
                loadCompanies()
                loadStats()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentlyAdded} added this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCompanies}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insurance Companies</CardTitle>
              <span className="text-lg">🏛️</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.insuranceCompanies}</div>
              <p className="text-xs text-muted-foreground">Insurance providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contractors</CardTitle>
              <span className="text-lg">🔨</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contractors}</div>
              <p className="text-xs text-muted-foreground">Contractors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Service Providers</CardTitle>
              <span className="text-lg">⚙️</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.serviceProviders}</div>
              <p className="text-xs text-muted-foreground">Service providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <Plus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentlyAdded}</div>
              <p className="text-xs text-muted-foreground">Recently added</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">Organizations</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Organizations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Organizations</CardTitle>
                <CardDescription>Newly added organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies.slice(0, 5).map((company) => (
                    <div key={company.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getCompanyTypeIcon(company.company_type)}
                        </span>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {company.company_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(company.status)}>
                        {company.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common organization management tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Organization List
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk User Assignment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Compliance Notifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Review Pending Approvals
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search organizations..."
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
                    <SelectValue placeholder="Company Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="insurer">Insurer</SelectItem>
                    <SelectItem value="contractor_firm">Contractor Firm</SelectItem>
                    <SelectItem value="surveyor_practice">Surveyor Practice</SelectItem>
                    <SelectItem value="loss_adjusting_firm">Loss Adjusting Firm</SelectItem>
                    <SelectItem value="claims_management_company">Claims Management Company</SelectItem>
                    <SelectItem value="restoration_specialist">Restoration Specialist</SelectItem>
                    <SelectItem value="managing_general_agent">Managing General Agent</SelectItem>
                    <SelectItem value="third_party_administrator">Third Party Administrator</SelectItem>
                    <SelectItem value="legal_practice">Legal Practice</SelectItem>
                    <SelectItem value="public_adjuster">Public Adjuster</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Organizations ({companies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.map((company) => (
                  <div key={company.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl">
                          {getCompanyTypeIcon(company.company_type)}
                        </span>
                        <div>
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          <p className="text-muted-foreground capitalize">
                            {company.company_type.replace('_', ' ')}
                          </p>
                          {company.primary_contact && (
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{company.primary_contact.email}</span>
                              </div>
                              {company.primary_contact.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{company.primary_contact.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCompany(company.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Registration:</span>
                        <p className="text-muted-foreground">{company.registration_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Industry:</span>
                        <p className="text-muted-foreground">{company.industry || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Location:</span>
                        <p className="text-muted-foreground">
                          {company.city ? `${company.city}, ${company.country}` : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {selectedCompany ? (
            <CompanyDetailView company={selectedCompany} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Organization Selected</h3>
                  <p className="text-muted-foreground">
                    Select an organization from the list to view details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Reports</CardTitle>
                <CardDescription>Generate various organization reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Organization Directory Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Compliance Status Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Contact Information Export
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Performance Metrics Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Organization insights and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Organization Growth</span>
                      <span className="text-green-600">+15% this month</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Active vs Inactive</span>
                      <span>{((stats?.activeCompanies / stats?.totalCompanies) * 100 || 0).toFixed(1)}% active</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Compliance Rate</span>
                      <span className="text-green-600">94.2%</span>
                    </div>
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

// Create Organization Form Component
function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    company_type: '',
    email: '',
    phone: '',
    registration_number: '',
    website: '',
    industry: '',
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
      await createCompany(formData)
      onSuccess()
    } catch (error) {
      console.error('Error creating company:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="company_type">Company Type *</Label>
          <Select
            onValueChange={(value) => setFormData({ ...formData, company_type: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="insurer">Insurer</SelectItem>
              <SelectItem value="contractor_firm">Contractor Firm</SelectItem>
              <SelectItem value="surveyor_practice">Surveyor Practice</SelectItem>
              <SelectItem value="loss_adjusting_firm">Loss Adjusting Firm</SelectItem>
              <SelectItem value="claims_management_company">Claims Management Company</SelectItem>
              <SelectItem value="restoration_specialist">Restoration Specialist</SelectItem>
              <SelectItem value="managing_general_agent">Managing General Agent</SelectItem>
              <SelectItem value="third_party_administrator">Third Party Administrator</SelectItem>
              <SelectItem value="legal_practice">Legal Practice</SelectItem>
              <SelectItem value="public_adjuster">Public Adjuster</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="registration_number">Registration Number</Label>
          <Input
            id="registration_number"
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address_line_1">Address</Label>
        <Input
          id="address_line_1"
          value={formData.address_line_1}
          onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
    </form>
  )
}

// Company Detail View Component
function CompanyDetailView({ company }: { company: CompanyWithContacts }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">
                {company.company_type === 'insurance_company' ? '🏛️' :
                 company.company_type === 'contractor' ? '🔨' :
                 company.company_type === 'service_provider' ? '⚙️' :
                 company.company_type === 'loss_adjuster' ? '🔍' :
                 company.company_type === 'surveyor' ? '📋' : '🏢'}
              </span>
              <div>
                <CardTitle className="text-2xl">{company.name}</CardTitle>
                <CardDescription className="text-lg capitalize">
                  {company.company_type.replace('_', ' ')}
                </CardDescription>
              </div>
            </div>
            <Badge className={`px-3 py-1 text-sm ${
              company.status === 'active' ? 'bg-green-100 text-green-800' :
              company.status === 'inactive' ? 'bg-muted text-foreground' :
              company.status === 'suspended' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {company.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Company Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-sm">Registration Number:</span>
                  <p className="text-sm">{company.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Industry:</span>
                  <p className="text-sm">{company.industry || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Established:</span>
                  <p className="text-sm">
                    {company.established_date ? new Date(company.established_date).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                {company.website && (
                  <div>
                    <span className="font-medium text-sm">Website:</span>
                    <p className="text-sm">
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                        {company.website} <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact Information</h4>
              <div className="space-y-2">
                {company.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{company.phone}</span>
                  </div>
                )}
                {(company.address_line_1 || company.city) && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {company.address_line_1 && <div>{company.address_line_1}</div>}
                      {company.address_line_2 && <div>{company.address_line_2}</div>}
                      <div>
                        {company.city && `${company.city}, `}
                        {company.county && `${company.county}, `}
                        {company.postcode}
                      </div>
                      <div>{company.country}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Additional Details</h4>
              <div className="space-y-2">
                {company.vat_number && (
                  <div>
                    <span className="font-medium text-sm">VAT Number:</span>
                    <p className="text-sm">{company.vat_number}</p>
                  </div>
                )}
                {company.employee_count && (
                  <div>
                    <span className="font-medium text-sm">Employees:</span>
                    <p className="text-sm">{company.employee_count}</p>
                  </div>
                )}
                {company.fca_registration && (
                  <div>
                    <span className="font-medium text-sm">FCA Registration:</span>
                    <p className="text-sm">{company.fca_registration}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-sm">Created:</span>
                  <p className="text-sm">{new Date(company.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      {company.contacts && company.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>People associated with this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.contacts.map((contact) => (
                <div key={contact.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">
                      {contact.first_name} {contact.last_name}
                    </h4>
                    {contact.is_primary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {contact.job_title && <p>{contact.job_title}</p>}
                    {contact.department && <p>{contact.department}</p>}
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3" />
                      <span>{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {contact.contact_type.replace('_', ' ')}
                    </Badge>
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