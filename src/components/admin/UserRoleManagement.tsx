'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Shield,
  Key,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  UserX,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Mock users data
const mockUsers = [
  {
    id: 'user-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@company.com',
    role: 'administrator',
    department: 'Management',
    status: 'active',
    lastLogin: '2024-01-18T14:30:00Z',
    createdAt: '2023-06-15T10:00:00Z',
    avatar: '',
    permissions: ['all']
  },
  {
    id: 'user-002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.com',
    role: 'senior_adjuster',
    department: 'Claims',
    status: 'active',
    lastLogin: '2024-01-18T12:15:00Z',
    createdAt: '2023-08-20T09:30:00Z',
    avatar: '',
    permissions: ['claims_manage', 'estimates_create', 'reports_view']
  },
  {
    id: 'user-003',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@company.com',
    role: 'estimator',
    department: 'Operations',
    status: 'active',
    lastLogin: '2024-01-18T11:45:00Z',
    createdAt: '2023-09-10T14:20:00Z',
    avatar: '',
    permissions: ['estimates_create', 'estimates_edit', 'projects_view']
  },
  {
    id: 'user-004',
    firstName: 'Emma',
    lastName: 'Thompson',
    email: 'emma.thompson@company.com',
    role: 'adjuster',
    department: 'Claims',
    status: 'active',
    lastLogin: '2024-01-17T16:00:00Z',
    createdAt: '2023-11-05T11:00:00Z',
    avatar: '',
    permissions: ['claims_view', 'projects_view', 'tasks_manage']
  },
  {
    id: 'user-005',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@company.com',
    role: 'viewer',
    department: 'Finance',
    status: 'inactive',
    lastLogin: '2024-01-10T09:20:00Z',
    createdAt: '2023-12-01T13:45:00Z',
    avatar: '',
    permissions: ['projects_view', 'reports_view']
  }
]

// Role definitions with permissions
const roleDefinitions = [
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    color: 'bg-red-100 text-red-800',
    icon: Crown,
    level: 5,
    permissions: ['all'],
    userCount: 1
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Management level access with team oversight capabilities',
    color: 'bg-purple-100 text-purple-800',
    icon: Users,
    level: 4,
    permissions: ['claims_manage', 'estimates_approve', 'reports_create', 'users_view', 'projects_manage'],
    userCount: 2
  },
  {
    id: 'senior_adjuster',
    name: 'Senior Adjuster',
    description: 'Advanced claims processing and approval authority',
    color: 'bg-blue-100 text-blue-800',
    icon: Shield,
    level: 3,
    permissions: ['claims_manage', 'estimates_create', 'estimates_approve', 'reports_view', 'projects_manage'],
    userCount: 1
  },
  {
    id: 'adjuster',
    name: 'Adjuster',
    description: 'Standard claims processing and project management',
    color: 'bg-green-100 text-green-800',
    icon: FileText,
    level: 2,
    permissions: ['claims_view', 'claims_edit', 'projects_view', 'projects_edit', 'tasks_manage'],
    userCount: 3
  },
  {
    id: 'estimator',
    name: 'Estimator',
    description: 'Specialized in creating and managing estimates',
    color: 'bg-orange-100 text-orange-800',
    icon: DollarSign,
    level: 2,
    permissions: ['estimates_create', 'estimates_edit', 'projects_view', 'tasks_view'],
    userCount: 1
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to projects and reports',
    color: 'bg-gray-100 text-gray-800',
    icon: Eye,
    level: 1,
    permissions: ['projects_view', 'reports_view'],
    userCount: 2
  }
]

