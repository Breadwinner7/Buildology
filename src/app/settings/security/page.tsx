'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Download,
  QrCode,
  RefreshCw,
  Clock,
  Trash2
} from 'lucide-react'
import Image from 'next/image'

// Import our security hooks
import { useMFA } from '@/lib/security/mfa'
import { useAuthSecurity } from '@/lib/security/auth-security'

interface BackupCode {
  code: string
  used: boolean
}

export default function SecuritySettingsPage() {
  const [selectedTab, setSelectedTab] = useState('2fa')
  const [loading, setLoading] = useState(false)
  const [mfaSetupData, setMfaSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)

  // Mock user data - in real app, this would come from auth context
  const currentUser = {
    id: 'user123',
    email: 'user@buildology.com',
    name: 'John Doe'
  }

  // Security hooks
  const {
    setupTOTP,
    verifyTOTP,
    generateBackupCodes,
    disableMFA,
    getMFAStatus
  } = useMFA()

  const {
    getSecurityEvents,
    getLoginHistory
  } = useAuthSecurity()

  useEffect(() => {
    checkMFAStatus()
    loadSecurityData()
  }, [])

  const checkMFAStatus = async () => {
    try {
      const status = await getMFAStatus(currentUser.id)
      setMfaEnabled(status.enabled)
    } catch (error) {
      console.error('Failed to check MFA status:', error)
    }
  }

  const loadSecurityData = async () => {
    try {
      // Load security events and login history
      const events = getSecurityEvents(currentUser.id, 10)
      const history = getLoginHistory(currentUser.id, 10)
      
      console.log('Security events:', events)
      console.log('Login history:', history)
    } catch (error) {
      console.error('Failed to load security data:', error)
    }
  }

  const handleSetupMFA = async () => {
    try {
      setLoading(true)
      
      const setup = await setupTOTP(currentUser.id, currentUser.email)
      setMfaSetupData(setup)
      
      // Generate backup codes
      const codes = await generateBackupCodes(currentUser.id)
      setBackupCodes(codes.map(code => ({ code, used: false })))
      
    } catch (error) {
      console.error('Failed to setup MFA:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMFA = async () => {
    try {
      setLoading(true)
      
      const isValid = await verifyTOTP(currentUser.id, verificationCode)
      
      if (isValid) {
        setMfaEnabled(true)
        setVerificationCode('')
        setShowBackupCodes(true)
      } else {
        alert('Invalid verification code. Please try again.')
      }
    } catch (error) {
      console.error('Failed to verify MFA:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableMFA = async () => {
    try {
      setLoading(true)
      
      const result = await disableMFA(currentUser.id)
      if (result.success) {
        setMfaEnabled(false)
        setMfaSetupData(null)
        setBackupCodes([])
        setShowBackupCodes(false)
      }
    } catch (error) {
      console.error('Failed to disable MFA:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.map(bc => bc.code).join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'buildology-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const regenerateBackupCodes = async () => {
    try {
      const codes = await generateBackupCodes(currentUser.id)
      setBackupCodes(codes.map(code => ({ code, used: false })))
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Shield className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Security Settings</h1>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="activity">Security Activity</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
        </TabsList>

        {/* Two-Factor Authentication Tab */}
        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Two-Factor Authentication (2FA)</span>
                {mfaEnabled ? (
                  <Badge variant="default" className="ml-2">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with time-based one-time passwords (TOTP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!mfaEnabled ? (
                // MFA Setup Flow
                !mfaSetupData ? (
                  <div className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertTitle>Secure Your Account</AlertTitle>
                      <AlertDescription>
                        Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center space-x-4">
                      <Button 
                        onClick={handleSetupMFA} 
                        disabled={loading}
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Enable 2FA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // QR Code Setup
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* QR Code */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Step 1: Scan QR Code</h3>
                        <div className="p-4 border rounded-lg bg-background w-fit">
                          <div className="flex items-center justify-center h-48 w-48 bg-muted rounded">
                            <QrCode className="h-16 w-16 text-muted-foreground" />
                            <span className="sr-only">QR Code for {mfaSetupData.qrCodeUrl}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                      </div>

                      {/* Manual Setup */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Or enter manually:</h3>
                        <div className="space-y-2">
                          <Label>Account Name</Label>
                          <div className="flex items-center space-x-2">
                            <Input 
                              value={`Buildology (${currentUser.email})`}
                              readOnly
                              className="bg-muted"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`Buildology (${currentUser.email})`)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Secret Key</Label>
                          <div className="flex items-center space-x-2">
                            <Input 
                              value={mfaSetupData.manualEntryKey}
                              readOnly
                              className="bg-muted font-mono text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(mfaSetupData.manualEntryKey)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Verification Step */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 2: Verify Setup</h3>
                      <div className="flex items-center space-x-4 max-w-md">
                        <div className="flex-1">
                          <Label htmlFor="verification-code">Enter the 6-digit code from your app</Label>
                          <Input
                            id="verification-code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            className="text-center text-lg font-mono"
                            maxLength={6}
                          />
                        </div>
                        <Button 
                          onClick={handleVerifyMFA}
                          disabled={loading || verificationCode.length !== 6}
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify & Enable
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // MFA Enabled State
                <div className="space-y-6">
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Two-Factor Authentication Active</AlertTitle>
                    <AlertDescription>
                      Your account is protected with 2FA. You'll need your authenticator app to sign in.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Status: Enabled</h3>
                      <p className="text-sm text-muted-foreground">
                        Configured for {currentUser.email}
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleDisableMFA}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Disable 2FA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Backup Codes Section */}
              {(mfaEnabled || showBackupCodes) && backupCodes.length > 0 && (
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Backup Codes</h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadBackupCodes}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateBackupCodes}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Save these backup codes in a secure location. Each code can only be used once to sign in if you lose access to your authenticator app.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {backupCodes.map((backupCode, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded font-mono text-sm text-center ${
                          backupCode.used 
                            ? 'bg-muted text-muted-foreground line-through' 
                            : 'bg-background'
                        }`}
                      >
                        {backupCode.code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage devices and locations where you're signed in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Session */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Current Session</div>
                      <div className="text-sm text-muted-foreground">
                        Windows • Chrome • London, UK
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active now
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">Current</Badge>
                </div>

                {/* Mock previous sessions */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">iPhone 14 Pro</div>
                      <div className="text-sm text-muted-foreground">
                        iOS • Safari • London, UK
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last active 2 hours ago
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">MacBook Pro</div>
                      <div className="text-sm text-muted-foreground">
                        macOS • Safari • London, UK
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last active yesterday
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t mt-6">
                <Button variant="destructive" className="w-full">
                  Sign Out All Other Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Activity</CardTitle>
              <CardDescription>Monitor recent security events and login attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">Successful login</div>
                    <div className="text-sm text-muted-foreground">
                      From London, UK • Chrome on Windows • 2 minutes ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">2FA enabled</div>
                    <div className="text-sm text-muted-foreground">
                      Two-factor authentication was enabled • 1 hour ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">Successful login</div>
                    <div className="text-sm text-muted-foreground">
                      From London, UK • Safari on iPhone • 3 hours ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <div className="font-medium">Password changed</div>
                    <div className="text-sm text-muted-foreground">
                      Account password was updated • Yesterday
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Controls Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Controls</CardTitle>
              <CardDescription>Manage your data privacy and GDPR preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics">Usage Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow collection of anonymous usage data to improve the service
                  </p>
                </div>
                <Switch id="analytics" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing">Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about product updates and features
                  </p>
                </div>
                <Switch id="marketing" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activity-log">Activity Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep detailed logs of your account activity for security
                  </p>
                </div>
                <Switch id="activity-log" defaultChecked />
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-semibold">Data Rights (GDPR)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export My Data
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Privacy Policy
                  </Button>
                </div>
                <div className="pt-2">
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}