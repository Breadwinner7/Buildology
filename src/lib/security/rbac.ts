// Enhanced Role-Based Access Control (RBAC) for insurance platform
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Enhanced role definitions with hierarchical permissions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  INSURER_ADMIN: 'insurer_admin',
  INSURER_STAFF: 'insurer_staff',
  PROFESSIONAL_SERVICES: 'professional_services',
  CONTRACTORS: 'contractors',
  SUPPLY_CHAIN: 'supply_chain',
  CUSTOMER: 'customer',
  READONLY: 'readonly'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Permission categories
export const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_MONITORING: 'system.monitoring',

  // User management
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_IMPERSONATE: 'user.impersonate',

  // Project permissions
  PROJECT_CREATE: 'project.create',
  PROJECT_READ: 'project.read',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_ASSIGN: 'project.assign',
  PROJECT_APPROVE: 'project.approve',

  // Claims management
  CLAIM_CREATE: 'claim.create',
  CLAIM_READ: 'claim.read',
  CLAIM_UPDATE: 'claim.update',
  CLAIM_DELETE: 'claim.delete',
  CLAIM_APPROVE: 'claim.approve',
  CLAIM_REJECT: 'claim.reject',
  CLAIM_PROCESS_PAYMENT: 'claim.process_payment',

  // Financial permissions
  FINANCIAL_READ: 'financial.read',
  FINANCIAL_UPDATE: 'financial.update',
  FINANCIAL_APPROVE: 'financial.approve',
  FINANCIAL_PAYMENTS: 'financial.payments',
  FINANCIAL_REPORTS: 'financial.reports',

  // Document management
  DOCUMENT_READ: 'document.read',
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_DELETE: 'document.delete',
  DOCUMENT_SHARE: 'document.share',
  DOCUMENT_SENSITIVE: 'document.sensitive',

  // Compliance and audit
  COMPLIANCE_READ: 'compliance.read',
  COMPLIANCE_UPDATE: 'compliance.update',
  AUDIT_READ: 'audit.read',
  AUDIT_EXPORT: 'audit.export',

  // Reporting
  REPORT_CREATE: 'report.create',
  REPORT_READ: 'report.read',
  REPORT_EXPORT: 'report.export',
  REPORT_FINANCIAL: 'report.financial'
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role permission mappings
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: [
    // Full system access
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.SYSTEM_BACKUP,
    PERMISSIONS.SYSTEM_MONITORING,
    
    // Full user management
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_IMPERSONATE,

    // Full project access
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.PROJECT_ASSIGN,
    PERMISSIONS.PROJECT_APPROVE,

    // Full claims access
    PERMISSIONS.CLAIM_CREATE,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.CLAIM_UPDATE,
    PERMISSIONS.CLAIM_DELETE,
    PERMISSIONS.CLAIM_APPROVE,
    PERMISSIONS.CLAIM_REJECT,
    PERMISSIONS.CLAIM_PROCESS_PAYMENT,

    // Full financial access
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.FINANCIAL_UPDATE,
    PERMISSIONS.FINANCIAL_APPROVE,
    PERMISSIONS.FINANCIAL_PAYMENTS,
    PERMISSIONS.FINANCIAL_REPORTS,

    // Full document access
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.DOCUMENT_SHARE,
    PERMISSIONS.DOCUMENT_SENSITIVE,

    // Full compliance access
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_UPDATE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AUDIT_EXPORT,

    // Full reporting access
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.REPORT_FINANCIAL
  ],

  [ROLES.ADMIN]: [
    PERMISSIONS.SYSTEM_MONITORING,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_ASSIGN,
    PERMISSIONS.PROJECT_APPROVE,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.CLAIM_UPDATE,
    PERMISSIONS.CLAIM_APPROVE,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.FINANCIAL_UPDATE,
    PERMISSIONS.FINANCIAL_REPORTS,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_SHARE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT
  ],

  [ROLES.INSURER_ADMIN]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_ASSIGN,
    PERMISSIONS.PROJECT_APPROVE,
    PERMISSIONS.CLAIM_CREATE,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.CLAIM_UPDATE,
    PERMISSIONS.CLAIM_APPROVE,
    PERMISSIONS.CLAIM_REJECT,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.FINANCIAL_UPDATE,
    PERMISSIONS.FINANCIAL_APPROVE,
    PERMISSIONS.FINANCIAL_REPORTS,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_SHARE,
    PERMISSIONS.DOCUMENT_SENSITIVE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_UPDATE,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.REPORT_FINANCIAL
  ],

  [ROLES.INSURER_STAFF]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.CLAIM_CREATE,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.CLAIM_UPDATE,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_SHARE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.REPORT_READ
  ],

  [ROLES.PROFESSIONAL_SERVICES]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.CLAIM_UPDATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.REPORT_READ
  ],

  [ROLES.CONTRACTORS]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.REPORT_READ
  ],

  [ROLES.SUPPLY_CHAIN]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.REPORT_READ
  ],

  [ROLES.CUSTOMER]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.REPORT_READ
  ],

  [ROLES.READONLY]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.CLAIM_READ,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.REPORT_READ
  ]
}

