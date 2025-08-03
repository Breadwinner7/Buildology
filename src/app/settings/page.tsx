'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UserSettingsForm } from '@/components/settings/UserSettingsForm'
import {
  User, Building2, Bell, Shield, CreditCard, Database, 
  Download, Upload, Trash2, RefreshCw, Settings2, 
  Mail, Phone, MapPin, Calendar, Clock, AlertTriangle,
  CheckCircle, HardHat, FileText, Camera, Users,
  Palette, Monitor, Moon, Sun, Globe, Lock
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  const defaultPreferences = {
  theme: 'light',
  dateFormat: 'DD/MM/YYYY',
  currency: 'GBP',
  timezone: 'Europe/London'
}

const defaultNotifications = {
  email: true,
  push: true,
  sms: false,
  projectUpdates: true,
  statusChanges: true,
  deadlineReminders: true,
  teamUpdates: false
}

const defaultCompany = {
  name: '',
  registration: '',
  address: '',
  phone: '',
  email: '',
  website: ''
}

  // Sample settings state - replace with real state management
  const [settings, setSettings] = useState({
    company: {
      name: 'BuildTech Solutions Ltd',
      registration: 'Company No: 12345678',
      address: '123 Construction Way, London, SW1A 1AA',
      phone: '+44 20 1234 5678',
      email: 'contact@buildtech.co.uk',
      website: 'www.buildtech.co.uk'
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
      projectUpdates: true,
      statusChanges: true,
      deadlineReminders: true,
      teamUpdates: false
    },
    preferences: {
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      currency: 'GBP',
      timezone: 'Europe/London',
      language: 'en-GB'
    }
  })

  const handleSave = async (section: string) => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    // Show success toast
  }

  const handleExportData = () => {
    // Export functionality
    console.log('Exporting data...')
  }

  const handleImportData = () => {
    // Import functionality
    console.log('Importing data...')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings2 className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account, company information, and application preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2 py-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-3">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-3">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 py-3">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2 py-3">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserSettingsForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>Customize how the application looks and behaves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={settings.preferences.theme}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select value={settings.preferences.dateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK)</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={settings.preferences.currency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBP">£ British Pound</SelectItem>
                        <SelectItem value="EUR">€ Euro</SelectItem>
                        <SelectItem value="USD">$ US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={settings.preferences.timezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                        <SelectItem value="Europe/Dublin">Dublin (GMT/IST)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('preferences')} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Manage your company details and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={settings.company.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Registration</Label>
                    <Input value={settings.company.registration} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={settings.company.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={settings.company.email} type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={settings.company.website} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Textarea 
                    value={settings.company.address}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Industry Certifications & Accreditations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CITB Registration Number</Label>
                      <Input placeholder="Enter CITB number" />
                    </div>
                    <div className="space-y-2">
                      <Label>NHBC Registration</Label>
                      <Input placeholder="Enter NHBC number" />
                    </div>
                    <div className="space-y-2">
                      <Label>FMB Membership</Label>
                      <Input placeholder="Federation of Master Builders ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Public Liability Insurance</Label>
                      <Input placeholder="Policy number and amount" />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('company')} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Company Details'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about project updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Delivery Methods</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch 
                        checked={settings.notifications.email}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, email: checked }
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Browser and desktop notifications</p>
                      </div>
                      <Switch 
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, push: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">Text message alerts for urgent updates</p>
                      </div>
                      <Switch 
                        checked={settings.notifications.sms}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, sms: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Project Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Project Updates</Label>
                        <p className="text-sm text-muted-foreground">Status changes and progress updates</p>
                      </div>
                      <Switch checked={settings.notifications.projectUpdates} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Deadline Reminders</Label>
                        <p className="text-sm text-muted-foreground">Upcoming deadlines and milestones</p>
                      </div>
                      <Switch checked={settings.notifications.deadlineReminders} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Team Updates</Label>
                        <p className="text-sm text-muted-foreground">Team member activities and mentions</p>
                      </div>
                      <Switch checked={settings.notifications.teamUpdates} />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('notifications')} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Manage your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Password</h3>
                      <p className="text-sm text-muted-foreground">Last changed 2 months ago</p>
                    </div>
                    <Button variant="outline">Change Password</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">
                        Not Enabled
                      </Badge>
                      <Button variant="outline">Enable</Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Login Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Chrome on Windows</p>
                            <p className="text-sm text-muted-foreground">London, UK • Current session</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                          Active
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Mobile App</p>
                            <p className="text-sm text-muted-foreground">Manchester, UK • 2 days ago</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Revoke</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing & Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription and payment methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Professional Plan</p>
                      <p className="text-sm text-green-700">£49/month • Next billing: March 15, 2024</p>
                    </div>
                  </div>
                  <Button variant="outline">Manage Plan</Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Payment Method</h3>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/26</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Update</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Billing History</h3>
                  <div className="space-y-2">
                    {['February 2024', 'January 2024', 'December 2023'].map((month, index) => (
                      <div key={month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{month}</p>
                          <p className="text-sm text-muted-foreground">Professional Plan - £49.00</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Export, import, or delete your project data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Export Data</h3>
                        <p className="text-sm text-muted-foreground">Download all your project data in CSV format</p>
                      </div>
                      <Button variant="outline" onClick={handleExportData}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Import Data</h3>
                        <p className="text-sm text-muted-foreground">Import projects from CSV or other systems</p>
                      </div>
                      <Button variant="outline" onClick={handleImportData}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-red-900">Delete Account</h3>
                        <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                      </div>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Storage Usage</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Projects Data</span>
                      <span>2.3 MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Documents & Photos</span>
                      <span>156.7 MB</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Used</span>
                      <span>159 MB of 5 GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '3.18%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}