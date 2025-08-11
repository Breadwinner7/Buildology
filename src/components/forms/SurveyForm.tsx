'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReservingMutations, type SurveyForm as SurveyFormType } from '@/hooks/useReserving'
import { Loader2, ClipboardList, Home, AlertTriangle, Camera, FileText, CheckCircle2, User } from 'lucide-react'
import { toast } from 'sonner'

const surveyFormSchema = z.object({
  form_type: z.enum(['initial_survey', 'detailed_survey', 'progress_inspection', 'final_inspection']),
  survey_date: z.string().min(1, 'Survey date is required'),
  property_type: z.string().optional(),
  year_built: z.coerce.number().optional(),
  construction_type: z.string().optional(),
  occupancy_status: z.enum(['occupied', 'vacant', 'partially_occupied']).optional(),
  access_gained: z.boolean().default(true),
  access_restrictions: z.string().optional(),
  weather_conditions: z.string().optional(),
  cause_of_loss: z.string().optional(),
  incident_date: z.string().optional(),
  damage_summary: z.string().min(10, 'Damage summary must be at least 10 characters'),
  recommendations: z.string().optional(),
  urgent_actions_required: z.string().optional(),
  health_safety_concerns: z.string().optional(),
  salvage_opportunities: z.string().optional(),
  make_safe_required: z.boolean().default(false),
  make_safe_completed: z.boolean().default(false),
  make_safe_cost: z.coerce.number().optional(),
  drying_equipment_required: z.boolean().default(false),
  drying_equipment_installed: z.boolean().default(false),
  photos_taken: z.coerce.number().default(0),
  sketch_plan_attached: z.boolean().default(false),
  additional_specialists_required: z.array(z.string()).default([]),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().optional(),
  client_present: z.boolean().default(false),
  client_representative_name: z.string().optional(),
})

type SurveyFormData = z.infer<typeof surveyFormSchema>

interface SurveyFormProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  survey?: SurveyFormType
  onSuccess?: (survey: SurveyFormType) => void
}

const specialistOptions = [
  'structural_engineer',
  'asbestos_surveyor',
  'electrical_engineer',
  'plumbing_specialist',
  'roofing_contractor',
  'drying_specialist',
  'environmental_specialist',
  'security_consultant'
]