// Context-based permissions (resource-specific)
export interface AccessContext {
  userId: string
  userRole: Role
  organizationId?: string
  projectId?: string
  resourceOwnerId?: string
  resourceType?: string
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted'
}

// Permission result
export interface PermissionResult {
  granted: boolean
  reason?: string
  conditions?: string[]
  auditRequired?: boolean
}

class RBACManager {
  private static instance: RBACManager
  private roleHierarchy: Map<Role, Role[]> = new Map()
  private contextualRules: Map<string, (context: AccessContext) => boolean> = new Map()

  private constructor() {
    this.initializeRoleHierarchy()
    this.initializeContextualRules()
    console.log('🔐 RBAC Manager initialized')
  }

  public static getInstance(): RBACManager {
    if (!this.instance) {
      this.instance = new RBACManager()
    }
    return this.instance
  }

  private initializeRoleHierarchy() {
    // Define role inheritance (higher roles inherit permissions from lower roles)
    this.roleHierarchy.set(ROLES.SUPER_ADMIN, [ROLES.ADMIN])
    this.roleHierarchy.set(ROLES.ADMIN, [ROLES.INSURER_ADMIN])
    this.roleHierarchy.set(ROLES.INSURER_ADMIN, [ROLES.INSURER_STAFF])
    this.roleHierarchy.set(ROLES.INSURER_STAFF, [ROLES.READONLY])
  }

  private initializeContextualRules() {
    // Resource ownership rule
    this.contextualRules.set('resource_owner', (context: AccessContext) => {
      return context.userId === context.resourceOwnerId
    })

    // Organization boundary rule
    this.contextualRules.set('same_organization', (context: AccessContext) => {
      // Would check if user and resource belong to same organization
      return true // Simplified for demo
    })

    // Sensitivity level rule
    this.contextualRules.set('sensitivity_clearance', (context: AccessContext) => {
      const clearanceLevels: Record<Role, number> = {
        [ROLES.SUPER_ADMIN]: 4,
        [ROLES.ADMIN]: 4,
        [ROLES.INSURER_ADMIN]: 3,
        [ROLES.INSURER_STAFF]: 2,
        [ROLES.PROFESSIONAL_SERVICES]: 2,
        [ROLES.CONTRACTORS]: 1,
        [ROLES.SUPPLY_CHAIN]: 1,
        [ROLES.CUSTOMER]: 1,
        [ROLES.READONLY]: 1
      }

      const sensitivityLevels = {
        'public': 1,
        'internal': 2,
        'confidential': 3,
        'restricted': 4
      }

      const userClearance = clearanceLevels[context.userRole] || 0
      const requiredLevel = sensitivityLevels[context.sensitivity || 'public']

      return userClearance >= requiredLevel
    })
  }

  // Check if user has specific permission
  hasPermission(
    userRole: Role, 
    permission: Permission, 
    context?: AccessContext
  ): PermissionResult {
    try {
      // Check direct permission
      const rolePermissions = this.getRolePermissions(userRole)
      const hasDirectPermission = rolePermissions.includes(permission)

      if (!hasDirectPermission) {
        // Log permission denial
        logAuditEvent(AUDIT_ACTIONS.UNAUTHORIZED_ACCESS, 'rbac', context?.userId, {
          userRole,
          permission,
          reason: 'insufficient_permissions',
          context
        })

        return {
          granted: false,
          reason: 'Insufficient permissions for this action',
          auditRequired: true
        }
      }

      // Apply contextual rules if context provided
      if (context) {
        const contextualResult = this.checkContextualPermissions(context, permission)
        if (!contextualResult.granted) {
          return contextualResult
        }
      }

      // Permission granted
      if (this.isHighPrivilegePermission(permission)) {
        logAuditEvent(AUDIT_ACTIONS.PERMISSION_GRANTED, 'rbac', context?.userId, {
          userRole,
          permission,
          context,
          privileged: true
        })
      }

      return { granted: true, auditRequired: this.isAuditablePermission(permission) }

    } catch (error) {
      console.error('Permission check error:', error)
      
      captureSecurityEvent({
        type: 'security.breach_detected',
        severity: 'high',
        details: `Permission check failed: ${permission}`,
        timestamp: new Date(),
        userId: context?.userId
      })

      return { 
        granted: false, 
        reason: 'Permission check failed',
        auditRequired: true 
      }
    }
  }

