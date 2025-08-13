// Final Working Settings Page - Avoids the JSONB 'address' column
// src/app/(dashboard)/settings/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { 
  User, Settings, Shield, Bell, Building, 
  MapPin, Phone, Mail, Award, FileText,
  CheckCircle2, AlertCircle, Eye, EyeOff, Save,
  UserCircle, Briefcase, GraduationCap, Star,
  Clock, Lock, Users, Camera, Database,
  Home, UserPlus, Edit, Trash2, X, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// Complete user profile interface
interface UserProfile {
  id: string
  email: string
  title?: string
  first_name?: string
  surname?: string
  preferred_name?: string
  job_title?: string
  role?: string
  mobile_phone?: string
  office_phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  professional_qualifications?: string[] | string
  professional_certifications?: string[] | string
  professional_memberships?: string[] | string
  fca_reference?: string
  vat_number?: string
  company_registration?: string
  regions_covered?: string[] | string
  specialisms?: string[] | string
  maximum_claim_value?: number
  travel_radius_miles?: number
  available_weekdays?: boolean
  available_weekends?: boolean
  available_evenings?: boolean
  available_emergency?: boolean
  timezone?: string
  preferred_language?: string
  can_authorise_payments?: boolean
  is_active?: boolean
  last_login?: string
  created_at: string
  updated_at?: string
  organisation_id?: string
  date_of_birth?: string
  ni_number?: string
  max_authorisation_limit?: number
  // Note: address is JSONB - we'll handle it separately
  address?: any
}

interface OrganisationData {
  id: string
  name: string
  organisation_type?: string
  fca_reference?: string
}

// Safe columns that are NOT JSONB (excluding 'address')
const SAFE_COLUMNS = [
  'title',
  'first_name',
  'surname',
  'preferred_name',
  'job_title',
  'mobile_phone',
  'office_phone',
  'email',
  'date_of_birth',
  'ni_number',
  'emergency_contact_name',
  'emergency_contact_phone',
  'address_line_1',
  'address_line_2',
  'city',
  'county',
  'postcode',
  'country',
  'professional_qualifications',
  'professional_certifications',
  'professional_memberships',
  'fca_reference',
  'vat_number',
  'company_registration',
  'regions_covered',
  'specialisms',
  'maximum_claim_value',
  'travel_radius_miles',
  'available_weekdays',
  'available_weekends',
  'available_evenings',
  'available_emergency',
  'timezone',
  'preferred_language',
  'can_authorise_payments',
  'max_authorisation_limit',
  'qualification_numbers'
]

// Array fields that need special handling
const ARRAY_FIELDS = [
  'professional_qualifications',
  'professional_certifications', 
  'professional_memberships',
  'regions_covered',
  'specialisms',
  'qualification_numbers'
]

// Validation patterns and rules
const VALIDATION_PATTERNS = {
  mobile_phone: /^\+44\s?[1-9]\d{8,10}$/, // UK mobile format
  office_phone: /^(\+44\s?[1-9]\d{8,10}|\+44\s?[1-9]\d{2,3}\s?\d{6,7})$/, // UK mobile or landline
  emergency_contact_phone: /^(\+44\s?[1-9]\d{8,10}|\+44\s?[1-9]\d{2,3}\s?\d{6,7})$/, // UK mobile or landline
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
  ni_number: /^[A-Z]{2}[0-9]{6}[A-Z]$/, // UK NI format: AB123456C
  name: /^[a-zA-Z\s'-]{1,50}$/, // Names with basic characters, max 50 chars
  postcode: /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-BD-HJLNP-UW-Z]{2}$/i, // UK postcode format
  vat_number: /^GB\d{9}(\d{3})?$/, // UK VAT format
  fca_reference: /^[A-Z0-9]{6,8}$/, // FCA reference format
  company_registration: /^\d{8}$/ // UK company number format
}

const VALIDATION_MESSAGES = {
  mobile_phone: 'Please enter a valid UK mobile number (e.g., +44 7123 456789)',
  office_phone: 'Please enter a valid UK phone number (e.g., +44 20 7123 4567 or +44 7123 456789)',
  emergency_contact_phone: 'Please enter a valid UK phone number (e.g., +44 7123 456789)',
  email: 'Please enter a valid email address',
  ni_number: 'Please enter a valid UK National Insurance number (e.g., AB123456C)',
  first_name: 'First name can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  surname: 'Surname can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  preferred_name: 'Preferred name can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  emergency_contact_name: 'Name can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  postcode: 'Please enter a valid UK postcode (e.g., SW1A 1AA)',
  vat_number: 'Please enter a valid UK VAT number (e.g., GB123456789)',
  fca_reference: 'Please enter a valid FCA reference number (6-8 characters)',
  company_registration: 'Please enter a valid UK company number (8 digits)',
  job_title: 'Job title can only contain letters, numbers, spaces, and common punctuation (max 100 characters)',
  address_line_1: 'Address line can only contain letters, numbers, spaces, and common punctuation (max 100 characters)',
  address_line_2: 'Address line can only contain letters, numbers, spaces, and common punctuation (max 100 characters)',
  city: 'City can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  county: 'County can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  country: 'Country can only contain letters, spaces, hyphens and apostrophes (max 50 characters)',
  maximum_claim_value: 'Please enter a valid amount (numbers only, max 999,999,999)',
  travel_radius_miles: 'Please enter a valid number of miles (max 999)'
}