export function SurveyForm({ 
  isOpen, 
  onClose, 
  projectId, 
  survey, 
  onSuccess 
}: SurveyFormProps) {
  const [activeTab, setActiveTab] = useState('basic')
  
  const { createSurveyForm } = useReservingMutations()

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      form_type: survey?.form_type || 'initial_survey',
      survey_date: survey?.survey_date || new Date().toISOString().split('T')[0],
      property_type: survey?.property_type || '',
      year_built: survey?.year_built || undefined,
      construction_type: survey?.construction_type || '',
      occupancy_status: survey?.occupancy_status || undefined,
      access_gained: survey?.access_gained !== false,
      access_restrictions: survey?.access_restrictions || '',
      weather_conditions: survey?.weather_conditions || '',
      cause_of_loss: survey?.cause_of_loss || '',
      incident_date: survey?.incident_date || '',
      damage_summary: survey?.damage_summary || '',
      recommendations: survey?.recommendations || '',
      urgent_actions_required: survey?.urgent_actions_required || '',
      health_safety_concerns: survey?.health_safety_concerns || '',
      salvage_opportunities: survey?.salvage_opportunities || '',
      make_safe_required: survey?.make_safe_required || false,
      make_safe_completed: survey?.make_safe_completed || false,
      make_safe_cost: survey?.make_safe_cost || undefined,
      drying_equipment_required: survey?.drying_equipment_required || false,
      drying_equipment_installed: survey?.drying_equipment_installed || false,
      photos_taken: survey?.photos_taken || 0,
      sketch_plan_attached: survey?.sketch_plan_attached || false,
      additional_specialists_required: survey?.additional_specialists_required || [],
      follow_up_required: survey?.follow_up_required || false,
      follow_up_date: survey?.follow_up_date || '',
      client_present: survey?.client_present || false,
      client_representative_name: survey?.client_representative_name || '',
    }
  })

  const onSubmit = async (data: SurveyFormData) => {
    try {
      const newSurvey = await createSurveyForm.mutateAsync({
        ...data,
        project_id: projectId
      })
      onSuccess?.(newSurvey)
      toast.success('Survey form created successfully')
      onClose()
    } catch (error) {
      console.error('Error saving survey form:', error)
      toast.error('Failed to save survey form')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {survey ? 'Edit Survey Form' : 'Create Survey Form'}
          </DialogTitle>
          <DialogDescription>
            {survey ? 'Update the survey assessment details' : 'Complete the property damage survey assessment'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="property">Property</TabsTrigger>
                <TabsTrigger value="damage">Damage</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="completion">Completion</TabsTrigger>
              </TabsList>

              {/* Basic Information */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Survey Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="form_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Survey Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="initial_survey">Initial Survey</SelectItem>
                                <SelectItem value="detailed_survey">Detailed Survey</SelectItem>
                                <SelectItem value="progress_inspection">Progress Inspection</SelectItem>
                                <SelectItem value="final_inspection">Final Inspection</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="survey_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Survey Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weather_conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weather Conditions</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Sunny, overcast, raining..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="occupancy_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupancy Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="occupied">Occupied</SelectItem>
                                <SelectItem value="vacant">Vacant</SelectItem>
                                <SelectItem value="partially_occupied">Partially Occupied</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="access_gained"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Access Gained to Property</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {!form.watch('access_gained') && (
                        <FormField
                          control={form.control}
                          name="access_restrictions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Access Restrictions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe access issues..."
                                  className="min-h-[60px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Property Information */}
              <TabsContent value="property" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="property_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Detached house, Flat, Commercial..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="year_built"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year Built</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g. 1985"
                                min="1800"
                                max={new Date().getFullYear()}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="construction_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Construction Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Brick and block, Timber frame, Concrete..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Damage Assessment */}
              <TabsContent value="damage" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Damage Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cause_of_loss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cause of Loss</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Water leak, Fire, Storm..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="incident_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Incident Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="damage_summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Damage Summary</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Comprehensive description of all damage found..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommendations</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Recommended course of action..."
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
                      name="health_safety_concerns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health & Safety Concerns</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any health and safety issues identified..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salvage_opportunities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salvage Opportunities</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Items that can be salvaged or restored..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Actions Required */}
              <TabsContent value="actions" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Immediate Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Immediate Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="urgent_actions_required"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Urgent Actions Required</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any immediate actions needed..."
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="make_safe_required"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Make Safe Required</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        {form.watch('make_safe_required') && (
                          <>
                            <FormField
                              control={form.control}
                              name="make_safe_completed"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pl-6">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Make Safe Completed</FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="make_safe_cost"
                              render={({ field }) => (
                                <FormItem className="pl-6">
                                  <FormLabel>Make Safe Cost (£)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="0.00"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="drying_equipment_required"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Drying Equipment Required</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        {form.watch('drying_equipment_required') && (
                          <FormField
                            control={form.control}
                            name="drying_equipment_installed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 pl-6">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Drying Equipment Installed</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documentation & Follow-up */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="photos_taken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Photos Taken</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sketch_plan_attached"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Sketch Plan Attached</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additional_specialists_required"
                        render={() => (
                          <FormItem>
                            <div className="mb-4">
                              <FormLabel className="text-base">Additional Specialists Required</FormLabel>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {specialistOptions.map((specialist) => (
                                <FormField
                                  key={specialist}
                                  control={form.control}
                                  name="additional_specialists_required"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={specialist}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(specialist)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, specialist])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== specialist
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {specialist.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="follow_up_required"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Follow-up Required</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        {form.watch('follow_up_required') && (
                          <FormField
                            control={form.control}
                            name="follow_up_date"
                            render={({ field }) => (
                              <FormItem className="pl-6">
                                <FormLabel>Follow-up Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Completion */}
              <TabsContent value="completion" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Survey Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="client_present"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Client Present During Survey</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch('client_present') && (
                        <FormField
                          control={form.control}
                          name="client_representative_name"
                          render={({ field }) => (
                            <FormItem className="pl-6">
                              <FormLabel>Client Representative Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name of client representative" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Survey Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Survey Type:</span> {form.watch('form_type')?.replace('_', ' ')}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {form.watch('survey_date')}
                        </div>
                        <div>
                          <span className="font-medium">Access Gained:</span> {form.watch('access_gained') ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <span className="font-medium">Photos Taken:</span> {form.watch('photos_taken') || 0}
                        </div>
                        <div>
                          <span className="font-medium">Make Safe:</span> {form.watch('make_safe_required') ? 'Required' : 'Not Required'}
                        </div>
                        <div>
                          <span className="font-medium">Follow-up:</span> {form.watch('follow_up_required') ? 'Required' : 'Not Required'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                {activeTab !== 'basic' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      const tabs = ['basic', 'property', 'damage', 'actions', 'completion']
                      const currentIndex = tabs.indexOf(activeTab)
                      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1])
                    }}
                  >
                    Previous
                  </Button>
                )}
                {activeTab !== 'completion' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      const tabs = ['basic', 'property', 'damage', 'actions', 'completion']
                      const currentIndex = tabs.indexOf(activeTab)
                      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1])
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSurveyForm.isPending}>
                  {createSurveyForm.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {survey ? 'Update Survey' : 'Create Survey'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}