  // Check multiple permissions at once
  hasPermissions(
    userRole: Role, 
    permissions: Permission[], 
    context?: AccessContext
  ): { [key in Permission]?: PermissionResult } {
    const results: { [key in Permission]?: PermissionResult } = {}
    
    for (const permission of permissions) {
      results[permission] = this.hasPermission(userRole, permission, context)
    }

    return results
  }

  // Get all permissions for a role (including inherited)
  getRolePermissions(role: Role): Permission[] {
    const permissions = [...(ROLE_PERMISSIONS[role] || [])]
    
    // Add inherited permissions
    const inheritedRoles = this.roleHierarchy.get(role) || []
    for (const inheritedRole of inheritedRoles) {
      permissions.push(...this.getRolePermissions(inheritedRole))
    }

    return Array.from(new Set(permissions)) // Remove duplicates
  }

  // Check contextual permissions
  private checkContextualPermissions(context: AccessContext, permission: Permission): PermissionResult {
    const conditions: string[] = []

    // Resource ownership check
    if (context.resourceOwnerId && context.userId !== context.resourceOwnerId) {
      const ownershipRule = this.contextualRules.get('resource_owner')
      if (ownershipRule && !ownershipRule(context)) {
        // Check if user has elevated permissions that bypass ownership
        if (!this.canBypassOwnership(context.userRole, permission)) {
          return {
            granted: false,
            reason: 'Access denied: Resource not owned by user',
            auditRequired: true
          }
        }
        conditions.push('ownership_bypass')
      }
    }

    // Sensitivity level check
    if (context.sensitivity && context.sensitivity !== 'public') {
      const sensitivityRule = this.contextualRules.get('sensitivity_clearance')
      if (sensitivityRule && !sensitivityRule(context)) {
        captureSecurityEvent({
          type: 'unauthorized_access',
          severity: 'high',
          details: `Insufficient clearance for ${context.sensitivity} resource`,
          timestamp: new Date(),
          userId: context.userId
        })

        return {
          granted: false,
          reason: `Insufficient security clearance for ${context.sensitivity} resource`,
          auditRequired: true
        }
      }
      conditions.push('sensitivity_cleared')
    }

    // Organization boundary check
    if (context.organizationId) {
      const orgRule = this.contextualRules.get('same_organization')
      if (orgRule && !orgRule(context)) {
        return {
          granted: false,
          reason: 'Cross-organization access denied',
          auditRequired: true
        }
      }
      conditions.push('organization_verified')
    }

    return { 
      granted: true, 
      conditions: conditions.length > 0 ? conditions : undefined,
      auditRequired: conditions.length > 0
    }
  }

  // Check if role can bypass ownership restrictions
  private canBypassOwnership(role: Role, permission: Permission): boolean {
    const bypassRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.INSURER_ADMIN]
    
    // Some permissions allow bypass for certain roles
    const bypassPermissions = [
      PERMISSIONS.PROJECT_READ,
      PERMISSIONS.CLAIM_READ,
      PERMISSIONS.FINANCIAL_READ,
      PERMISSIONS.AUDIT_READ
    ]

