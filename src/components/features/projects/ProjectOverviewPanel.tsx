'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, X, Shield, AlertTriangle, CheckCircle, Info, Eye, EyeOff, User, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { updateProjectDetails } from '@/lib/supabase/projects'
import { VULNERABILITY_OPTIONS, VULNERABILITY_CATEGORIES, getVulnerabilityOption } from '@/lib/constants'

interface ProjectOverviewPanelProps {
  project: any
}

export function ProjectOverviewPanel({ project }: ProjectOverviewPanelProps) {
  const [formData, setFormData] = useState(project)
  const [isEditing, setIsEditing] = useState(false)
  const [showAllFlags, setShowAllFlags] = useState(false)

  const handleChange = (field: string, value: any) => {
    // Format phone numbers as user types
    if (field === 'contact_phone') {
      let formatted = value.replace(/[^\d+\s]/g, '') // Only allow digits, +, and spaces
      if (formatted.startsWith('07') && formatted.length >= 3) {
        formatted = '+44 7' + formatted.substring(2)
      } else if (formatted.startsWith('447') && !formatted.startsWith('+')) {
        formatted = '+' + formatted
      } else if (formatted.startsWith('+447') && formatted.length > 4) {
        // Add space after +447 for readability
        const digits = formatted.substring(4).replace(/\s/g, '')
        formatted = '+44 7' + (digits.length > 0 ? ' ' + digits.substring(0, 4) + (digits.length > 4 ? ' ' + digits.substring(4) : '') : '')
      } else if ((formatted.startsWith('01') || formatted.startsWith('02')) && formatted.length >= 3) {
        // Handle landline numbers
        formatted = '+44 ' + formatted.substring(1)
      }
      value = formatted
    }
    
    // Format email to lowercase
    if (field === 'contact_email') {
      value = value.toLowerCase().trim()
    }
    
    setFormData({ ...formData, [field]: value })
  }

  const toggleVulnerability = (optionId: string) => {
    const current = formData.vulnerability_flags || []
    const option = getVulnerabilityOption(optionId)
    if (!option) return
    
    // Check both ID and label for compatibility with existing data
    const isSelected = current.includes(option.id) || current.includes(option.label)
    
    let updated
    if (isSelected) {
      // Remove both ID and label variants
      updated = current.filter((v: string) => v !== option.id && v !== option.label)
    } else {
      // Add using the ID format for consistency
      updated = [...current, option.id]
    }
    
    setFormData({ ...formData, vulnerability_flags: updated })
  }

  // Get active vulnerability flags with proper mapping
  const getActiveFlags = () => {
    const current = formData.vulnerability_flags || []
    return current.map((flag: string) => getVulnerabilityOption(flag)).filter(Boolean)
  }

  // Get color scheme for vulnerability badges
  const getColorScheme = (color: string) => {
    const schemes = {
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      pink: 'bg-pink-100 text-pink-800 border-pink-200',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    }
    return schemes[color as keyof typeof schemes] || schemes.red
  }

  const handleSave = async () => {
    try {
      // Filter out computed fields that don't exist in database
      const { _counts, project_members, project_financials, ...updateData } = formData
      
      console.log('=== SAVE DEBUG ===')
      console.log('Original project data:', project)
      console.log('Form data before filtering:', formData)
      console.log('Filtered update data:', updateData)
      console.log('Vulnerability flags:', updateData.vulnerability_flags)
      console.log('Project ID:', project.id)
      
      // Validate required fields
      if (!project.id) {
        toast.error('Project ID is missing')
        return
      }
      
      const result = await updateProjectDetails(project.id, updateData)
      console.log('Database update result:', result)
      
      if (result.error) {
        console.error('Database update error:', result.error)
        console.error('Error details:', JSON.stringify(result.error, null, 2))
        toast.error(`Update failed: ${result.error.message || 'Unknown database error'}`)
      } else {
        console.log('Update successful:', result.data)
        toast.success('Project updated successfully')
        setIsEditing(false)
        // Trigger a page refresh to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      console.error('Unexpected error during update:', err)
      console.error('Error stack:', (err as Error)?.stack)
      toast.error(`Update failed: ${(err as Error)?.message || 'Unexpected error'}`)
    }
  }

  return (
    <Card className="border-2 border-muted">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Contact & Project Info</CardTitle>
        <Button variant="ghost" onClick={() => setIsEditing(!isEditing)}>
          <Pencil className="w-4 h-4 mr-1" />
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Contact Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm font-medium">
                Contact Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="contact_name"
                  disabled={!isEditing}
                  value={formData.contact_name || ''}
                  onChange={e => handleChange('contact_name', e.target.value)}
                  placeholder="Customer name"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="contact_phone"
                  type="tel"
                  disabled={!isEditing}
                  value={formData.contact_phone || ''}
                  onChange={e => handleChange('contact_phone', e.target.value)}
                  placeholder="+44 7123 456789"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="contact_email"
                  type="email"
                  disabled={!isEditing}
                  value={formData.contact_email || ''}
                  onChange={e => handleChange('contact_email', e.target.value)}
                  placeholder="customer@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact_address" className="text-sm font-medium">
                Property Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                <Textarea
                  id="contact_address"
                  disabled={!isEditing}
                  value={formData.contact_address || ''}
                  onChange={e => handleChange('contact_address', e.target.value)}
                  placeholder="Property address including postcode"
                  className="pl-10 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </div>
        
        <Separator />

        {/* Advanced Vulnerability Assessment */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Vulnerability Assessment</h3>
            </div>
            {!isEditing && (
              <div className="flex items-center gap-2">
                {getActiveFlags().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getActiveFlags().length} active
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAllFlags(!showAllFlags)}
                >
                  {showAllFlags ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
          
          {!isEditing ? (
            <div className="space-y-4">
              {getActiveFlags().length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getActiveFlags().slice(0, showAllFlags ? undefined : 6).map(option => (
                      <div key={option.id} className={`p-3 rounded-lg border ${getColorScheme(option.color)}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{option.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{option.label}</p>
                            <p className="text-xs opacity-70">{option.category}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {getActiveFlags().length > 6 && !showAllFlags && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAllFlags(true)}
                      className="w-full"
                    >
                      Show {getActiveFlags().length - 6} more flags
                    </Button>
                  )}
                  
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Special Care Required</p>
                        <p className="text-xs text-orange-700 mt-1">
                          This customer has {getActiveFlags().length} vulnerability flag{getActiveFlags().length > 1 ? 's' : ''} active. 
                          Please ensure appropriate communication and support.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg">
                  <Shield className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No vulnerability flags assigned</p>
                  <p className="text-xs text-muted-foreground mt-1">Click edit to assess customer vulnerabilities</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Vulnerability Assessment Guidelines</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Select all applicable flags to ensure appropriate care, communication methods, and support are provided.
                      These flags help the team understand special considerations needed for this customer.
                    </p>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="critical">Critical</TabsTrigger>
                  <TabsTrigger value="physical">Physical</TabsTrigger>
                  <TabsTrigger value="social">Social</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4">
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {Object.entries(VULNERABILITY_CATEGORIES).map(([category, options]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {options.map(option => {
                              const isSelected = formData.vulnerability_flags?.includes(option.id) || formData.vulnerability_flags?.includes(option.label)
                              return (
                                <div
                                  key={option.id}
                                  onClick={() => toggleVulnerability(option.id)}
                                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                                    isSelected 
                                      ? `border-${option.color}-500 ${getColorScheme(option.color)}` 
                                      : 'border-muted bg-background hover:bg-muted/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{option.icon}</span>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{option.label}</p>
                                      <p className="text-xs text-muted-foreground">{option.category}</p>
                                    </div>
                                    {isSelected ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <div className="w-4 h-4 border border-muted-foreground rounded" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="critical">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {VULNERABILITY_OPTIONS.filter(opt => opt.color === 'red').map(option => {
                      const isSelected = formData.vulnerability_flags?.includes(option.id) || formData.vulnerability_flags?.includes(option.label)
                      return (
                        <div
                          key={option.id}
                          onClick={() => toggleVulnerability(option.id)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                            isSelected 
                              ? `border-red-500 ${getColorScheme(option.color)}` 
                              : 'border-muted bg-background hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{option.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.category}</p>
                            </div>
                            {isSelected ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border border-muted-foreground rounded" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="physical">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {VULNERABILITY_OPTIONS.filter(opt => opt.category === 'Physical').map(option => {
                      const isSelected = formData.vulnerability_flags?.includes(option.id) || formData.vulnerability_flags?.includes(option.label)
                      return (
                        <div
                          key={option.id}
                          onClick={() => toggleVulnerability(option.id)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                            isSelected 
                              ? `border-${option.color}-500 ${getColorScheme(option.color)}` 
                              : 'border-muted bg-background hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{option.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.category}</p>
                            </div>
                            {isSelected ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border border-muted-foreground rounded" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="social">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {VULNERABILITY_OPTIONS.filter(opt => ['Social', 'Situational', 'Communication'].includes(opt.category)).map(option => {
                      const isSelected = formData.vulnerability_flags?.includes(option.id) || formData.vulnerability_flags?.includes(option.label)
                      return (
                        <div
                          key={option.id}
                          onClick={() => toggleVulnerability(option.id)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                            isSelected 
                              ? `border-${option.color}-500 ${getColorScheme(option.color)}` 
                              : 'border-muted bg-background hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{option.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.category}</p>
                            </div>
                            {isSelected ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border border-muted-foreground rounded" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              {getActiveFlags().length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        {getActiveFlags().length} Vulnerability Flag{getActiveFlags().length > 1 ? 's' : ''} Selected
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        These flags will help ensure appropriate care and communication methods are used for this customer.
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getActiveFlags().map(option => (
                          <Badge key={option.id} variant="outline" className="text-xs">
                            {option.icon} {option.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
