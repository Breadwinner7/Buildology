'use client'

import { useState } from 'react'
import { useHODCodes, useDamageItems, useReservingMutations, formatCurrency, type HODCode, type DamageItem } from '@/hooks/useReserving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  Filter, 
  Building, 
  Package, 
  Home, 
  Users, 
  TrendingDown,
  Calculator,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface HODCodeManagementProps {
  projectId: string
}

const categoryConfig = {
  building: { label: 'Building Works', icon: Building, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  contents: { label: 'Contents', icon: Package, color: 'bg-green-100 text-green-800 border-green-200' },
  alternative: { label: 'Alternative Accommodation', icon: Home, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  consequential: { label: 'Consequential Loss', icon: TrendingDown, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  professional_fees: { label: 'Professional Fees', icon: Users, color: 'bg-gray-100 text-gray-800 border-gray-200' }
}

export function HODCodeManagement({ projectId }: HODCodeManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showAddDamageItem, setShowAddDamageItem] = useState(false)
  const [selectedHODCode, setSelectedHODCode] = useState<HODCode | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddSection, setShowAddSection] = useState(false)

  const { data: hodCodes = [], isLoading: hodCodesLoading } = useHODCodes()
  const { data: damageItems = [], isLoading: damageItemsLoading } = useDamageItems(projectId)
  const { createDamageItem } = useReservingMutations()

  // Filter HOD codes
  const filteredHODCodes = hodCodes.filter(code => {
    const matchesSearch = 
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || code.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Group damage items by category for summary
  const damageItemsSummary = damageItems.reduce((acc, item) => {
    if (!item.hod_code) return acc
    const category = item.hod_code.category
    if (!acc[category]) {
      acc[category] = { count: 0, totalValue: 0, items: [] }
    }
    acc[category].count++
    acc[category].totalValue += item.total_including_vat
    acc[category].items.push(item)
    return acc
  }, {} as Record<string, { count: number; totalValue: number; items: DamageItem[] }>)

  const handleAddDamageItem = (hodCode: HODCode) => {
    setSelectedHODCode(hodCode)
    setShowAddDamageItem(true)
  }

  const [damageItemForm, setDamageItemForm] = useState({
    item_description: '',
    location: '',
    quantity: 1,
    unit_cost: 0,
    vat_rate: 20,
    damage_cause: '',
    damage_extent: '',
    repair_method: '',
    urgency: 'normal',
    surveyor_notes: ''
  })

  const handleSubmitDamageItem = async () => {
    if (!selectedHODCode) return

    try {
      await createDamageItem.mutateAsync({
        project_id: projectId,
        hod_code_id: selectedHODCode.id,
        ...damageItemForm
      })
      
      toast.success(`Damage item "${damageItemForm.item_description}" added successfully`)
      setShowAddDamageItem(false)
      setSelectedHODCode(null)
      setShowAddSection(false) // Hide add section after successful addition
      setDamageItemForm({
        item_description: '',
        location: '',
        quantity: 1,
        unit_cost: 0,
        vat_rate: 20,
        damage_cause: '',
        damage_extent: '',
        repair_method: '',
        urgency: 'normal',
        surveyor_notes: ''
      })
    } catch (error) {
      toast.error('Failed to add damage item')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'estimated': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">HOD Code Management</h2>
          <p className="text-muted-foreground">Add damage items using Head of Damage codes for this project</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview & Management</TabsTrigger>
          <TabsTrigger value="hod-reference">HOD Code Reference</TabsTrigger>
        </TabsList>

        {/* Overview & Management Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Category Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const summary = damageItemsSummary[key] || { count: 0, totalValue: 0 }
              return (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className="h-5 w-5" />
                      <Badge className={config.color} variant="outline">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">{summary.count}</p>
                      <p className="text-sm text-muted-foreground">items</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(summary.totalValue)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Current Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Current Project Damage Items</CardTitle>
                    <CardDescription>
                      {damageItems.length} items totaling {formatCurrency(damageItems.reduce((sum, item) => sum + item.total_including_vat, 0))}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowAddSection(!showAddSection)}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Damage Item
                  </Button>
                </CardHeader>
                <CardContent>
                  {damageItems.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No damage items yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start by clicking "Add Damage Item" to add your first assessment
                      </p>
                      <Button onClick={() => setShowAddSection(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Item
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HOD Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {damageItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {item.hod_code?.code}
                                </Badge>
                                {item.hod_code && (
                                  <Badge className={`text-xs ${categoryConfig[item.hod_code.category as keyof typeof categoryConfig]?.color}`}>
                                    {categoryConfig[item.hod_code.category as keyof typeof categoryConfig]?.label}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.item_description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.hod_code?.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.location || 'Not specified'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.total_including_vat)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(item.status)} variant="outline">
                                  {item.status.replace('_', ' ')}
                                </Badge>
                                {getUrgencyIcon(item.urgency)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Add Items Section */}
            <div className="space-y-6">
              {showAddSection && (
                <Card className="border-dashed border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Quick Add Damage Item
                    </CardTitle>
                    <CardDescription>
                      Select a HOD code to add to this project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search HOD codes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Category Filter */}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* HOD Code List */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredHODCodes.slice(0, 10).map((code) => (
                        <div 
                          key={code.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleAddDamageItem(code)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {code.code}
                            </Badge>
                            <Badge className={`text-xs ${categoryConfig[code.category as keyof typeof categoryConfig]?.color}`}>
                              {categoryConfig[code.category as keyof typeof categoryConfig]?.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mb-1">{code.description}</p>
                          {code.typical_rate_low && (
                            <p className="text-xs text-muted-foreground">
                              Rate: {formatCurrency(code.typical_rate_low)}
                              {code.typical_rate_high && ` - ${formatCurrency(code.typical_rate_high)}`}
                            </p>
                          )}
                        </div>
                      ))}
                      {filteredHODCodes.length > 10 && (
                        <p className="text-xs text-center text-muted-foreground py-2">
                          {filteredHODCodes.length - 10} more codes available...
                        </p>
                      )}
                      {filteredHODCodes.length === 0 && searchTerm && (
                        <p className="text-sm text-center text-muted-foreground py-4">
                          No codes found matching "{searchTerm}"
                        </p>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAddSection(false)}
                      className="w-full"
                    >
                      Hide Add Section
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Category Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>Damage items by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(categoryConfig).map(([key, config]) => {
                      const summary = damageItemsSummary[key] || { count: 0, totalValue: 0 }
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{summary.count} items</p>
                            <p className="text-xs text-green-600 font-mono">
                              {formatCurrency(summary.totalValue)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* HOD Reference Tab */}
        <TabsContent value="hod-reference" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is a reference guide for HOD codes. Use the "Add New Items" tab to add actual damage items to your project.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>HOD Code Categories</CardTitle>
              <CardDescription>Industry standard Head of Damage classification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const categoryCount = hodCodes.filter(code => code.category === key).length
                  return (
                    <div key={key} className="flex items-center gap-3 p-4 border rounded-lg">
                      <config.icon className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">{categoryCount} codes available</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Damage Item Dialog */}
      <Dialog open={showAddDamageItem} onOpenChange={setShowAddDamageItem}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Damage Item
            </DialogTitle>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {selectedHODCode?.code}
                </Badge>
                {selectedHODCode && (
                  <Badge className={categoryConfig[selectedHODCode.category as keyof typeof categoryConfig]?.color}>
                    {categoryConfig[selectedHODCode.category as keyof typeof categoryConfig]?.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium">{selectedHODCode?.description}</p>
              {selectedHODCode?.typical_rate_low && (
                <p className="text-xs text-muted-foreground mt-1">
                  Typical rate: {formatCurrency(selectedHODCode.typical_rate_low)}
                  {selectedHODCode.typical_rate_high && ` - ${formatCurrency(selectedHODCode.typical_rate_high)}`}
                  {' per '}{selectedHODCode.unit_type.replace('_', ' ')}
                </p>
              )}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="item_description">Item Description *</Label>
                  <Textarea
                    id="item_description"
                    rows={3}
                    value={damageItemForm.item_description}
                    onChange={(e) => setDamageItemForm({...damageItemForm, item_description: e.target.value})}
                    placeholder="Detailed description of the damage item..."
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={damageItemForm.location}
                      onChange={(e) => setDamageItemForm({...damageItemForm, location: e.target.value})}
                      placeholder="Room/area affected"
                    />
                  </div>
                  <div>
                    <Label htmlFor="damage_cause">Damage Cause</Label>
                    <Input
                      id="damage_cause"
                      value={damageItemForm.damage_cause}
                      onChange={(e) => setDamageItemForm({...damageItemForm, damage_cause: e.target.value})}
                      placeholder="e.g. Water damage, fire, impact"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={damageItemForm.quantity}
                      onChange={(e) => setDamageItemForm({...damageItemForm, quantity: parseFloat(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {selectedHODCode?.unit_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="unit_cost">Unit Cost (£)</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={damageItemForm.unit_cost}
                      onChange={(e) => setDamageItemForm({...damageItemForm, unit_cost: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vat_rate">VAT Rate (%)</Label>
                    <Select 
                      value={damageItemForm.vat_rate.toString()} 
                      onValueChange={(value) => setDamageItemForm({...damageItemForm, vat_rate: parseFloat(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                        <SelectItem value="5">5% (Reduced)</SelectItem>
                        <SelectItem value="20">20% (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="damage_extent">Damage Extent</Label>
                    <Select 
                      value={damageItemForm.damage_extent} 
                      onValueChange={(value) => setDamageItemForm({...damageItemForm, damage_extent: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select extent..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor - Cosmetic damage</SelectItem>
                        <SelectItem value="moderate">Moderate - Partial damage</SelectItem>
                        <SelectItem value="major">Major - Significant damage</SelectItem>
                        <SelectItem value="total_loss">Total Loss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select 
                      value={damageItemForm.urgency} 
                      onValueChange={(value) => setDamageItemForm({...damageItemForm, urgency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low Priority</SelectItem>
                        <SelectItem value="normal">🟡 Normal Priority</SelectItem>
                        <SelectItem value="high">🟠 High Priority</SelectItem>
                        <SelectItem value="emergency">🔴 Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="surveyor_notes">Additional Notes</Label>
                  <Textarea
                    id="surveyor_notes"
                    rows={3}
                    value={damageItemForm.surveyor_notes}
                    onChange={(e) => setDamageItemForm({...damageItemForm, surveyor_notes: e.target.value})}
                    placeholder="Additional observations, repair methods, or special considerations..."
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Cost Summary & Actions */}
            <div className="space-y-4">
              {/* Cost Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Cost Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span className="font-mono">{damageItemForm.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Cost:</span>
                      <span className="font-mono">{formatCurrency(damageItemForm.unit_cost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatCurrency(damageItemForm.quantity * damageItemForm.unit_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({damageItemForm.vat_rate}%):</span>
                      <span className="font-mono">{formatCurrency((damageItemForm.quantity * damageItemForm.unit_cost) * (damageItemForm.vat_rate / 100))}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                      <span>Total inc. VAT:</span>
                      <span className="font-mono text-green-600">
                        {formatCurrency((damageItemForm.quantity * damageItemForm.unit_cost) * (1 + damageItemForm.vat_rate / 100))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Tip */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Tip: The item will appear immediately in your damage items list after adding.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDamageItem(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitDamageItem} 
                disabled={!damageItemForm.item_description.trim()}
                className="min-w-32"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}