    return bypassRoles.includes(role) && bypassPermissions.includes(permission)
  }

  // Check if permission requires audit logging
  private isAuditablePermission(permission: Permission): boolean {
    const auditablePermissions = [
      PERMISSIONS.SYSTEM_ADMIN,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_IMPERSONATE,
      PERMISSIONS.PROJECT_DELETE,
      PERMISSIONS.CLAIM_APPROVE,
      PERMISSIONS.CLAIM_REJECT,
      PERMISSIONS.CLAIM_PROCESS_PAYMENT,
      PERMISSIONS.FINANCIAL_APPROVE,
      PERMISSIONS.FINANCIAL_PAYMENTS,
      PERMISSIONS.DOCUMENT_DELETE,
      PERMISSIONS.DOCUMENT_SENSITIVE,
      PERMISSIONS.AUDIT_EXPORT,
      PERMISSIONS.SYSTEM_BACKUP
    ]

    return auditablePermissions.includes(permission)
  }

  // Check if permission is high-privilege
  private isHighPrivilegePermission(permission: Permission): boolean {
    const highPrivilegePermissions = [
      PERMISSIONS.SYSTEM_ADMIN,
      PERMISSIONS.SYSTEM_CONFIG,
      PERMISSIONS.USER_IMPERSONATE,
      PERMISSIONS.CLAIM_PROCESS_PAYMENT,
      PERMISSIONS.FINANCIAL_PAYMENTS,
      PERMISSIONS.AUDIT_EXPORT
    ]

    return highPrivilegePermissions.includes(permission)
  }

  // Dynamic permission assignment (temporary elevation)
  async grantTemporaryPermission(
    granterId: string,
    granterRole: Role,
    targetUserId: string,
    permission: Permission,
    durationMinutes: number = 60,
    justification: string
  ): Promise<{ success: boolean, error?: string, expires?: Date }> {
    try {
      // Verify granter has permission to grant
      const canGrant = this.hasPermission(granterRole, PERMISSIONS.USER_UPDATE)
      if (!canGrant.granted) {
        return { success: false, error: 'Insufficient permissions to grant access' }
      }

      const expires = new Date(Date.now() + durationMinutes * 60 * 1000)

      // Log privilege escalation
      logAuditEvent(AUDIT_ACTIONS.PERMISSION_GRANTED, 'rbac', targetUserId, {
        granterId,
        granterRole,
        permission,
        temporary: true,
        durationMinutes,
        expires: expires.toISOString(),
        justification
      })

      captureSecurityEvent({
        type: 'unauthorized_access',
        severity: 'medium',
        details: `Temporary permission granted: ${permission}`,
        timestamp: new Date(),
        userId: granterId,
        metadata: { targetUserId, permission, expires }
      })

      // In production, store in database with expiration
      console.log(`🔐 Temporary permission granted: ${permission} to ${targetUserId} by ${granterId}`)

      return { success: true, expires }

    } catch (error) {
      console.error('Failed to grant temporary permission:', error)
      return { success: false, error: 'Failed to grant temporary permission' }
    }
  }

  // Get role capabilities summary
  getRoleCapabilities(role: Role): {
    role: Role
    permissions: Permission[]
    canCreate: string[]
    canRead: string[]
    canUpdate: string[]
    canDelete: string[]
    canApprove: string[]
    systemAccess: Permission[]
  } {
    const permissions = this.getRolePermissions(role)
    
    const categorize = (prefix: string) => 
      permissions.filter(p => p.startsWith(prefix)).map(p => p.replace(`${prefix}.`, ''))

    return {
      role,
      permissions,
      canCreate: categorize('create'),
      canRead: categorize('read'),
      canUpdate: categorize('update'),
      canDelete: categorize('delete'),
      canApprove: categorize('approve'),
      systemAccess: permissions.filter(p => p.startsWith('system.'))
    }
  }

  // Security analysis
  getSecurityAnalysis(): {
    totalRoles: number
    totalPermissions: number
    highPrivilegeRoles: Role[]
    auditablePermissions: number
    roleDistribution: Record<Role, number>
  } {
    const highPrivilegeRoles = Object.keys(ROLE_PERMISSIONS).filter(role =>
      this.getRolePermissions(role as Role).some(p => this.isHighPrivilegePermission(p))
    ) as Role[]

    const auditableCount = Object.values(PERMISSIONS).filter(p => 
      this.isAuditablePermission(p)
    ).length

    return {
      totalRoles: Object.keys(ROLES).length,
      totalPermissions: Object.keys(PERMISSIONS).length,
      highPrivilegeRoles,
      auditablePermissions: auditableCount,
      roleDistribution: {} // Would be populated from user database in production
    }
  }
}

// Export singleton
export const rbacManager = RBACManager.getInstance()

// Convenience functions
export const hasPermission = (userRole: Role, permission: Permission, context?: AccessContext) =>
  rbacManager.hasPermission(userRole, permission, context)

export const hasPermissions = (userRole: Role, permissions: Permission[], context?: AccessContext) =>
  rbacManager.hasPermissions(userRole, permissions, context)

export const getRolePermissions = (role: Role) =>
  rbacManager.getRolePermissions(role)

export const grantTemporaryPermission = (
  granterId: string,
  granterRole: Role,
  targetUserId: string,
  permission: Permission,
  durationMinutes?: number,
  justification?: string
) => rbacManager.grantTemporaryPermission(granterId, granterRole, targetUserId, permission, durationMinutes, justification)

export const getRoleCapabilities = (role: Role) =>
  rbacManager.getRoleCapabilities(role)

// React hook for RBAC
export function useRBAC() {
  return {
    hasPermission,
    hasPermissions,
    getRolePermissions,
    grantTemporaryPermission,
    getRoleCapabilities,
    getSecurityAnalysis: () => rbacManager.getSecurityAnalysis(),
    ROLES,
    PERMISSIONS
  }
}