'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useHODCodes, useReservingMutations, type DamageItem, formatCurrency } from '@/hooks/useReserving'
import { Loader2, Calculator, Info, Search } from 'lucide-react'
import { toast } from 'sonner'

const damageItemSchema = z.object({
  hod_code_id: z.string().min(1, 'HOD code is required'),
  item_description: z.string().min(3, 'Description must be at least 3 characters'),
  location: z.string().optional(),
  quantity: z.coerce.number().min(0.1, 'Quantity must be greater than 0'),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be positive'),
  vat_rate: z.coerce.number().min(0).max(100).default(20),
  damage_cause: z.string().optional(),
  damage_extent: z.enum(['minor', 'moderate', 'major', 'total_loss']).optional(),
  repair_method: z.enum(['repair', 'replace', 'make_good']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'emergency']).default('normal'),
  surveyor_notes: z.string().optional(),
  contractor_notes: z.string().optional(),
})

type DamageItemFormData = z.infer<typeof damageItemSchema>

interface DamageItemFormProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  reserveId?: string
  item?: DamageItem
  onSuccess?: (item: DamageItem) => void
}

export function DamageItemForm({ 
  isOpen, 
  onClose, 
  projectId, 
  reserveId, 
  item, 
  onSuccess 
}: DamageItemFormProps) {
  const [hodCodeFilter, setHodCodeFilter] = useState('')
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalCost: 0,
    vatAmount: 0,
    totalIncludingVat: 0
  })

  const { data: hodCodes = [], isLoading: hodCodesLoading } = useHODCodes()
  const { createDamageItem, updateDamageItem } = useReservingMutations()

  const form = useForm<DamageItemFormData>({
    resolver: zodResolver(damageItemSchema),
    defaultValues: {
      hod_code_id: item?.hod_code_id || '',
      item_description: item?.item_description || '',
      location: item?.location || '',
      quantity: item?.quantity || 1,
      unit_cost: item?.unit_cost || 0,
      vat_rate: item?.vat_rate || 20,
      damage_cause: item?.damage_cause || '',
      damage_extent: item?.damage_extent || undefined,
      repair_method: item?.repair_method || undefined,
      urgency: item?.urgency || 'normal',
      surveyor_notes: item?.surveyor_notes || '',
      contractor_notes: item?.contractor_notes || '',
    }
  })

  const watchedValues = form.watch(['quantity', 'unit_cost', 'vat_rate'])
  const selectedHodCode = hodCodes.find(hod => hod.id === form.watch('hod_code_id'))

  // Calculate totals when form values change
  useEffect(() => {
    const [quantity, unitCost, vatRate] = watchedValues
    const totalCost = (quantity || 0) * (unitCost || 0)
    const vatAmount = totalCost * ((vatRate || 0) / 100)
    const totalIncludingVat = totalCost + vatAmount

    setCalculatedTotals(prev => {
      // Only update if values actually changed to prevent infinite loop
      if (prev.totalCost !== totalCost || prev.vatAmount !== vatAmount || prev.totalIncludingVat !== totalIncludingVat) {
        return {
          totalCost,
          vatAmount,
          totalIncludingVat
        }
      }
      return prev
    })
  }, [watchedValues])

  // Auto-suggest unit cost based on HOD code
  const handleHodCodeChange = (hodCodeId: string) => {
    const hodCode = hodCodes.find(hod => hod.id === hodCodeId)
    if (hodCode && hodCode.typical_rate_low && !form.getValues('unit_cost')) {
      // Use average of typical range
      const suggestedCost = hodCode.typical_rate_high 
        ? (hodCode.typical_rate_low + hodCode.typical_rate_high) / 2
        : hodCode.typical_rate_low
      
      form.setValue('unit_cost', suggestedCost)
      toast.info(`Suggested unit cost: ${formatCurrency(suggestedCost)} based on HOD code`)
    }
  }

  const onSubmit = async (data: DamageItemFormData) => {
    try {
      if (item) {
        await updateDamageItem.mutateAsync({
          id: item.id,
          data: {
            ...data,
            project_id: projectId,
            reserve_id: reserveId
          }
        })
        toast.success('Damage item updated successfully')
      } else {
        const newItem = await createDamageItem.mutateAsync({
          ...data,
          project_id: projectId,
          reserve_id: reserveId
        })
        onSuccess?.(newItem)
        toast.success('Damage item created successfully')
      }
      onClose()
    } catch (error) {
      console.error('Error saving damage item:', error)
      toast.error('Failed to save damage item')
    }
  }

  const filteredHodCodes = hodCodes.filter(hod =>
    hod.code.toLowerCase().includes(hodCodeFilter.toLowerCase()) ||
    hod.description.toLowerCase().includes(hodCodeFilter.toLowerCase()) ||
    hod.category.toLowerCase().includes(hodCodeFilter.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Damage Item' : 'Add Damage Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update the damage assessment details' : 'Create a new damage item assessment with HOD code classification'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* HOD Code Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">HOD Code Classification</CardTitle>
                    <CardDescription>Select the appropriate Head of Damage code for this item</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search HOD codes..."
                        value={hodCodeFilter}
                        onChange={(e) => setHodCodeFilter(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="hod_code_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOD Code</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value)
                              handleHodCodeChange(value)
                            }} 
                            defaultValue={field.value}
                            disabled={hodCodesLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select HOD code..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {hodCodesLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2">Loading codes...</span>
                                </div>
                              ) : (
                                filteredHodCodes.map((hodCode) => (
                                  <SelectItem key={hodCode.id} value={hodCode.id}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {hodCode.code}
                                      </Badge>
                                      <span className="truncate">{hodCode.description}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {selectedHodCode && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{selectedHodCode.category.replace('_', ' ')}</Badge>
                                {selectedHodCode.sub_category && (
                                  <Badge variant="outline">{selectedHodCode.sub_category.replace('_', ' ')}</Badge>
                                )}
                              </div>
                              {selectedHodCode.typical_rate_low && (
                                <p>
                                  Typical range: {formatCurrency(selectedHodCode.typical_rate_low)} - {' '}
                                  {selectedHodCode.typical_rate_high ? formatCurrency(selectedHodCode.typical_rate_high) : 'N/A'} 
                                  {' '}per {selectedHodCode.unit_type.replace('_', ' ')}
                                </p>
                              )}
                              {selectedHodCode.notes && (
                                <p className="italic">"{selectedHodCode.notes}"</p>
                              )}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Item Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Item Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="item_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Detailed description of the damage item..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Room/area..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="damage_cause"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Damage Cause</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Water damage, Fire..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="damage_extent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Damage Extent</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select extent..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minor">Minor</SelectItem>
                                <SelectItem value="moderate">Moderate</SelectItem>
                                <SelectItem value="major">Major</SelectItem>
                                <SelectItem value="total_loss">Total Loss</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="repair_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repair Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="repair">Repair</SelectItem>
                                <SelectItem value="replace">Replace</SelectItem>
                                <SelectItem value="make_good">Make Good</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="urgency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Urgency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="surveyor_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surveyor Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Surveyor observations and recommendations..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contractor_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contractor Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Contractor feedback and considerations..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Costs */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Cost Calculation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              placeholder="1"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          {selectedHodCode && (
                            <FormDescription className="text-xs">
                              Unit: {selectedHodCode.unit_type.replace('_', ' ')}
                            </FormDescription>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost (£)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              placeholder="0.00"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vat_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="100" 
                              placeholder="20"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Calculated Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculatedTotals.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT:</span>
                        <span className="font-medium">{formatCurrency(calculatedTotals.vatAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(calculatedTotals.totalIncludingVat)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Info */}
                {selectedHodCode && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        HOD Code Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Code:</span> {selectedHodCode.code}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {selectedHodCode.category.replace('_', ' ')}
                        </div>
                        {selectedHodCode.sub_category && (
                          <div>
                            <span className="font-medium">Sub-category:</span> {selectedHodCode.sub_category.replace('_', ' ')}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Unit:</span> {selectedHodCode.unit_type.replace('_', ' ')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDamageItem.isPending || updateDamageItem.isPending}>
                {(createDamageItem.isPending || updateDamageItem.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {item ? 'Update Item' : 'Create Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}