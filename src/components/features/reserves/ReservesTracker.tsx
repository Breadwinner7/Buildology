'use client'

import { useState } from 'react'
import { useProjectReserves, formatCurrency, calculateReserveTotals, type ProjectReserve } from '@/hooks/useReserving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Equal, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Edit,
  History
} from 'lucide-react'

interface ReservesTrackerProps {
  projectId: string
  onEditReserve?: (reserve: ProjectReserve) => void
  showActions?: boolean
}

const categoryLabels = {
  building: 'Building Works',
  contents: 'Contents',
  consequential: 'Consequential Loss',
  alternative: 'Alternative Accommodation',
  professional_fees: 'Professional Fees'
}

const categoryIcons = {
  building: '🏗️',
  contents: '📦',
  consequential: '💼', 
  alternative: '🏠',
  professional_fees: '👔'
}

export function ReservesTracker({ projectId, onEditReserve, showActions = true }: ReservesTrackerProps) {
  const [selectedReserve, setSelectedReserve] = useState<ProjectReserve | null>(null)
  
  const { data: reserves = [], isLoading, error } = useProjectReserves(projectId)
  const currentReserve = calculateReserveTotals(reserves)

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Equal className="h-4 w-4 text-gray-600" />
  }

  const getVarianceColor = (variance: number, estimated: number) => {
    if (estimated === 0) return 'text-gray-600'
    const percentage = Math.abs(variance / estimated) * 100
    if (percentage > 20) return variance > 0 ? 'text-green-700' : 'text-red-700'
    if (percentage > 10) return variance > 0 ? 'text-green-600' : 'text-red-600'
    return 'text-gray-600'
  }

  const getVariancePercentage = (variance: number, estimated: number) => {
    if (estimated === 0) return 0
    return (variance / estimated) * 100
  }

  const categoryData = currentReserve ? [
    {
      category: 'building',
      estimated: currentReserve.estimated_building_reserve || currentReserve.building_reserve || 0,
      actual: currentReserve.actual_building_reserve || currentReserve.building_reserve || 0,
      variance: currentReserve.variance_building_reserve || 0
    },
    {
      category: 'contents', 
      estimated: currentReserve.estimated_contents_reserve || currentReserve.contents_reserve || 0,
      actual: currentReserve.actual_contents_reserve || currentReserve.contents_reserve || 0,
      variance: currentReserve.variance_contents_reserve || 0
    },
    {
      category: 'consequential',
      estimated: currentReserve.estimated_consequential_reserve || currentReserve.consequential_reserve || 0,
      actual: currentReserve.actual_consequential_reserve || currentReserve.consequential_reserve || 0,
      variance: currentReserve.variance_consequential_reserve || 0
    },
    {
      category: 'alternative',
      estimated: currentReserve.estimated_alternative_accommodation_reserve || currentReserve.alternative_accommodation_reserve || 0,
      actual: currentReserve.actual_alternative_accommodation_reserve || currentReserve.alternative_accommodation_reserve || 0,
      variance: currentReserve.variance_alternative_accommodation_reserve || 0
    },
    {
      category: 'professional_fees',
      estimated: currentReserve.estimated_professional_fees_reserve || currentReserve.professional_fees_reserve || 0,
      actual: currentReserve.actual_professional_fees_reserve || currentReserve.professional_fees_reserve || 0,
      variance: currentReserve.variance_professional_fees_reserve || 0
    }
  ] : []

  const totals = categoryData.reduce((acc, cat) => ({
    estimated: acc.estimated + cat.estimated,
    actual: acc.actual + cat.actual,
    variance: acc.variance + cat.variance
  }), { estimated: 0, actual: 0, variance: 0 })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading reserves...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !currentReserve) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No project reserves found. Create a reserve to start tracking estimated vs actual costs.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.estimated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.actual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totals.variance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {getVarianceIcon(totals.variance)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variance</p>
                <p className={`text-2xl font-bold ${getVarianceColor(totals.variance, totals.estimated)}`}>
                  {totals.variance >= 0 ? '+' : ''}{formatCurrency(totals.variance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totals.estimated > 0 ? `${getVariancePercentage(totals.variance, totals.estimated).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reserve Category Breakdown</CardTitle>
            <CardDescription>
              Estimated vs Actual reserves by category with variance analysis
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEditReserve?.(currentReserve)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Reserves
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="visual">Visual View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">% Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((cat) => {
                    const percentage = getVariancePercentage(cat.variance, cat.estimated)
                    const absPercentage = Math.abs(percentage)
                    
                    return (
                      <TableRow key={cat.category}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{categoryIcons[cat.category as keyof typeof categoryIcons]}</span>
                            <span className="font-medium">
                              {categoryLabels[cat.category as keyof typeof categoryLabels]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cat.estimated)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cat.actual)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${getVarianceColor(cat.variance, cat.estimated)}`}>
                            {getVarianceIcon(cat.variance)}
                            <span className="font-mono">
                              {cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getVarianceColor(cat.variance, cat.estimated)}>
                            {cat.estimated > 0 ? `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%` : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {absPercentage > 20 ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High Variance
                            </Badge>
                          ) : absPercentage > 10 ? (
                            <Badge variant="secondary">
                              <Info className="h-3 w-3 mr-1" />
                              Moderate Variance
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              On Track
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="visual">
              <div className="space-y-6">
                {categoryData.map((cat) => {
                  const maxAmount = Math.max(cat.estimated, cat.actual) || 1
                  const estimatedPercentage = (cat.estimated / maxAmount) * 100
                  const actualPercentage = (cat.actual / maxAmount) * 100
                  const percentage = getVariancePercentage(cat.variance, cat.estimated)
                  
                  return (
                    <div key={cat.category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryIcons[cat.category as keyof typeof categoryIcons]}</span>
                          <h4 className="font-medium">
                            {categoryLabels[cat.category as keyof typeof categoryLabels]}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            {getVarianceIcon(cat.variance)}
                            <span className={getVarianceColor(cat.variance, cat.estimated)}>
                              {cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance)}
                              {cat.estimated > 0 && ` (${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%)`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Estimated</span>
                          <span className="font-mono">{formatCurrency(cat.estimated)}</span>
                        </div>
                        <Progress value={estimatedPercentage} className="h-2 bg-blue-100">
                          <div className="h-full bg-blue-500 rounded-full transition-all" />
                        </Progress>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Actual</span>
                          <span className="font-mono">{formatCurrency(cat.actual)}</span>
                        </div>
                        <Progress value={actualPercentage} className="h-2 bg-green-100">
                          <div className="h-full bg-green-500 rounded-full transition-all" />
                        </Progress>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reserve Status */}
      <Card>
        <CardHeader>
          <CardTitle>Reserve Status</CardTitle>
          <CardDescription>Current reserve information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reserve Type</p>
              <Badge variant="outline">{currentReserve.reserve_type.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant={currentReserve.status === 'approved' ? 'default' : 'secondary'}>
                {currentReserve.status.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{new Date(currentReserve.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">{new Date(currentReserve.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
          {currentReserve.notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted p-2 rounded">{currentReserve.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}