'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Shield,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'
import { UK_ROLE_CATEGORIES, getRoleDisplayInfo, getUserCategory } from '@/lib/permissions'

interface UserProfile {
  id: string
  email: string
  first_name: string
  surname: string
  role: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  access_level: string
  company_id?: string
  job_title?: string
  department?: string
  phone?: string
  work_phone?: string
  last_login_attempt?: string
  created_at: string
  updated_at: string
  two_factor_enabled: boolean
  account_locked: boolean
  failed_login_attempts: number
  companies?: {
    name: string
    company_type: string
  }
}

interface UserStats {
  total: number
  active: number
  inactive: number
  suspended: number
  pending: number
  byRole: Record<string, number>
  byCompanyType: Record<string, number>
  newThisMonth: number
  recentLogins: number
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500', variant: 'default' as const, icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-500', variant: 'secondary' as const, icon: Clock },
  suspended: { label: 'Suspended', color: 'bg-red-500', variant: 'destructive' as const, icon: XCircle },
  pending: { label: 'Pending', color: 'bg-yellow-500', variant: 'secondary' as const, icon: AlertTriangle }
}

const accessLevelConfig = {
  basic: { label: 'Basic', color: 'bg-muted text-foreground', icon: Eye },
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
  elevated: { label: 'Elevated', color: 'bg-purple-100 text-purple-800', icon: Shield },
  admin: { label: 'Admin', color: 'bg-orange-100 text-orange-800', icon: Crown },
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800', icon: Crown }
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCompanyType, setSelectedCompanyType] = useState('all')
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Get unique roles and company types from the data
  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map(user => user.role))
    return Array.from(roles).sort()
  }, [users])

  const uniqueCompanyTypes = useMemo(() => {
    const types = new Set(users.map(user => user.companies?.company_type).filter(Boolean))
    return Array.from(types).sort()
  }, [users])

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let filtered = [...users]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        `${user.first_name} ${user.surname}`.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.companies?.name?.toLowerCase().includes(query) ||
        user.job_title?.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query)
      )
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(user => user.status === selectedStatus)
    }

    if (selectedCompanyType !== 'all') {
      filtered = filtered.filter(user => user.companies?.company_type === selectedCompanyType)
    }

    return filtered
  }, [users, searchQuery, selectedRole, selectedStatus, selectedCompanyType])

  // Fetch users and calculate statistics
  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      console.log('Attempting to fetch users from user_profiles table...')
      
      // Skip auth.admin calls since they require admin privileges
      // Try user_profiles table directly
      console.log('Querying user_profiles table...')
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(50)

      console.log('Supabase query result:', { data: data?.length, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setUsers(data || [])
      
      // Calculate statistics
      const total = data?.length || 0
      const active = data?.filter(u => u.status === 'active' || u.is_active === true).length || 0
      const inactive = data?.filter(u => u.status === 'inactive' || u.is_active === false).length || 0
      const suspended = data?.filter(u => u.status === 'suspended').length || 0
      const pending = data?.filter(u => u.status === 'pending').length || 0
      
      const byRole: Record<string, number> = {}
      const byCompanyType: Record<string, number> = {}
      
      data?.forEach(user => {
        if (user.role) {
          byRole[user.role] = (byRole[user.role] || 0) + 1
        }
        // For now, we'll use organisation_id as a proxy for company type
        // This should be updated when proper company/organization structure is implemented
        const companyType = user.organisation_id ? 'Organisation Member' : 'Independent'
        byCompanyType[companyType] = (byCompanyType[companyType] || 0) + 1
      })
      
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const newThisMonth = data?.filter(u => new Date(u.created_at) > oneMonthAgo).length || 0
      
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentLogins = data?.filter(u => 
        u.last_login && new Date(u.last_login) > sevenDaysAgo
      ).length || 0
      
      setStats({
        total,
        active,
        inactive,
        suspended,
        pending,
        byRole,
        byCompanyType,
        newThisMonth,
        recentLogins
      })
      
    } catch (error: any) {
      console.error('Error fetching users:', error)
      
      // Handle admin permission error specifically
      if (error?.code === 'not_admin' || error?.message?.includes('not_admin') || error?.message?.includes('not allowed')) {
        setMessage({ 
          type: 'error', 
          text: 'Admin access required. Please ensure your user account has admin privileges to access user management.'
        })
        setUsers([])
        setStats({
          total: 0,
          active: 0,
          inactive: 0,
          suspended: 0,
          pending: 0,
          byRole: {},
          byCompanyType: {},
          newThisMonth: 0,
          recentLogins: 0
        })
        return
      }
      
      // More comprehensive error message extraction for other errors
      let errorMessage = 'Unknown database error'
      
      if (error) {
        errorMessage = error?.message || 
                      error?.details || 
                      error?.hint || 
                      error?.error_description ||
                      error?.description ||
                      (typeof error === 'string' ? error : JSON.stringify(error))
      }
      
      setMessage({ 
        type: 'error', 
        text: `Failed to load users: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  // Toggle user status
  const toggleUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      setActionLoading(userId)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ))
      
      setMessage({ 
        type: 'success', 
        text: `User status updated to ${newStatus}` 
      })
      
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to update user status: ' + error.message })
    } finally {
      setActionLoading(null)
    }
  }

  // Toggle user account lock
  const toggleAccountLock = async (userId: string, lock: boolean) => {
    try {
      setActionLoading(userId)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          account_locked: lock,
          failed_login_attempts: lock ? 0 : undefined, // Reset attempts when unlocking
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, account_locked: lock, failed_login_attempts: lock ? 0 : user.failed_login_attempts } : user
      ))
      
      setMessage({ 
        type: 'success', 
        text: `User account ${lock ? 'locked' : 'unlocked'}` 
      })
      
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to update account lock: ' + error.message })
    } finally {
      setActionLoading(null)
    }
  }

  // Export users data
  const exportUsers = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Status', 'Company', 'Department', 'Created', 'Last Login'].join(','),
      ...filteredUsers.map(user => [
        `"${user.first_name} ${user.surname}"`,
        user.email,
        user.role,
        user.status,
        `"${user.companies?.name || ''}"`,
        `"${user.department || ''}"`,
        format(new Date(user.created_at), 'yyyy-MM-dd'),
        user.last_login_attempt ? format(new Date(user.last_login_attempt), 'yyyy-MM-dd') : 'Never'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const UserTableRow = ({ user }: { user: UserProfile }) => {
    const roleInfo = getRoleDisplayInfo(user.role)
    const category = getUserCategory(user.role)
    const StatusIcon = statusConfig[user.status]?.icon
    const AccessIcon = accessLevelConfig[user.access_level as keyof typeof accessLevelConfig]?.icon
    const isActionLoading = actionLoading === user.id

    return (
      <TableRow key={user.id} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">
                {user.first_name.charAt(0)}{user.surname.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{user.first_name} {user.surname}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="space-y-1">
            <Badge className={getRoleDisplayInfo(user.role).category === 'System' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
              {roleInfo.display}
            </Badge>
            <p className="text-xs text-muted-foreground">{roleInfo.category}</p>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig[user.status]?.variant || 'secondary'}>
              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
              {statusConfig[user.status]?.label || user.status || 'Unknown'}
            </Badge>
            {user.account_locked && (
              <Badge variant="destructive" className="text-xs">
                Locked
              </Badge>
            )}
          </div>
        </TableCell>
        
        <TableCell>
          {user.companies ? (
            <div>
              <p className="font-medium text-sm">{user.companies.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.companies.company_type.replace('_', ' ')}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No company</span>
          )}
        </TableCell>
        
        <TableCell>
          <div>
            <p className="text-sm">{user.job_title || '—'}</p>
            <p className="text-xs text-muted-foreground">{user.department || ''}</p>
          </div>
        </TableCell>
        
        <TableCell>
          {AccessIcon && (
            <Badge className={accessLevelConfig[user.access_level as keyof typeof accessLevelConfig]?.color}>
              <AccessIcon className="w-3 h-3 mr-1" />
              {accessLevelConfig[user.access_level as keyof typeof accessLevelConfig]?.label}
            </Badge>
          )}
        </TableCell>
        
        <TableCell className="text-sm">
          {user.last_login_attempt 
            ? format(new Date(user.last_login_attempt), 'MMM dd, yyyy')
            : 'Never'
          }
        </TableCell>
        
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isActionLoading}>
                {isActionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user)
                  setShowEditUserDialog(true)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert(JSON.stringify(user, null, 2))}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {user.status === 'active' ? (
                <DropdownMenuItem
                  onClick={() => toggleUserStatus(user.id, 'inactive')}
                  className="text-orange-600"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => toggleUserStatus(user.id, 'active')}
                  className="text-green-600"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              
              {user.status !== 'suspended' ? (
                <DropdownMenuItem
                  onClick={() => toggleUserStatus(user.id, 'suspended')}
                  className="text-red-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => toggleUserStatus(user.id, 'active')}
                  className="text-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Unsuspend
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {user.account_locked ? (
                <DropdownMenuItem
                  onClick={() => toggleAccountLock(user.id, false)}
                  className="text-blue-600"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Unlock Account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => toggleAccountLock(user.id, true)}
                  className="text-red-600"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Lock Account
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and access across the insurance platform</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportUsers} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddUserDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{loading ? '—' : stats?.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            {!loading && stats && (
              <p className="text-sm text-muted-foreground mt-2">
                +{stats.newThisMonth} this month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '—' : stats?.active || 0}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
            {!loading && stats && (
              <p className="text-sm text-muted-foreground mt-2">
                {stats.recentLogins} recent logins
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive/Suspended</p>
                <p className="text-3xl font-bold text-orange-600">{loading ? '—' : (stats?.inactive || 0) + (stats?.suspended || 0)}</p>
              </div>
              <UserX className="w-8 h-8 text-orange-500" />
            </div>
            {!loading && stats && (
              <div className="text-sm text-muted-foreground mt-2">
                <span>{stats.inactive} inactive, </span>
                <span className="text-red-600">{stats.suspended} suspended</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Roles</p>
                <p className="text-3xl font-bold">{loading ? '—' : uniqueRoles.length}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
            {!loading && stats && (
              <p className="text-sm text-muted-foreground mt-2">
                {Object.keys(stats.byCompanyType).length} company types
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, company, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayInfo(role).display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedCompanyType} onValueChange={setSelectedCompanyType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Company Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery('')
                setSelectedRole('all')
                setSelectedStatus('all')
                setSelectedCompanyType('all')
              }}>
                Clear
              </Button>
            </div>
          </div>
          
          {!loading && (
            <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
              <span>Showing {filteredUsers.length} of {users.length} users</span>
              {(searchQuery || selectedRole !== 'all' || selectedStatus !== 'all' || selectedCompanyType !== 'all') && (
                <span>• Filters active</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Comprehensive user management and access control</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {users.length === 0 ? 'No users found' : 'No users match your filters'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <UserTableRow key={user.id} user={user} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with appropriate role and permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Enter first name" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Enter last name" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="user@company.com" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayInfo(role).display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="elevated">Elevated</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" placeholder="Enter job title" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claims">Claims</SelectItem>
                    <SelectItem value="underwriting">Underwriting</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+44 20 1234 5678" />
              </div>
              <div>
                <Label htmlFor="workPhone">Work Phone</Label>
                <Input id="workPhone" type="tel" placeholder="Extension or direct line" />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Security Settings</h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">User must set up 2FA on first login</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send Welcome Email</Label>
                  <p className="text-sm text-muted-foreground">Send login credentials and welcome information</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO: Implement user creation
              setShowAddUserDialog(false)
              setMessage({ type: 'success', text: 'User creation feature coming soon!' })
            }}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user account settings and permissions
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input 
                    id="editFirstName" 
                    defaultValue={selectedUser.first_name}
                    placeholder="Enter first name" 
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input 
                    id="editLastName" 
                    defaultValue={selectedUser.surname}
                    placeholder="Enter last name" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editEmail">Email Address</Label>
                <Input 
                  id="editEmail" 
                  type="email" 
                  defaultValue={selectedUser.email}
                  placeholder="user@company.com" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRole">Role</Label>
                  <Select defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayInfo(role).display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editAccessLevel">Access Level</Label>
                  <Select defaultValue={selectedUser.access_level}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="elevated">Elevated</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editJobTitle">Job Title</Label>
                  <Input 
                    id="editJobTitle" 
                    defaultValue={selectedUser.job_title || ''}
                    placeholder="Enter job title" 
                  />
                </div>
                <div>
                  <Label htmlFor="editDepartment">Department</Label>
                  <Select defaultValue={selectedUser.department || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claims">Claims</SelectItem>
                      <SelectItem value="underwriting">Underwriting</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Account Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select defaultValue={selectedUser.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <Label>Account Locked</Label>
                      <p className="text-xs text-muted-foreground">Prevent user login</p>
                    </div>
                    <Switch defaultChecked={selectedUser.account_locked} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{format(new Date(selectedUser.created_at), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(selectedUser.updated_at), 'PPP')}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO: Implement user update
              setShowEditUserDialog(false)
              setMessage({ type: 'success', text: 'User update feature coming soon!' })
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}