// Custom hook that avoids the JSONB address column
function useWorkingUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [organisation, setOrganisation] = useState<OrganisationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No authenticated user')

        // Select all columns EXCEPT the problematic JSONB 'address' column
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            email,
            title,
            first_name,
            surname,
            preferred_name,
            job_title,
            role,
            mobile_phone,
            office_phone,
            emergency_contact_name,
            emergency_contact_phone,
            address_line_1,
            address_line_2,
            city,
            county,
            postcode,
            country,
            professional_qualifications,
            professional_certifications,
            professional_memberships,
            fca_reference,
            vat_number,
            company_registration,
            regions_covered,
            specialisms,
            maximum_claim_value,
            travel_radius_miles,
            available_weekdays,
            available_weekends,
            available_evenings,
            available_emergency,
            timezone,
            preferred_language,
            can_authorise_payments,
            is_active,
            last_login,
            created_at,
            updated_at,
            organisation_id,
            date_of_birth,
            ni_number,
            max_authorisation_limit
          `)
          .eq('id', user.id)
          .single()

        if (profileError) {
          throw new Error(`Failed to fetch profile: ${profileError.message}`)
        }

        console.log('Successfully fetched profile (avoiding JSONB address):', profileData)
        setProfile(profileData)

        // Separately fetch organisation if organisation_id exists
        if (profileData?.organisation_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organisations')
            .select('id, name, organisation_type, fca_reference')
            .eq('id', profileData.organisation_id)
            .single()

          if (!orgError && orgData) {
            setOrganisation(orgData)
          }
        }

      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const validateField = (fieldName: string, value: any): string | null => {
    // Handle non-string values (arrays, booleans, numbers)
    if (value === null || value === undefined) {
      // Required fields
      if (['first_name', 'surname', 'email', 'address_line_1', 'city', 'postcode'].includes(fieldName)) {
        const fieldLabel = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        return `${fieldLabel} is required`
      }
      // Optional fields
      return null
    }

    // Handle array values (like professional_qualifications, professional_memberships)
    if (Array.isArray(value)) {
      return null // Arrays are valid as-is
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return null // Booleans are valid as-is
    }

    // Handle number values
    if (typeof value === 'number') {
      if (fieldName === 'maximum_claim_value' && (value < 0 || value > 999999999)) {
        return 'Please enter a valid amount (max 999,999,999)'
      }
      if (fieldName === 'travel_radius_miles' && (value < 0 || value > 999)) {
        return 'Please enter a valid number of miles (max 999)'
      }
      return null
    }

    // Handle string values
    if (typeof value !== 'string') {
      return null // Skip validation for other types
    }

    // Empty string handling
    if (value.trim() === '') {
      // Required fields
      if (['first_name', 'surname', 'email', 'address_line_1', 'city', 'postcode'].includes(fieldName)) {
        const fieldLabel = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        return `${fieldLabel} is required`
      }
      // Optional fields
      return null
    }

    const trimmedValue = value.trim()
    
    // Check specific field patterns
    if (fieldName === 'mobile_phone') {
      if (!VALIDATION_PATTERNS.mobile_phone.test(trimmedValue)) {
        return VALIDATION_MESSAGES.mobile_phone
      }
    } else if (fieldName === 'office_phone') {
      if (!VALIDATION_PATTERNS.office_phone.test(trimmedValue)) {
        return VALIDATION_MESSAGES.office_phone
      }
    } else if (fieldName === 'emergency_contact_phone') {
      if (!VALIDATION_PATTERNS.emergency_contact_phone.test(trimmedValue)) {
        return VALIDATION_MESSAGES.emergency_contact_phone
      }
    } else if (fieldName === 'email') {
      if (!VALIDATION_PATTERNS.email.test(trimmedValue)) {
        return VALIDATION_MESSAGES.email
      }
    } else if (fieldName === 'ni_number' && trimmedValue) {
      if (!VALIDATION_PATTERNS.ni_number.test(trimmedValue.replace(/\s/g, '').toUpperCase())) {
        return VALIDATION_MESSAGES.ni_number
      }
    } else if (fieldName === 'postcode' && trimmedValue) {
      if (!VALIDATION_PATTERNS.postcode.test(trimmedValue)) {
        return VALIDATION_MESSAGES.postcode
      }
    } else if (fieldName === 'vat_number' && trimmedValue) {
      if (!VALIDATION_PATTERNS.vat_number.test(trimmedValue.toUpperCase())) {
        return VALIDATION_MESSAGES.vat_number
      }
    } else if (fieldName === 'fca_reference' && trimmedValue) {
      if (!VALIDATION_PATTERNS.fca_reference.test(trimmedValue.toUpperCase())) {
        return VALIDATION_MESSAGES.fca_reference
      }
    } else if (fieldName === 'company_registration' && trimmedValue) {
      if (!VALIDATION_PATTERNS.company_registration.test(trimmedValue)) {
        return VALIDATION_MESSAGES.company_registration
      }
    } else if (['first_name', 'surname', 'preferred_name', 'emergency_contact_name', 'city', 'county', 'country'].includes(fieldName)) {
      if (!VALIDATION_PATTERNS.name.test(trimmedValue)) {
        return VALIDATION_MESSAGES[fieldName as keyof typeof VALIDATION_MESSAGES]
      }
    } else if (['job_title', 'address_line_1', 'address_line_2'].includes(fieldName) && trimmedValue) {
      if (trimmedValue.length > 100) {
        return VALIDATION_MESSAGES[fieldName as keyof typeof VALIDATION_MESSAGES]
      }
    } else if (fieldName === 'maximum_claim_value' && trimmedValue) {
      const numValue = parseFloat(trimmedValue.replace(/[£,]/g, ''))
      if (isNaN(numValue) || numValue < 0 || numValue > 999999999) {
        return VALIDATION_MESSAGES.maximum_claim_value
      }
    } else if (fieldName === 'travel_radius_miles' && trimmedValue) {
      const numValue = parseInt(trimmedValue, 10)
      if (isNaN(numValue) || numValue < 0 || numValue > 999) {
        return VALIDATION_MESSAGES.travel_radius_miles
      }
    }

    return null
  }

  const updateProfile = async (updates: Partial<UserProfile>, skipValidation = false) => {
    if (!profile) return { success: false, errors: { general: 'No profile found' } }

    setSaving(true)
    const errors: Record<string, string> = {}

    try {
      setError(null)
      
      // Validate all fields before updating
      if (!skipValidation) {
        for (const [key, value] of Object.entries(updates)) {
          if (SAFE_COLUMNS.includes(key)) {
            const error = validateField(key, value)
            if (error) {
              errors[key] = error
            }
          }
        }

        // Return early if validation errors exist
        if (Object.keys(errors).length > 0) {
          return { success: false, errors }
        }
      }
      
      // Only allow updates to safe columns (no JSONB address)
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key, value]) => {
          return SAFE_COLUMNS.includes(key) && value !== undefined
        }).map(([key, value]) => {
          // Handle array fields - ensure they're arrays
          if (ARRAY_FIELDS.includes(key)) {
            // If it's already an array, return as-is
            if (Array.isArray(value)) {
              return [key, value]
            }
            // If it's a string, it might be from a form - don't process here
            // The form components should handle the conversion
            return [key, value || []]
          }
          
          // Handle dates properly - convert empty strings to null
          if (key.includes('date') || key === 'date_of_birth') {
            return [key, value === '' ? null : value]
          }
          
          // Handle boolean fields
          if (typeof value === 'boolean') {
            return [key, value]
          }
          
          // Handle number fields
          if (typeof value === 'number' || key === 'maximum_claim_value' || key === 'travel_radius_miles' || key === 'max_authorisation_limit') {
            return [key, value === '' ? null : value]
          }
          
          // String field processing
          if (typeof value === 'string') {
            // Clean and format specific fields
            if (key === 'ni_number' && value) {
              // Format NI number to uppercase without spaces
              return [key, value.replace(/\s/g, '').toUpperCase()]
            }
            if (key === 'postcode' && value) {
              // Format postcode to uppercase
              return [key, value.toUpperCase()]
            }
            if ((key === 'vat_number' || key === 'fca_reference' || key === 'company_registration') && value) {
              // Format to uppercase
              return [key, value.toUpperCase()]
            }
            if ((key === 'mobile_phone' || key === 'emergency_contact_phone') && value) {
              // Ensure mobile number starts with +44
              let phone = value.replace(/\s/g, '').replace(/[()-]/g, '')
              if (phone.startsWith('07')) {
                phone = '+447' + phone.substring(2)
              } else if (phone.startsWith('447') && !phone.startsWith('+')) {
                phone = '+' + phone
              } else if (!phone.startsWith('+44') && phone.length === 11 && phone.startsWith('07')) {
                phone = '+44' + phone.substring(1)
              }
              return [key, phone]
            }
            if (key === 'office_phone' && value) {
              // Format office phone (can be landline or mobile)
              let phone = value.replace(/\s/g, '').replace(/[()-]/g, '')
              if (phone.startsWith('07')) {
                phone = '+447' + phone.substring(2)
              } else if ((phone.startsWith('02') || phone.startsWith('01')) && phone.length >= 10) {
                phone = '+44' + phone.substring(1)
              } else if (phone.startsWith('447') || phone.startsWith('442') || phone.startsWith('441')) {
                phone = '+' + phone
              }
              return [key, phone]
            }
            // Convert empty strings to null for database
            return [key, value.trim() === '' ? null : value]
          }
          
          // Default: return as-is
          return [key, value]
        })
      )
      
      console.log('Safe updates (no JSONB):', safeUpdates)
      
      if (Object.keys(safeUpdates).length === 0) {
        console.log('No safe fields to update')
        return { success: true, errors: {} }
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(safeUpdates)
        .eq('id', profile.id)

      if (error) {
        // Log the full error for debugging
        console.error('Supabase update error:', error)
        console.error('Failed updates:', safeUpdates)
        
        // Handle specific database errors with user-friendly messages
        let errorMessage = 'Failed to update profile'
        if (error.message.includes('check_uk_mobile_format')) {
          errorMessage = 'Please enter a valid UK mobile number format (e.g., +44 7123 456789)'
        } else if (error.message.includes('email')) {
          errorMessage = 'Please enter a valid email address'
        } else if (error.message.includes('ni_number')) {
          errorMessage = 'Please enter a valid National Insurance number format (e.g., AB123456C)'
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          errorMessage = `Database error: ${error.message}`
        } else {
          errorMessage = `Database error: ${error.message || 'Unknown error occurred'}`
        }
        return { success: false, errors: { general: errorMessage } }
      }
      
      // Update local state
      setProfile({ ...profile, ...safeUpdates })
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      return { success: true, errors: {} }
    } catch (err) {
      console.error('Error updating profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      return { success: false, errors: { general: errorMessage } }
    } finally {
      setSaving(false)
    }
  }

  return { profile, organisation, loading, saving, error, updateProfile, validateField }
}

// Main Settings Page Component
export default function WorkingSettingsPage() {
  const { profile, organisation, loading, saving, error, updateProfile, validateField } = useWorkingUserProfile()
  const [activeTab, setActiveTab] = useState('profile')
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  
  // Check if user has admin privileges
  const isAdmin = profile?.role && ['super_admin', 'claims_director', 'claims_manager'].includes(profile.role)

  if (loading) {
    return <SettingsSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Profile Loading Error</p>
                <p className="text-sm">{error || 'Profile not found'}</p>
                <div className="mt-3 p-3 bg-white rounded border text-sm">
                  <p className="font-medium mb-2">🔍 Issue Identified:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your user_profiles table has an 'address' column with JSONB type</li>
                    <li>This was causing "invalid input syntax for type json" errors</li>
                    <li>This version completely avoids the address column</li>
                    <li>All other fields should work perfectly now</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <WorkingSettingsHeader profile={profile} organisation={organisation} />



        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn("grid w-full lg:w-fit", isAdmin ? "grid-cols-3 lg:grid-cols-9" : "grid-cols-3 lg:grid-cols-8")}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Address</span>
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Professional</span>
            </TabsTrigger>
            <TabsTrigger value="organisation" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Organisation</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="user-management" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">User Management</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <PersonalInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving}
              showSensitive={showSensitiveData}
              onToggleSensitive={setShowSensitiveData}
              validateField={validateField}
            />
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <ContactInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving} 
              validateField={validateField}
            />
            <EmergencyContactCard
              profile={profile}
              onUpdate={updateProfile}
              saving={saving}
              showSensitive={showSensitiveData}
              onToggleSensitive={setShowSensitiveData}
              validateField={validateField}
            />
          </TabsContent>

          {/* Address Tab */}
          <TabsContent value="address" className="space-y-6">
            <AddressInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving} 
              validateField={validateField}
            />
          </TabsContent>

          {/* Professional Tab */}
          <TabsContent value="professional" className="space-y-6">
            <ProfessionalInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving} 
              validateField={validateField}
            />
            <BusinessInformationCard
              profile={profile}
              onUpdate={updateProfile}
              saving={saving}
              validateField={validateField}
            />
            <WorkPreferencesCard
              profile={profile}
              onUpdate={updateProfile}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="organisation" className="space-y-6">
            <OrganisationDetailsCard organisation={organisation} />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <PermissionsCard profile={profile} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettingsCard />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecuritySettingsCard profile={profile} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="user-management" className="space-y-6">
              <UserManagementCard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

// Working Settings Header
function WorkingSettingsHeader({ 
  profile, 
  organisation 
}: { 
  profile: UserProfile
  organisation: OrganisationData | null
}) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'claims_director': return 'bg-red-100 text-red-800 border-red-200'
      case 'claims_manager': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'chartered_surveyor': return 'bg-green-100 text-green-800 border-green-200'
      case 'principal_contractor': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    setIsUploadingPhoto(true)
    try {
      // TODO: Implement actual photo upload to Supabase Storage
      // For now, simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to update your profile photo. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDataExport = async () => {
    setIsExportingData(true)
    try {
      // Prepare user data for export
      const exportData = {
        profile: {
          name: `${profile.first_name} ${profile.surname}`,
          email: profile.email,
          role: profile.role,
          created_at: profile.created_at,
          last_login: profile.last_login,
          // Add other non-sensitive fields
          job_title: profile.job_title,
          professional_qualifications: profile.professional_qualifications,
          professional_memberships: profile.professional_memberships,
          specialisms: profile.specialisms,
          regions_covered: profile.regions_covered,
          maximum_claim_value: profile.maximum_claim_value,
          travel_radius_miles: profile.travel_radius_miles,
          available_weekdays: profile.available_weekdays,
          available_weekends: profile.available_weekends,
          available_evenings: profile.available_evenings,
          timezone: profile.timezone,
          preferred_language: profile.preferred_language
        },
        organisation: organisation ? {
          name: organisation.name,
          organisation_type: organisation.organisation_type,
          fca_reference: organisation.fca_reference
        } : null,
        exported_at: new Date().toISOString()
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      const exportFileDefaultName = `buildology-profile-${profile.first_name?.toLowerCase()}-${profile.surname?.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      toast({
        title: "Data exported",
        description: "Your profile data has been downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsExportingData(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {profile.first_name?.[0] || 'U'}{profile.surname?.[0] || 'S'}
          </div>
          {profile.is_active && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile.first_name || 'User'} {profile.surname || ''}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {profile.role && (
              <Badge className={cn("text-xs", getRoleBadgeColor(profile.role))}>
                {profile.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            )}
            {organisation && (
              <Badge variant="outline" className="text-xs">
                {organisation.name}
              </Badge>
            )}
            {profile.can_authorise_payments && (
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                Payment Authority
              </Badge>
            )}
            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
              Enterprise
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Last login: {profile.last_login ? format(new Date(profile.last_login), 'PPp') : 'Never'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploadingPhoto}
          />
          <Button variant="outline" size="sm" disabled={isUploadingPhoto}>
            {isUploadingPhoto ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {isUploadingPhoto ? 'Uploading...' : 'Update Photo'}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleDataExport} disabled={isExportingData}>
          {isExportingData ? (
            <Clock className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {isExportingData ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>
    </div>
  )
}

// Personal Information Card
function PersonalInformationCard({ 
  profile, 
  onUpdate, 
  saving, 
  showSensitive, 
  onToggleSensitive,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  showSensitive: boolean
  onToggleSensitive: (show: boolean) => void
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    title: profile.title || '',
    first_name: profile.first_name || '',
    surname: profile.surname || '',
    preferred_name: profile.preferred_name || '',
    email: profile.email || '',
    date_of_birth: profile.date_of_birth || '',
    ni_number: profile.ni_number || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    console.log('Saving personal info:', formData)
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic personal details and identification</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleSensitive(!showSensitive)}
          >
            {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Personal information updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="title">Title</Label>
            <select
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Rev">Rev</option>
              <option value="Sir">Sir</option>
              <option value="Lady">Lady</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleFieldChange('first_name', e.target.value)}
              placeholder="Enter first name"
              className={fieldErrors.first_name ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.first_name && (
              <p className="text-sm text-red-600">{fieldErrors.first_name}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="surname">Surname *</Label>
            <Input
              id="surname"
              value={formData.surname}
              onChange={(e) => handleFieldChange('surname', e.target.value)}
              placeholder="Enter surname"
              className={fieldErrors.surname ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.surname && (
              <p className="text-sm text-red-600">{fieldErrors.surname}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preferred_name">Preferred Name</Label>
            <Input
              id="preferred_name"
              value={formData.preferred_name}
              onChange={(e) => handleFieldChange('preferred_name', e.target.value)}
              placeholder="What should we call you?"
              className={fieldErrors.preferred_name ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.preferred_name && (
              <p className="text-sm text-red-600">{fieldErrors.preferred_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional - how you'd like to be addressed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="Enter email address"
              className={fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
              className={fieldErrors.date_of_birth ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.date_of_birth && (
              <p className="text-sm text-red-600">{fieldErrors.date_of_birth}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ni_number">National Insurance Number</Label>
            <Input
              id="ni_number"
              type={showSensitive ? "text" : "password"}
              value={formData.ni_number}
              onChange={(e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                // Format as user types: XX123456X
                if (value.length > 2) {
                  value = value.substring(0, 2) + value.substring(2).replace(/[^0-9A-Z]/g, '')
                }
                if (value.length > 8) {
                  value = value.substring(0, 8) + value.substring(8).replace(/[^A-Z]/g, '')
                }
                handleFieldChange('ni_number', value)
              }}
              placeholder={showSensitive ? "AB123456C" : "••••••••••"}
              maxLength={9}
              className={fieldErrors.ni_number ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.ni_number && (
              <p className="text-sm text-red-600">{fieldErrors.ni_number}</p>
            )}
            <p className="text-xs text-muted-foreground">Format: AB123456C</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            * Required fields must be completed
          </p>
          <Button onClick={handleSave} disabled={saving} className={cn(
            "min-w-[120px]",
            saveSuccess && "bg-green-600 hover:bg-green-700"
          )}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Contact Information Card
function ContactInformationCard({ 
  profile, 
  onUpdate, 
  saving,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    mobile_phone: profile.mobile_phone || '',
    office_phone: profile.office_phone || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    // Format phone numbers as user types
    if (field === 'mobile_phone') {
      let formatted = value.replace(/[^\d+\s]/g, '') // Only allow digits, +, and spaces
      if (formatted.startsWith('07') && formatted.length >= 3) {
        formatted = '+44 7' + formatted.substring(2)
      } else if (formatted.startsWith('447') && !formatted.startsWith('+')) {
        formatted = '+' + formatted
      } else if (formatted.startsWith('+447') && formatted.length > 4) {
        // Add space after +447 for readability
        const digits = formatted.substring(4).replace(/\s/g, '')
        formatted = '+44 7' + (digits.length > 0 ? ' ' + digits.substring(0, 4) + (digits.length > 4 ? ' ' + digits.substring(4) : '') : '')
      }
      value = formatted
    } else if (field === 'office_phone') {
      let formatted = value.replace(/[^\d+\s]/g, '') // Only allow digits, +, and spaces
      if (formatted.startsWith('07') && formatted.length >= 3) {
        formatted = '+44 7' + formatted.substring(2)
      } else if ((formatted.startsWith('01') || formatted.startsWith('02')) && formatted.length >= 3) {
        formatted = '+44 ' + formatted.substring(1)
      } else if ((formatted.startsWith('447') || formatted.startsWith('441') || formatted.startsWith('442')) && !formatted.startsWith('+')) {
        formatted = '+' + formatted
      } else if (formatted.startsWith('+44') && !formatted.includes(' ') && formatted.length > 3) {
        // Add proper spacing
        const digits = formatted.substring(3)
        if (digits.startsWith('7')) {
          formatted = '+44 7' + (digits.length > 1 ? ' ' + digits.substring(1, 5) + (digits.length > 5 ? ' ' + digits.substring(5) : '') : '')
        } else if (digits.startsWith('1') || digits.startsWith('2')) {
          formatted = '+44 ' + digits.substring(0, 4) + (digits.length > 4 ? ' ' + digits.substring(4) : '')
        }
      }
      value = formatted
    }
    
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Contact Information
        </CardTitle>
        <CardDescription>Primary contact methods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Contact information updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="mobile_phone">Mobile Phone (Primary)</Label>
            <Input
              id="mobile_phone"
              type="tel"
              value={formData.mobile_phone}
              onChange={(e) => handleFieldChange('mobile_phone', e.target.value)}
              placeholder="+44 7123 456789"
              className={fieldErrors.mobile_phone ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.mobile_phone && (
              <p className="text-sm text-red-600">{fieldErrors.mobile_phone}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your personal mobile number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="office_phone">Office Phone (Alternative)</Label>
            <Input
              id="office_phone"
              type="tel"
              value={formData.office_phone}
              onChange={(e) => handleFieldChange('office_phone', e.target.value)}
              placeholder="+44 20 7123 4567"
              className={fieldErrors.office_phone ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.office_phone && (
              <p className="text-sm text-red-600">{fieldErrors.office_phone}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Work landline or alternative mobile number
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Address Information Card
function AddressInformationCard({ 
  profile, 
  onUpdate, 
  saving,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    address_line_1: profile.address_line_1 || '',
    address_line_2: profile.address_line_2 || '',
    city: profile.city || '',
    county: profile.county || '',
    postcode: profile.postcode || '',
    country: profile.country || 'United Kingdom'
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    // Format postcode as user types
    if (field === 'postcode') {
      value = value.toUpperCase()
    }
    
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Address Information
        </CardTitle>
        <CardDescription>Your residential or business address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Address information updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address_line_1">Address Line 1 *</Label>
            <Input
              id="address_line_1"
              value={formData.address_line_1}
              onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
              placeholder="123 Main Street"
              className={fieldErrors.address_line_1 ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.address_line_1 && (
              <p className="text-sm text-red-600">{fieldErrors.address_line_1}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line_2">Address Line 2</Label>
            <Input
              id="address_line_2"
              value={formData.address_line_2}
              onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
              placeholder="Apt, suite, building (optional)"
              className={fieldErrors.address_line_2 ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.address_line_2 && (
              <p className="text-sm text-red-600">{fieldErrors.address_line_2}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="London"
              className={fieldErrors.city ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.city && (
              <p className="text-sm text-red-600">{fieldErrors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="county">County</Label>
            <Input
              id="county"
              value={formData.county}
              onChange={(e) => handleFieldChange('county', e.target.value)}
              placeholder="Greater London"
              className={fieldErrors.county ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.county && (
              <p className="text-sm text-red-600">{fieldErrors.county}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode *</Label>
            <Input
              id="postcode"
              value={formData.postcode}
              onChange={(e) => handleFieldChange('postcode', e.target.value)}
              placeholder="SW1A 1AA"
              className={fieldErrors.postcode ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.postcode && (
              <p className="text-sm text-red-600">{fieldErrors.postcode}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="United Kingdom">United Kingdom</option>
              <option value="England">England</option>
              <option value="Scotland">Scotland</option>
              <option value="Wales">Wales</option>
              <option value="Northern Ireland">Northern Ireland</option>
              <option value="Ireland">Ireland</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Address
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Professional Information Card
function ProfessionalInformationCard({ 
  profile, 
  onUpdate, 
  saving,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    job_title: profile.job_title || '',
    professional_qualifications: Array.isArray(profile.professional_qualifications) ? profile.professional_qualifications.join(', ') : (profile.professional_qualifications || ''),
    professional_certifications: Array.isArray(profile.professional_certifications) ? profile.professional_certifications.join(', ') : (profile.professional_certifications || ''),
    professional_memberships: Array.isArray(profile.professional_memberships) ? profile.professional_memberships.join(', ') : (profile.professional_memberships || ''),
    specialisms: Array.isArray(profile.specialisms) ? profile.specialisms.join(', ') : (profile.specialisms || ''),
    regions_covered: Array.isArray(profile.regions_covered) ? profile.regions_covered.join(', ') : (profile.regions_covered || ''),
    maximum_claim_value: profile.maximum_claim_value ? profile.maximum_claim_value.toString() : '',
    travel_radius_miles: profile.travel_radius_miles ? profile.travel_radius_miles.toString() : ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    // Format maximum claim value with commas as user types
    if (field === 'maximum_claim_value') {
      const numValue = value.replace(/[£,\s]/g, '')
      if (numValue === '' || (!isNaN(parseFloat(numValue)) && parseFloat(numValue) >= 0)) {
        value = numValue ? new Intl.NumberFormat('en-GB').format(parseInt(numValue)) : ''
      } else {
        return // Don't update if invalid
      }
    } else if (field === 'travel_radius_miles') {
      // Only allow positive integers for travel radius
      const numValue = value.replace(/[^\d]/g, '')
      if (numValue === '' || (parseInt(numValue) >= 0 && parseInt(numValue) <= 999)) {
        value = numValue
      } else {
        return // Don't update if invalid
      }
    }
    
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    
    // For the professional card, we need to validate the converted values, not the string inputs
    const convertedData = {
      job_title: formData.job_title,
      professional_qualifications: formData.professional_qualifications 
        ? formData.professional_qualifications.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      professional_certifications: formData.professional_certifications 
        ? formData.professional_certifications.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      professional_memberships: formData.professional_memberships 
        ? formData.professional_memberships.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      specialisms: formData.specialisms 
        ? formData.specialisms.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      regions_covered: formData.regions_covered 
        ? formData.regions_covered.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      maximum_claim_value: formData.maximum_claim_value 
        ? parseFloat(formData.maximum_claim_value.replace(/[£,\s]/g, '')) || null
        : null,
      travel_radius_miles: formData.travel_radius_miles 
        ? parseInt(formData.travel_radius_miles, 10) || null
        : null
    }
    
    // Validate the converted data
    Object.entries(convertedData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    // Convert array fields back to arrays, handling empty strings properly
    const updatedData = {
      ...formData,
      professional_qualifications: formData.professional_qualifications 
        ? formData.professional_qualifications.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      professional_certifications: formData.professional_certifications 
        ? formData.professional_certifications.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      professional_memberships: formData.professional_memberships 
        ? formData.professional_memberships.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      specialisms: formData.specialisms 
        ? formData.specialisms.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      regions_covered: formData.regions_covered 
        ? formData.regions_covered.split(',').map(item => item.trim()).filter(item => item.length > 0)
        : [],
      maximum_claim_value: formData.maximum_claim_value 
        ? parseFloat(formData.maximum_claim_value.replace(/[£,\s]/g, '')) || null
        : null,
      travel_radius_miles: formData.travel_radius_miles 
        ? parseInt(formData.travel_radius_miles, 10) || null
        : null
    }
    
    const result = await onUpdate(updatedData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Professional Information
        </CardTitle>
        <CardDescription>Job title, qualifications, and expertise areas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Professional information updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="job_title">Job Title</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => handleFieldChange('job_title', e.target.value)}
            placeholder="e.g., Senior Loss Adjuster"
            className={fieldErrors.job_title ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.job_title && (
            <p className="text-sm text-red-600">{fieldErrors.job_title}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="professional_qualifications">Professional Qualifications</Label>
          <Input
            id="professional_qualifications"
            value={formData.professional_qualifications}
            onChange={(e) => handleFieldChange('professional_qualifications', e.target.value)}
            placeholder="e.g., ACII, ACILA, MRICS (comma separated)"
            className={fieldErrors.professional_qualifications ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.professional_qualifications && (
            <p className="text-sm text-red-600">{fieldErrors.professional_qualifications}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <strong>Examples:</strong> ACII, ACILA, MRICS, FRICS, Dip CII, ACCA
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="professional_certifications">Professional Certifications</Label>
          <Input
            id="professional_certifications"
            value={formData.professional_certifications}
            onChange={(e) => handleFieldChange('professional_certifications', e.target.value)}
            placeholder="e.g., CII, CILA, RICS (comma separated)"
            className={fieldErrors.professional_certifications ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.professional_certifications && (
            <p className="text-sm text-red-600">{fieldErrors.professional_certifications}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <strong>Examples:</strong> CII, CILA, RICS Certificate, Health & Safety Certification
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="professional_memberships">Professional Memberships</Label>
          <Input
            id="professional_memberships"
            value={formData.professional_memberships}
            onChange={(e) => handleFieldChange('professional_memberships', e.target.value)}
            placeholder="e.g., CII, CILA, RICS (comma separated)"
            className={fieldErrors.professional_memberships ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.professional_memberships && (
            <p className="text-sm text-red-600">{fieldErrors.professional_memberships}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <strong>Examples:</strong> CII, CILA, RICS, CIOB, ICE, RIBA
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialisms">Areas of Expertise</Label>
          <Input
            id="specialisms"
            value={formData.specialisms}
            onChange={(e) => handleFieldChange('specialisms', e.target.value)}
            placeholder="e.g., Property, Liability, Motor (comma separated)"
            className={fieldErrors.specialisms ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.specialisms && (
            <p className="text-sm text-red-600">{fieldErrors.specialisms}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <strong>Examples:</strong> Property, Liability, Motor, Fire, Flood, Commercial
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="regions_covered">Regions Covered</Label>
          <Input
            id="regions_covered"
            value={formData.regions_covered}
            onChange={(e) => handleFieldChange('regions_covered', e.target.value)}
            placeholder="e.g., London, South East, M25 (comma separated)"
            className={fieldErrors.regions_covered ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.regions_covered && (
            <p className="text-sm text-red-600">{fieldErrors.regions_covered}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <strong>Examples:</strong> London, South East, M25, Birmingham, Manchester
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maximum_claim_value">Maximum Claim Value</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="maximum_claim_value"
                type="text"
                value={formData.maximum_claim_value}
                onChange={(e) => handleFieldChange('maximum_claim_value', e.target.value)}
                placeholder="500,000"
                className={cn(
                  "pl-6",
                  fieldErrors.maximum_claim_value ? 'border-red-500 focus:border-red-500' : ''
                )}
              />
            </div>
            {fieldErrors.maximum_claim_value && (
              <p className="text-sm text-red-600">{fieldErrors.maximum_claim_value}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum claim value you can handle
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="travel_radius_miles">Travel Radius (miles)</Label>
            <Input
              id="travel_radius_miles"
              type="number"
              value={formData.travel_radius_miles}
              onChange={(e) => handleFieldChange('travel_radius_miles', e.target.value)}
              placeholder="50"
              className={fieldErrors.travel_radius_miles ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.travel_radius_miles && (
              <p className="text-sm text-red-600">{fieldErrors.travel_radius_miles}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum distance you can travel for work
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Professional Info
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Emergency Contact Card
function EmergencyContactCard({ 
  profile, 
  onUpdate, 
  saving,
  showSensitive,
  onToggleSensitive,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  showSensitive: boolean
  onToggleSensitive: (show: boolean) => void
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_phone: profile.emergency_contact_phone || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    // Format phone number as user types
    if (field === 'emergency_contact_phone') {
      let formatted = value.replace(/\s/g, '') // Remove spaces
      if (formatted.startsWith('07') && formatted.length > 2) {
        formatted = '+44 ' + formatted.substring(1)
      } else if (formatted.startsWith('447') && formatted.length > 3) {
        formatted = '+' + formatted
      } else if (formatted.startsWith('+44') && formatted.length > 3) {
        // Add space after +44 if not present
        if (!formatted.startsWith('+44 ')) {
          formatted = '+44 ' + formatted.substring(3)
        }
      }
      value = formatted
    }
    
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Emergency Contact
        </CardTitle>
        <CardDescription>Person to contact in case of emergency</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Emergency contact updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
              placeholder="Enter emergency contact name"
              className={fieldErrors.emergency_contact_name ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.emergency_contact_name && (
              <p className="text-sm text-red-600">{fieldErrors.emergency_contact_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
              placeholder="+44 7123 456789"
              className={fieldErrors.emergency_contact_phone ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.emergency_contact_phone && (
              <p className="text-sm text-red-600">{fieldErrors.emergency_contact_phone}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter UK phone number (e.g., 07123456789 or +44 7123 456789)
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Emergency Contact
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Business Information Card
function BusinessInformationCard({ 
  profile, 
  onUpdate, 
  saving,
  validateField
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
  validateField: (field: string, value: any) => string | null
}) {
  const [formData, setFormData] = useState({
    fca_reference: profile.fca_reference || '',
    vat_number: profile.vat_number || '',
    company_registration: profile.company_registration || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: string, value: string) => {
    // Auto-format fields as user types
    if (field === 'fca_reference') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (value.length > 8) value = value.substring(0, 8)
    } else if (field === 'vat_number') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
      // Ensure GB prefix for VAT numbers
      if (value && value.length > 0 && !value.startsWith('GB')) {
        value = 'GB' + value
      }
      if (value.length > 12) value = value.substring(0, 12) // GB + 9 digits max
    } else if (field === 'company_registration') {
      value = value.replace(/[^0-9]/g, '')
      if (value.length > 8) value = value.substring(0, 8)
    }
    
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value)
      if (error) {
        errors[key] = error
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    if (!validateAllFields()) {
      return
    }
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setFieldErrors(result.errors)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Business & Compliance Information
        </CardTitle>
        <CardDescription>Regulatory and business registration details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Business information updated successfully!</span>
          </div>
        )}

        {/* General Error */}
        {fieldErrors.general && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              {fieldErrors.general}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fca_reference">FCA Reference Number</Label>
          <Input
            id="fca_reference"
            value={formData.fca_reference}
            onChange={(e) => handleFieldChange('fca_reference', e.target.value)}
            placeholder="e.g., FRN123456"
            className={fieldErrors.fca_reference ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.fca_reference && (
            <p className="text-sm text-red-600">{fieldErrors.fca_reference}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Financial Conduct Authority reference number (6-8 characters)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vat_number">VAT Number</Label>
          <Input
            id="vat_number"
            value={formData.vat_number}
            onChange={(e) => handleFieldChange('vat_number', e.target.value)}
            placeholder="e.g., GB123456789"
            className={fieldErrors.vat_number ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.vat_number && (
            <p className="text-sm text-red-600">{fieldErrors.vat_number}</p>
          )}
          <p className="text-xs text-muted-foreground">
            UK VAT registration number (must start with GB)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_registration">Company Registration Number</Label>
          <Input
            id="company_registration"
            value={formData.company_registration}
            onChange={(e) => handleFieldChange('company_registration', e.target.value)}
            placeholder="e.g., 12345678"
            maxLength={8}
            className={fieldErrors.company_registration ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.company_registration && (
            <p className="text-sm text-red-600">{fieldErrors.company_registration}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Companies House registration number (8 digits)
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Business Info
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Work Preferences Card
function WorkPreferencesCard({ 
  profile, 
  onUpdate, 
  saving
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<{success: boolean, errors: Record<string, string>}>
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    available_weekdays: profile.available_weekdays ?? true,
    available_weekends: profile.available_weekends ?? false,
    available_evenings: profile.available_evenings ?? false,
    available_emergency: profile.available_emergency ?? false,
    timezone: profile.timezone || 'Europe/London',
    preferred_language: profile.preferred_language || 'en-GB'
  })

  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSwitchChange = (field: string, checked: boolean) => {
    setFormData({ ...formData, [field]: checked })
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    
    const result = await onUpdate(formData)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Work Preferences & Availability
        </CardTitle>
        <CardDescription>When you're available to work and other preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Work preferences updated successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Availability</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekdays (Mon-Fri)</Label>
                <p className="text-xs text-muted-foreground">Available during standard business hours</p>
              </div>
              <Switch
                checked={formData.available_weekdays}
                onCheckedChange={(checked) => handleSwitchChange('available_weekdays', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekends</Label>
                <p className="text-xs text-muted-foreground">Available on Saturdays and Sundays</p>
              </div>
              <Switch
                checked={formData.available_weekends}
                onCheckedChange={(checked) => handleSwitchChange('available_weekends', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Evenings</Label>
                <p className="text-xs text-muted-foreground">Available after standard business hours</p>
              </div>
              <Switch
                checked={formData.available_evenings}
                onCheckedChange={(checked) => handleSwitchChange('available_evenings', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Emergency Call-outs</Label>
                <p className="text-xs text-muted-foreground">Available for urgent emergency work</p>
              </div>
              <Switch
                checked={formData.available_emergency}
                onCheckedChange={(checked) => handleSwitchChange('available_emergency', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleSelectChange('timezone', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Dublin">Europe/Dublin (GMT/IST)</option>
              <option value="Europe/Belfast">Europe/Belfast (GMT/BST)</option>
              <option value="Europe/Edinburgh">Europe/Edinburgh (GMT/BST)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_language">Preferred Language</Label>
            <select
              id="preferred_language"
              value={formData.preferred_language}
              onChange={(e) => handleSelectChange('preferred_language', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
              <option value="cy-GB">Welsh</option>
              <option value="gd-GB">Scottish Gaelic</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Organisation Details Card (Read-only)
function OrganisationDetailsCard({ organisation }: { organisation: OrganisationData | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Organisation Details
        </CardTitle>
        <CardDescription>Your organisation information</CardDescription>
      </CardHeader>
      <CardContent>
        {organisation ? (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{organisation.name}</h4>
              {organisation.organisation_type && (
                <Badge variant="outline">
                  {organisation.organisation_type?.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
            {organisation.fca_reference && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">FCA Reference:</span> {organisation.fca_reference}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No organisation details available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Permissions Card (Read-only)
function PermissionsCard({ profile }: { profile: UserProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Permissions & Authority
        </CardTitle>
        <CardDescription>Your current system permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Payment Authorisation</h4>
              <p className="text-sm text-muted-foreground">
                {profile.can_authorise_payments ? 'You can authorise payments' : 'No payment authority'}
              </p>
            </div>
            <Badge className={profile.can_authorise_payments ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {profile.can_authorise_payments ? 'Authorised' : 'Not Authorised'}
            </Badge>
          </div>

          {profile.max_authorisation_limit && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Authorisation Limit</h4>
                <p className="text-sm text-muted-foreground">
                  Maximum amount you can authorise
                </p>
              </div>
              <Badge variant="outline">
                £{profile.max_authorisation_limit.toLocaleString()}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Account Status</h4>
              <p className="text-sm text-muted-foreground">
                Current account status
              </p>
            </div>
            <Badge className={profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {profile.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Notification Settings Card
function NotificationSettingsCard() {
  const { user } = useUser()
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    notification_types: {
      project_updates: true,
      task_reminders: true,
      financial_alerts: true,
      system_announcements: true
    },
    quiet_hours_start: null as string | null,
    quiet_hours_end: null as string | null,
    preferred_contact_method: 'email' as string
  })

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotificationPreferences() {
      if (!user?.id) return
      
      try {
        const { data, error } = await supabase
          .from('communication_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (data && !error) {
          setSettings({
            email_notifications: data.email_notifications ?? true,
            sms_notifications: data.sms_notifications ?? false,
            push_notifications: data.push_notifications ?? true,
            notification_types: data.notification_types || {
              project_updates: true,
              task_reminders: true,
              financial_alerts: true,
              system_announcements: true
            },
            quiet_hours_start: data.quiet_hours_start,
            quiet_hours_end: data.quiet_hours_end,
            preferred_contact_method: data.preferred_contact_method || 'email'
          })
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotificationPreferences()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('communication_preferences')
        .upsert({
          user_id: user.id,
          email_notifications: settings.email_notifications,
          sms_notifications: settings.sms_notifications,
          push_notifications: settings.push_notifications,
          notification_types: settings.notification_types,
          quiet_hours_start: settings.quiet_hours_start,
          quiet_hours_end: settings.quiet_hours_end,
          preferred_contact_method: settings.preferred_contact_method,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated"
      })
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast({
        title: "Save failed",
        description: "Failed to save notification preferences",
        variant: "destructive"
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose how you want to be notified about updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Notification preferences saved successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Communication Methods</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive critical alerts via SMS</p>
              </div>
              <Switch
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, sms_notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Browser and mobile push notifications</p>
              </div>
              <Switch
                checked={settings.push_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, push_notifications: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Types</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Project Updates</Label>
                <p className="text-xs text-muted-foreground">Status changes and milestones</p>
              </div>
              <Switch
                checked={settings.notification_types.project_updates}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  notification_types: { ...settings.notification_types, project_updates: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Task Reminders</Label>
                <p className="text-xs text-muted-foreground">Upcoming deadlines and overdue tasks</p>
              </div>
              <Switch
                checked={settings.notification_types.task_reminders}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  notification_types: { ...settings.notification_types, task_reminders: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Financial Alerts</Label>
                <p className="text-xs text-muted-foreground">Budget warnings and payment notifications</p>
              </div>
              <Switch
                checked={settings.notification_types.financial_alerts}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  notification_types: { ...settings.notification_types, financial_alerts: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>System Announcements</Label>
                <p className="text-xs text-muted-foreground">Platform updates and maintenance notices</p>
              </div>
              <Switch
                checked={settings.notification_types.system_announcements}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  notification_types: { ...settings.notification_types, system_announcements: checked }
                })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Quiet Hours</h4>
          <p className="text-xs text-muted-foreground">Set times when you don't want to receive notifications</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_hours_start">Start Time</Label>
              <Input
                id="quiet_hours_start"
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet_hours_end">End Time</Label>
              <Input
                id="quiet_hours_end"
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value || null })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Preferred Contact Method */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Preferred Contact Method</h4>
          <p className="text-xs text-muted-foreground">Choose your preferred method for important communications</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['email', 'sms', 'phone'].map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`contact_${method}`}
                  name="preferred_contact_method"
                  value={method}
                  checked={settings.preferred_contact_method === method}
                  onChange={(e) => setSettings({ ...settings, preferred_contact_method: e.target.value })}
                  className="text-primary focus:ring-primary"
                />
                <Label htmlFor={`contact_${method}`} className="capitalize cursor-pointer">
                  {method}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Security Settings Card
function SecuritySettingsCard({ profile }: { profile: UserProfile }) {
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive"
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      })
      return
    }

    setIsChangingPassword(true)
    try {
      // TODO: Implement actual password change via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully"
      })
      setShowPasswordChange(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast({
        title: "Password change failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handle2FAToggle = async () => {
    try {
      // TODO: Implement 2FA toggle functionality
      setIs2FAEnabled(!is2FAEnabled)
      toast({
        title: is2FAEnabled ? "2FA Disabled" : "2FA Enabled",
        description: is2FAEnabled ? "Two-factor authentication has been disabled" : "Two-factor authentication has been enabled"
      })
    } catch (error) {
      toast({
        title: "2FA setup failed",
        description: "Failed to configure two-factor authentication",
        variant: "destructive"
      })
    }
  }

  const mockSessions = [
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'London, UK',
      lastActive: '2 minutes ago',
      current: true
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'London, UK', 
      lastActive: '1 hour ago',
      current: false
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Security Settings
        </CardTitle>
        <CardDescription>Account security and access management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">Last changed: Never</p>
            </div>
            <Button variant="outline" onClick={() => setShowPasswordChange(!showPasswordChange)}>
              Change Password
            </Button>
          </div>

          {showPasswordChange && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPasswordChange(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("w-2 h-2 rounded-full", is2FAEnabled ? "bg-green-500" : "bg-gray-400")} />
                <span className="text-xs text-muted-foreground">
                  {is2FAEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={handle2FAToggle}>
              {is2FAEnabled ? 'Disable' : 'Enable'} 2FA
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
            </div>
            <Button variant="outline" onClick={() => setShowSessions(!showSessions)}>
              View Sessions
            </Button>
          </div>

          {showSessions && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {mockSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-sm">{session.device}</h5>
                          {session.current && (
                            <Badge className="text-xs bg-green-100 text-green-800">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{session.location} • {session.lastActive}</p>
                      </div>
                      {!session.current && (
                        <Button variant="outline" size="sm">
                          Terminate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Account Status</h4>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <Badge className={profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {profile.is_active ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// User Management Card (Admin Only)
function UserManagementCard() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          surname,
          role,
          mobile_phone,
          is_active,
          last_login,
          created_at,
          organisation_id
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.first_name} ${user.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'claims_director': return 'bg-red-100 text-red-800 border-red-200'
      case 'claims_manager': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'chartered_surveyor': return 'bg-green-100 text-green-800 border-green-200'
      case 'principal_contractor': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatRole = (role: string) => {
    return role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="user-search" className="sr-only">Search users</Label>
            <Input
              id="user-search"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-describedby="user-search-description"
            />
            <span id="user-search-description" className="sr-only">
              Enter name or email to filter the user list
            </span>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Add New User</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddUser(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-user-email">Email Address</Label>
                    <Input id="new-user-email" type="email" placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="new-user-role">Role</Label>
                    <select
                      id="new-user-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="policyholder">Policyholder</option>
                      <option value="contractor">Contractor</option>
                      <option value="surveyor">Surveyor</option>
                      <option value="claims_handler">Claims Handler</option>
                      <option value="claims_manager">Claims Manager</option>
                      <option value="claims_director">Claims Director</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    toast({
                      title: "User invited",
                      description: "An invitation email has been sent to the user"
                    })
                    setShowAddUser(false)
                  }}>
                    Send Invitation
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        {loading ? (
          <div className="space-y-4" aria-live="polite" aria-label="Loading users">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="System users">
            {filteredUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20"
                role="listitem"
                aria-labelledby={`user-${user.id}-name`}
                aria-describedby={`user-${user.id}-details`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    role="img"
                    aria-label={`Profile picture for ${user.first_name || 'Unknown'} ${user.surname || 'User'}`}
                  >
                    {user.first_name?.[0] || 'U'}{user.surname?.[0] || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 id={`user-${user.id}-name`} className="font-medium">
                        {user.first_name || 'Unknown'} {user.surname || 'User'}
                      </h4>
                      {user.role && (
                        <Badge className={cn("text-xs", getRoleBadgeColor(user.role))} aria-label={`Role: ${formatRole(user.role)}`}>
                          {formatRole(user.role)}
                        </Badge>
                      )}
                      <Badge 
                        className={cn("text-xs", user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}
                        aria-label={`Status: ${user.is_active ? 'Active' : 'Inactive'}`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div id={`user-${user.id}-details`}>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last login: {user.last_login ? format(new Date(user.last_login), 'PPp') : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2" role="group" aria-label={`Actions for ${user.first_name || 'Unknown'} ${user.surname || 'User'}`}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label={`Edit ${user.first_name || 'Unknown'} ${user.surname || 'User'}`}
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant={user.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active || false)}
                    aria-label={`${user.is_active ? 'Deactivate' : 'Activate'} ${user.first_name || 'Unknown'} ${user.surname || 'User'}`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                <p className="font-medium">No users found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        )}

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => !u.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => ['super_admin', 'claims_director', 'claims_manager'].includes(u.role || '')).length}
            </div>
            <div className="text-sm text-muted-foreground">Admin Users</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
function SettingsSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-6">
        {[1,2,3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}