// Available permissions
const availablePermissions = [
  {
    category: 'Claims Management',
    permissions: [
      { id: 'claims_view', name: 'View Claims', description: 'View all claims and their details' },
      { id: 'claims_create', name: 'Create Claims', description: 'Create new claims' },
      { id: 'claims_edit', name: 'Edit Claims', description: 'Modify existing claims' },
      { id: 'claims_manage', name: 'Manage Claims', description: 'Full claims management including approval/rejection' },
      { id: 'claims_delete', name: 'Delete Claims', description: 'Permanently delete claims' }
    ]
  },
  {
    category: 'Project Management',
    permissions: [
      { id: 'projects_view', name: 'View Projects', description: 'View all projects and details' },
      { id: 'projects_create', name: 'Create Projects', description: 'Create new projects' },
      { id: 'projects_edit', name: 'Edit Projects', description: 'Modify existing projects' },
      { id: 'projects_manage', name: 'Manage Projects', description: 'Full project management capabilities' },
      { id: 'projects_delete', name: 'Delete Projects', description: 'Permanently delete projects' }
    ]
  },
  {
    category: 'Estimates & Pricing',
    permissions: [
      { id: 'estimates_view', name: 'View Estimates', description: 'View all estimates' },
      { id: 'estimates_create', name: 'Create Estimates', description: 'Create new estimates' },
      { id: 'estimates_edit', name: 'Edit Estimates', description: 'Modify existing estimates' },
      { id: 'estimates_approve', name: 'Approve Estimates', description: 'Approve/reject estimates' },
      { id: 'pricing_manage', name: 'Manage Pricing', description: 'Manage pricing database' }
    ]
  },
  {
    category: 'Task Management',
    permissions: [
      { id: 'tasks_view', name: 'View Tasks', description: 'View assigned tasks' },
      { id: 'tasks_create', name: 'Create Tasks', description: 'Create new tasks' },
      { id: 'tasks_manage', name: 'Manage Tasks', description: 'Full task management capabilities' }
    ]
  },
  {
    category: 'Reports & Analytics',
    permissions: [
      { id: 'reports_view', name: 'View Reports', description: 'View generated reports' },
      { id: 'reports_create', name: 'Create Reports', description: 'Generate custom reports' },
      { id: 'analytics_view', name: 'View Analytics', description: 'Access analytics dashboard' },
      { id: 'exports_create', name: 'Create Exports', description: 'Export data in various formats' }
    ]
  },
  {
    category: 'Administration',
    permissions: [
      { id: 'users_view', name: 'View Users', description: 'View user accounts' },
      { id: 'users_manage', name: 'Manage Users', description: 'Create, edit, and manage users' },
      { id: 'roles_manage', name: 'Manage Roles', description: 'Create and modify user roles' },
      { id: 'system_settings', name: 'System Settings', description: 'Configure system settings' }
    ]
  }
]

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500', variant: 'default' as const, icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-500', variant: 'secondary' as const, icon: Clock },
  suspended: { label: 'Suspended', color: 'bg-red-500', variant: 'destructive' as const, icon: UserX },
  pending: { label: 'Pending', color: 'bg-yellow-500', variant: 'secondary' as const, icon: Clock }
}

interface UserRoleManagementProps {
  className?: string
}

export function UserRoleManagement({ className }: UserRoleManagementProps) {
  const [selectedView, setSelectedView] = useState('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  // Filter users
  const filteredUsers = useMemo(() => {
    let users = [...mockUsers]

    if (searchQuery) {
      users = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedRole !== 'all') {
      users = users.filter(user => user.role === selectedRole)
    }

    if (selectedStatus !== 'all') {
      users = users.filter(user => user.status === selectedStatus)
    }

    return users
  }, [searchQuery, selectedRole, selectedStatus])

  const handleUserStatusToggle = (userId: string, newStatus: string) => {
    console.log(`Changing user ${userId} status to ${newStatus}`)
    // Implement status change logic
  }

  const UserCard = ({ user }: { user: typeof mockUsers[0] }) => {
    const role = roleDefinitions.find(r => r.id === user.role)
    const StatusIcon = statusConfig[user.status as keyof typeof statusConfig]?.icon
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="text-lg font-semibold">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.department}</p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedUser(user.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit User
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleUserStatusToggle(user.id, user.status === 'active' ? 'inactive' : 'active')}
                  >
                    {user.status === 'active' ? (
                      <>
                        <UserX className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {role && (
                  <Badge className={role.color}>
                    <role.icon className="w-3 h-3 mr-1" />
                    {role.name}
                  </Badge>
                )}
              </div>
              <Badge variant={statusConfig[user.status as keyof typeof statusConfig]?.variant}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig[user.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Last Login:</span>
                <p className="font-medium">{format(new Date(user.lastLogin), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Member Since:</span>
                <p className="font-medium">{format(new Date(user.createdAt), 'MMM yyyy')}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Permissions:</span>
              <div className="flex flex-wrap gap-1">
                {user.permissions.slice(0, 3).map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission.replace('_', ' ')}
                  </Badge>
                ))}
                {user.permissions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.permissions.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const RoleCard = ({ role }: { role: typeof roleDefinitions[0] }) => {
    const RoleIcon = role.icon
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{role.name}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
              <Badge className={role.color}>
                Level {role.level}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Active Users:</span>
                <p className="text-2xl font-bold">{role.userCount}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Permissions:</span>
                <p className="text-2xl font-bold">{role.permissions.length}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Key Permissions:</span>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission.replace('_', ' ')}
                  </Badge>
                ))}
                {role.permissions.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{role.permissions.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit Role
              </Button>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User & Role Management</h2>
          <p className="text-muted-foreground">Manage users, roles, and permissions across the system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowNewRoleDialog(true)}>
            <Shield className="w-4 h-4 mr-2" />
            New Role
          </Button>
          <Button onClick={() => setShowNewUserDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{mockUsers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold">{mockUsers.filter(u => u.status === 'active').length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Roles</p>
                <p className="text-3xl font-bold">{roleDefinitions.length}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                <p className="text-3xl font-bold">{availablePermissions.reduce((acc, cat) => acc + cat.permissions.length, 0)}</p>
              </div>
              <Key className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roleDefinitions.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleDefinitions.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <div className="space-y-6">
            {availablePermissions.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                  <CardDescription>{category.permissions.length} permissions available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.permissions.map((permission) => (
                      <div key={permission.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{permission.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {permission.id}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with appropriate role and permissions</DialogDescription>
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
                    {roleDefinitions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="claims">Claims</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowNewUserDialog(false)}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default withErrorBoundary(UserRoleManagement)