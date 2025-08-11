'use client'

import { useState, useMemo } from 'react'
import { useHODCodes, formatCurrency, type HODCode } from '@/hooks/useReserving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Search, Filter, Download, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HODCodesTableProps {
  projectId?: string
  onCodeSelect?: (code: HODCode) => void
  showActions?: boolean
  compact?: boolean
}

const categoryColors = {
  building: 'bg-blue-100 text-blue-800 border-blue-200',
  contents: 'bg-green-100 text-green-800 border-green-200',
  alternative: 'bg-purple-100 text-purple-800 border-purple-200',
  consequential: 'bg-orange-100 text-orange-800 border-orange-200',
  professional_fees: 'bg-gray-100 text-gray-800 border-gray-200'
}

const unitTypeLabels = {
  per_item: 'Per Item',
  per_square_metre: 'Per m²',
  per_hour: 'Per Hour',
  percentage: '%',
  per_metre: 'Per Metre',
  per_night: 'Per Night',
  per_week: 'Per Week',
  per_mile: 'Per Mile'
}

export function HODCodesTable({ 
  projectId, 
  onCodeSelect, 
  showActions = false,
  compact = false 
}: HODCodesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'code' | 'category' | 'rate'>('code')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data: hodCodes = [], isLoading, error } = useHODCodes()

  const filteredAndSortedCodes = useMemo(() => {
    let filtered = hodCodes.filter(code => {
      const matchesSearch = 
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (code.sub_category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      
      const matchesCategory = categoryFilter === 'all' || code.category === categoryFilter

      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'code':
          aValue = a.code
          bValue = b.code
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        case 'rate':
          aValue = a.typical_rate_low || 0
          bValue = b.typical_rate_low || 0
          break
        default:
          aValue = a.code
          bValue = b.code
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc' 
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue)
    })

    return filtered
  }, [hodCodes, searchTerm, categoryFilter, sortBy, sortOrder])

  const categoryStats = useMemo(() => {
    const stats = hodCodes.reduce((acc, code) => {
      if (!acc[code.category]) {
        acc[code.category] = { count: 0, avgRate: 0, totalRate: 0 }
      }
      acc[code.category].count++
      if (code.typical_rate_low) {
        acc[code.category].totalRate += code.typical_rate_low
        acc[code.category].avgRate = acc[code.category].totalRate / acc[code.category].count
      }
      return acc
    }, {} as Record<string, { count: number; avgRate: number; totalRate: number }>)

    return stats
  }, [hodCodes])

  const handleSort = (newSortBy: 'code' | 'category' | 'rate') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const exportToCSV = () => {
    const headers = ['Code', 'Description', 'Category', 'Sub Category', 'Low Rate', 'High Rate', 'Unit Type', 'Notes']
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedCodes.map(code => [
        code.code,
        `"${code.description.replace(/"/g, '""')}"`,
        code.category,
        code.sub_category || '',
        code.typical_rate_low || '',
        code.typical_rate_high || '',
        code.unit_type,
        `"${(code.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hod-codes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading HOD codes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || hodCodes.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {error ? 'Failed to load HOD codes' : 'No HOD codes available. Please ensure the reserving system database tables have been created.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {!compact && (
        <>
          {/* Category Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(categoryStats).map(([category, stats]) => (
              <Card key={category} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                      {category.replace('_', ' ')}
                    </Badge>
                    <p className="text-2xl font-bold mt-1">{stats.count}</p>
                    <p className="text-sm text-muted-foreground">codes</p>
                  </div>
                  {stats.avgRate > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(stats.avgRate)}</p>
                      <p className="text-xs text-muted-foreground">avg rate</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                HOD Codes Reference
              </CardTitle>
              <CardDescription>
                Head of Damage codes for insurance claim assessment and costing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search codes, descriptions, or categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="building">Building</SelectItem>
                      <SelectItem value="contents">Contents</SelectItem>
                      <SelectItem value="alternative">Alternative</SelectItem>
                      <SelectItem value="consequential">Consequential</SelectItem>
                      <SelectItem value="professional_fees">Professional Fees</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {filteredAndSortedCodes.length} of {hodCodes.length} codes
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* HOD Codes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-1">
                    Code
                    {sortBy === 'code' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {sortBy === 'category' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 text-right"
                  onClick={() => handleSort('rate')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Rate Range
                    {sortBy === 'rate' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Unit</TableHead>
                {showActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCodes.map((code) => (
                <TableRow 
                  key={code.id}
                  className={onCodeSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onCodeSelect?.(code)}
                >
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {code.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{code.description}</p>
                      {code.sub_category && (
                        <p className="text-sm text-muted-foreground">
                          {code.sub_category.replace('_', ' ')}
                        </p>
                      )}
                      {code.notes && !compact && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {code.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryColors[code.category as keyof typeof categoryColors]}>
                      {code.category.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {code.typical_rate_low && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-sm">{formatCurrency(code.typical_rate_low)}</span>
                          {code.typical_rate_high && (
                            <>
                              <span className="text-xs text-muted-foreground">-</span>
                              <span className="text-sm">{formatCurrency(code.typical_rate_high)}</span>
                            </>
                          )}
                        </div>
                        {code.typical_rate_high && (
                          <div className="text-xs text-muted-foreground">
                            Avg: {formatCurrency((code.typical_rate_low + code.typical_rate_high) / 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {unitTypeLabels[code.unit_type as keyof typeof unitTypeLabels] || code.unit_type}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCodeSelect?.(code)
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedCodes.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-4" />
              <p>No HOD codes match your search criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}