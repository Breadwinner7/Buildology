'use client'

import { useState } from 'react'
import { useProjectReserves, useReservingMutations, formatCurrency, type ProjectReserve } from '@/hooks/useReserving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Edit, 
  DollarSign, 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calculator,
  History,
  Save,
  Building,
  Package,
  Home,
  Users,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

const reserveSchema = z.object({
  reserve_type: z.enum(['initial', 'revised', 'final']),
  estimated_building_reserve: z.coerce.number().min(0).default(0),
  estimated_contents_reserve: z.coerce.number().min(0).default(0),
  estimated_consequential_reserve: z.coerce.number().min(0).default(0),
  estimated_alternative_accommodation_reserve: z.coerce.number().min(0).default(0),
  estimated_professional_fees_reserve: z.coerce.number().min(0).default(0),
  notes: z.string().optional()
})

type ReserveFormData = z.infer<typeof reserveSchema>

interface ReserveManagementProps {
  projectId: string
}

const categoryConfig = {
  building: {
    label: 'Building Works',
    icon: Building,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Structural repairs and building restoration'
  },
  contents: {
    label: 'Contents',
    icon: Package,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Personal belongings and furnishings'
  },
  consequential: {
    label: 'Consequential Loss',
    icon: TrendingDown,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Business interruption and additional costs'
  },
  alternative: {
    label: 'Alternative Accommodation',
    icon: Home,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Temporary housing and associated costs'
  },
  professional_fees: {
    label: 'Professional Fees',
    icon: Users,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Surveyors, adjusters, and professional services'
  }
}

export function ReserveManagement({ projectId }: ReserveManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReserve, setEditingReserve] = useState<ProjectReserve | null>(null)
  const [showActualUpdateForm, setShowActualUpdateForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  const { data: reserves = [], isLoading } = useProjectReserves(projectId)
  const { createReserve } = useReservingMutations()

  const form = useForm<ReserveFormData>({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      reserve_type: 'initial',
      estimated_building_reserve: 0,
      estimated_contents_reserve: 0,
      estimated_consequential_reserve: 0,
      estimated_alternative_accommodation_reserve: 0,
      estimated_professional_fees_reserve: 0,
      notes: ''
    }
  })

  const currentReserve = reserves.find(r => r.status === 'approved') || reserves[0]

  const onSubmitReserve = async (data: ReserveFormData) => {
    try {
      await createReserve.mutateAsync({
        project_id: projectId,
        ...data,
        status: 'draft'
      })
      
      toast.success('Reserve created successfully')
      setShowCreateForm(false)
      form.reset()
    } catch (error) {
      toast.error('Failed to create reserve')
    }
  }

  const handleEditReserve = (reserve: ProjectReserve) => {
    setEditingReserve(reserve)
    form.reset({
      reserve_type: reserve.reserve_type as 'initial' | 'revised' | 'final',
      estimated_building_reserve: reserve.estimated_building_reserve || reserve.building_reserve || 0,
      estimated_contents_reserve: reserve.estimated_contents_reserve || reserve.contents_reserve || 0,
      estimated_consequential_reserve: reserve.estimated_consequential_reserve || reserve.consequential_reserve || 0,
      estimated_alternative_accommodation_reserve: reserve.estimated_alternative_accommodation_reserve || reserve.alternative_accommodation_reserve || 0,
      estimated_professional_fees_reserve: reserve.estimated_professional_fees_reserve || reserve.professional_fees_reserve || 0,
      notes: reserve.notes || ''
    })
    setShowCreateForm(true)
  }

  const getVarianceIndicator = (estimated: number, actual: number) => {
    const variance = actual - estimated
    const percentage = estimated > 0 ? (variance / estimated) * 100 : 0
    
    if (Math.abs(percentage) < 5) {
      return { icon: CheckCircle, color: 'text-green-600', label: 'On Track' }
    } else if (percentage > 0) {
      return { icon: TrendingUp, color: 'text-red-600', label: 'Over Budget' }
    } else {
      return { icon: TrendingDown, color: 'text-orange-600', label: 'Under Budget' }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading reserves...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reserve Management</h2>
          <p className="text-muted-foreground">Manage estimated and actual reserve amounts by category</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {currentReserve ? 'Revise Reserve' : 'Create Reserve'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingReserve ? 'Edit Reserve' : 'Create New Reserve'}
                </DialogTitle>
                <DialogDescription>
                  Set estimated amounts for each category. These will be used to track variance against actual costs.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitReserve)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reserve_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reserve Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="initial">Initial Reserve</SelectItem>
                              <SelectItem value="revised">Revised Reserve</SelectItem>
                              <SelectItem value="final">Final Reserve</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(categoryConfig).map(([key, config]) => {
                      const fieldName = `estimated_${key}_reserve` as keyof ReserveFormData
                      return (
                        <FormField
                          key={key}
                          control={form.control}
                          name={fieldName}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <config.icon className="h-4 w-4" />
                                {config.label}
                              </FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </FormControl>
                                <span className="text-sm text-muted-foreground">GBP</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{config.description}</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )
                    })}
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes about this reserve..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReserve.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingReserve ? 'Update Reserve' : 'Create Reserve'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {reserves.length === 0 ? (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            No reserves have been set for this project. Create an initial reserve to start tracking estimated vs actual costs.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current Reserve Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Current Reserve Summary
              </CardTitle>
              <CardDescription>
                Active reserve: {currentReserve?.reserve_type} • Status: {currentReserve?.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(currentReserve?.estimated_total_reserve_amount || currentReserve?.total_reserve_amount || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Estimated Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentReserve?.actual_total_reserve_amount || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Actual Total</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    (currentReserve?.variance_total_reserve_amount || 0) >= 0 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(currentReserve?.variance_total_reserve_amount || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Variance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Reserve Breakdown by Category</CardTitle>
              <CardDescription>
                Estimated vs Actual amounts with variance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const estimatedKey = `estimated_${key}_reserve` as keyof ProjectReserve
                    const actualKey = `actual_${key}_reserve` as keyof ProjectReserve
                    const varianceKey = `variance_${key}_reserve` as keyof ProjectReserve
                    const legacyKey = `${key}_reserve` as keyof ProjectReserve
                    
                    const estimated = (currentReserve?.[estimatedKey] as number) || (currentReserve?.[legacyKey] as number) || 0
                    const actual = (currentReserve?.[actualKey] as number) || 0
                    const variance = (currentReserve?.[varianceKey] as number) || 0
                    
                    const indicator = getVarianceIndicator(estimated, actual)
                    
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(estimated)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(actual)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${
                            variance >= 0 ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            <span className="font-mono">
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <indicator.icon className={`h-4 w-4 ${indicator.color}`} />
                            <span className={`text-sm ${indicator.color}`}>
                              {indicator.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(key)
                              setShowActualUpdateForm(true)
                            }}
                          >
                            Update Actual
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Reserve Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Reserve Actions</CardTitle>
              <CardDescription>
                Manage and track reserve changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleEditReserve(currentReserve)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Estimates
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}