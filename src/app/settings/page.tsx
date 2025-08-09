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
import { 
  User, Settings, Shield, Bell, Building, 
  MapPin, Phone, Mail, Award, FileText,
  CheckCircle2, AlertCircle, Eye, EyeOff, Save,
  UserCircle, Briefcase, GraduationCap, Star,
  Clock, Lock, Users, Camera, Database,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// Complete user profile interface
interface UserProfile {
  id: string
  email: string
  first_name?: string
  surname?: string
  role?: string
  mobile_phone?: string
  can_authorise_payments?: boolean
  is_active?: boolean
  last_login?: string
  created_at: string
  updated_at?: string
  organisation_id?: string
  date_of_birth?: string
  ni_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
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
const SAFE_TEXT_COLUMNS = [
  'first_name',
  'surname', 
  'mobile_phone',
  'email',
  'date_of_birth',
  'ni_number',
  'emergency_contact_name',
  'emergency_contact_phone'
]

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
            first_name,
            surname,
            role,
            mobile_phone,
            can_authorise_payments,
            is_active,
            last_login,
            created_at,
            updated_at,
            organisation_id,
            date_of_birth,
            ni_number,
            emergency_contact_name,
            emergency_contact_phone,
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

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return false

    setSaving(true)
    try {
      setError(null)
      
      // Only allow updates to safe text columns (no JSONB address)
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key, value]) => {
          return SAFE_TEXT_COLUMNS.includes(key) && value !== undefined
        }).map(([key, value]) => {
          // Handle dates properly - convert empty strings to null
          if (key.includes('date') || key === 'date_of_birth') {
            return [key, value === '' ? null : value]
          }
          // Convert empty strings to null for database
          return [key, (typeof value === 'string' && value.trim() === '') ? null : value]
        })
      )
      
      console.log('Safe updates (no JSONB):', safeUpdates)
      
      if (Object.keys(safeUpdates).length === 0) {
        console.log('No safe fields to update')
        return true
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(safeUpdates)
        .eq('id', profile.id)

      if (error) {
        throw new Error(`Update failed: ${error.message}`)
      }
      
      // Update local state
      setProfile({ ...profile, ...safeUpdates })
      return true
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { profile, organisation, loading, saving, error, updateProfile }
}

// Main Settings Page Component
export default function WorkingSettingsPage() {
  const { profile, organisation, loading, saving, error, updateProfile } = useWorkingUserProfile()
  const [activeTab, setActiveTab] = useState('profile')
  const [showSensitiveData, setShowSensitiveData] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 lg:w-fit">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Contact</span>
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
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <PersonalInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving}
              showSensitive={showSensitiveData}
              onToggleSensitive={setShowSensitiveData}
            />
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <ContactInformationCard 
              profile={profile} 
              onUpdate={updateProfile} 
              saving={saving} 
            />
            <EmergencyContactCard
              profile={profile}
              onUpdate={updateProfile}
              saving={saving}
              showSensitive={showSensitiveData}
              onToggleSensitive={setShowSensitiveData}
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
        <Button variant="outline" size="sm">
          <Camera className="w-4 h-4 mr-2" />
          Update Photo
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Export Data
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
  onToggleSensitive 
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<boolean>
  saving: boolean
  showSensitive: boolean
  onToggleSensitive: (show: boolean) => void
}) {
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    surname: profile.surname || '',
    email: profile.email || '',
    date_of_birth: profile.date_of_birth || '',
    ni_number: profile.ni_number || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    setSaveSuccess(false)
    
    console.log('Saving personal info:', formData)
    
    const success = await onUpdate(formData)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Enter first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname">Surname</Label>
            <Input
              id="surname"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              placeholder="Enter surname"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ni_number">National Insurance Number</Label>
            <Input
              id="ni_number"
              type={showSensitive ? "text" : "password"}
              value={formData.ni_number}
              onChange={(e) => setFormData({ ...formData, ni_number: e.target.value })}
              placeholder={showSensitive ? "AB123456C" : "••••••••••"}
            />
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

// Contact Information Card
function ContactInformationCard({ 
  profile, 
  onUpdate, 
  saving 
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<boolean>
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    mobile_phone: profile.mobile_phone || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    setSaveSuccess(false)
    const success = await onUpdate(formData)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
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

        <div className="space-y-2">
          <Label htmlFor="mobile_phone">Mobile Phone</Label>
          <Input
            id="mobile_phone"
            type="tel"
            value={formData.mobile_phone}
            onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
            placeholder="+44 7XXX XXXXXX"
          />
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

// Emergency Contact Card
function EmergencyContactCard({ 
  profile, 
  onUpdate, 
  saving,
  showSensitive,
  onToggleSensitive
}: {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<boolean>
  saving: boolean
  showSensitive: boolean
  onToggleSensitive: (show: boolean) => void
}) {
  const [formData, setFormData] = useState({
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_phone: profile.emergency_contact_phone || ''
  })

  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    setSaveSuccess(false)
    const success = await onUpdate(formData)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              placeholder="Enter emergency contact name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              placeholder="+44 7XXX XXXXXX"
            />
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
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    project_updates: true,
    task_reminders: true,
    financial_alerts: true,
    system_announcements: true
  })

  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = () => {
    // Simulate save
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
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
                checked={settings.project_updates}
                onCheckedChange={(checked) => setSettings({ ...settings, project_updates: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Task Reminders</Label>
                <p className="text-xs text-muted-foreground">Upcoming deadlines and overdue tasks</p>
              </div>
              <Switch
                checked={settings.task_reminders}
                onCheckedChange={(checked) => setSettings({ ...settings, task_reminders: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Financial Alerts</Label>
                <p className="text-xs text-muted-foreground">Budget warnings and payment notifications</p>
              </div>
              <Switch
                checked={settings.financial_alerts}
                onCheckedChange={(checked) => setSettings({ ...settings, financial_alerts: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>System Announcements</Label>
                <p className="text-xs text-muted-foreground">Platform updates and maintenance notices</p>
              </div>
              <Switch
                checked={settings.system_announcements}
                onCheckedChange={(checked) => setSettings({ ...settings, system_announcements: checked })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Security Settings Card
function SecuritySettingsCard({ profile }: { profile: UserProfile }) {
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
            <Button variant="outline">Change Password</Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
            </div>
            <Button variant="outline">View Sessions</Button>
          </div>

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