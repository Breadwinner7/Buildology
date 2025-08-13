// lib/permissions.ts - Comprehensive UK Insurance Permissions System
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
export const UK_INSURANCE_PERMISSIONS = {
  // System Administration
  SYSTEM_ADMIN: 'system.admin',
  DATA_EXPORT_ALL: 'data.export_all',
  AUDIT_VIEW_ALL: 'audit.view_all',
  
  // Claims Management
  CLAIMS_VIEW_ALL_ORG: 'claims.view_all_organisation',
  CLAIMS_VIEW_TEAM: 'claims.view_team',
  CLAIMS_VIEW_ASSIGNED: 'claims.view_assigned',
  CLAIMS_VIEW_OWN: 'claims.view_own',
  CLAIMS_CREATE: 'claims.create',
  CLAIMS_EDIT_ASSIGNED: 'claims.edit_assigned',
  CLAIMS_COMPLEX_TECHNICAL: 'claims.complex_technical',
  
  // Financial Authorisations
  PAYMENTS_AUTHORISE_UNLIMITED: 'payments.authorise_unlimited',
  PAYMENTS_AUTHORISE_UP_TO_LIMIT: 'payments.authorise_up_to_limit',
  PAYMENTS_AUTHORISE_STANDARD: 'payments.authorise_standard',
  
  // Professional Services
  SURVEYS_BUILDING: 'surveys.building',
  SURVEYS_STRUCTURAL: 'surveys.structural',
  VALUATIONS_REINSTATEMENT: 'valuations.reinstatement',
  REPORTS_TECHNICAL: 'reports.technical',
  REPORTS_STRUCTURAL: 'reports.structural',
  REPORTS_ADJUSTMENT: 'reports.adjustment',
  
  // Contractor Activities
  WORK_UNDERTAKE_APPROVED: 'work.undertake_approved',
  QUOTES_SUBMIT: 'quotes.submit',
  PROGRESS_REPORT: 'progress.report',
  EMERGENCY_RESPOND: 'emergency.respond',
  EMERGENCY_MAKE_SAFE: 'emergency.make_safe',
  
  // Specialist Investigations
  FRAUD_INVESTIGATE: 'fraud.investigate',
  SURVEILLANCE_AUTHORISE: 'surveillance.authorise',
  
  // Legal and Litigation
  LITIGATION_MANAGE: 'litigation.manage',
  LEGAL_INSTRUCT_SOLICITORS: 'legal.instruct_solicitors',
  SETTLEMENTS_NEGOTIATE: 'settlements.negotiate',
  SETTLEMENTS_COURT_APPROVED: 'settlements.court_approved',
  
  // Communications
  COMMUNICATIONS_MANAGE: 'communications.manage',
  COMMUNICATIONS_INTERNAL: 'communications.internal',
  COMMUNICATIONS_SEND: 'communications.send',
  
  // Document Management
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_UPLOAD_EVIDENCE: 'documents.upload_evidence',
  
  // Policyholder Rights
  CLAIM_VIEW_OWN: 'claim.view_own',
  APPOINTMENTS_SCHEDULE: 'appointments.schedule',
  PREFERENCES_CONTRACTOR: 'preferences.contractor'
} as const;

export type UKInsurancePermission = typeof UK_INSURANCE_PERMISSIONS[keyof typeof UK_INSURANCE_PERMISSIONS];

// UK Insurance Industry Role Categories
export const UK_ROLE_CATEGORIES = {
  INSURER_STAFF: [
    'super_admin', 'underwriting_manager', 'claims_director', 'claims_manager',
    'senior_claims_handler', 'claims_handler', 'graduate_claims_handler',
    'technical_claims_specialist', 'fraud_investigator', 'litigation_manager',
    'customer_service', 'finance_controller', 'accounts_payable'
  ],
  
  PROFESSIONAL_SERVICES: [
    'chartered_surveyor', 'building_surveyor', 'quantity_surveyor',
    'structural_engineer', 'loss_adjuster', 'loss_assessor',
    'forensic_accountant', 'solicitor', 'barrister', 'expert_witness',
    'cause_and_origin_investigator'
  ],
  
  CONTRACTORS: [
    'principal_contractor', 'approved_contractor', 'emergency_contractor',
    'specialist_contractor', 'restoration_technician', 'drying_technician',
    'asbestos_contractor', 'hazardous_materials_contractor', 'scaffolding_contractor',
    'glazier', 'roofer', 'plumber', 'electrician', 'plasterer', 'decorator',
    'flooring_contractor', 'kitchen_fitter', 'bathroom_fitter'
  ],
  
  SUPPLY_CHAIN: [
    'materials_supplier', 'plant_hire', 'waste_management',
    'temporary_accommodation_provider'
  ],
  
  POLICYHOLDERS: [
    'policyholder', 'additional_insured', 'tenant', 'leaseholder',
    'freeholder', 'property_manager', 'facilities_manager',
    'company_director', 'company_employee', 'homeowner', 'landlord'
  ]
} as const;

export function getUserCategory(role: string): keyof typeof UK_ROLE_CATEGORIES {
  for (const [category, roles] of Object.entries(UK_ROLE_CATEGORIES)) {
    if (roles.includes(role as any)) {
      return category as keyof typeof UK_ROLE_CATEGORIES;
    }
  }
  return 'POLICYHOLDERS'; // Default fallback
}

export function getRoleDisplayInfo(role: string) {
  const roleInfo: Record<string, { display: string; description: string; category: string }> = {
    super_admin: {
      display: 'System Administrator',
      description: 'Full system administration access',
      category: 'System'
    },
    claims_director: {
      display: 'Claims Director',
      description: 'Senior claims leadership and oversight',
      category: 'Senior Management'
    },
    claims_manager: {
      display: 'Claims Manager',
      description: 'Claims team management and supervision',
      category: 'Management'
    },
    senior_claims_handler: {
      display: 'Senior Claims Handler',
      description: 'Experienced claims handling with settlement authority',
      category: 'Claims Team'
    },
    claims_handler: {
      display: 'Claims Handler',
      description: 'Day-to-day claims management and customer service',
      category: 'Claims Team'
    },
    chartered_surveyor: {
      display: 'Chartered Surveyor',
      description: 'RICS qualified building surveyor',
      category: 'Professional Services'
    },
    structural_engineer: {
      display: 'Structural Engineer',
      description: 'Chartered structural engineer',
      category: 'Professional Services'
    },
    loss_adjuster: {
      display: 'Loss Adjuster',
      description: 'Independent claims investigation specialist',
      category: 'Professional Services'
    },
    principal_contractor: {
      display: 'Principal Contractor',
      description: 'Main contractor with CDM responsibilities',
      category: 'Construction'
    },
    emergency_contractor: {
      display: 'Emergency Contractor',
      description: '24/7 emergency response contractor',
      category: 'Construction'
    },
    policyholder: {
      display: 'Policyholder',
      description: 'Named insured on insurance policy',
      category: 'Client'
    }
  };
  
  return roleInfo[role] || {
    display: role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Insurance industry role',
    category: 'Other'
  };
}

// Enhanced permissions hook for UK insurance
export function useUKInsurancePermissions() {
  const [userPermissions, setUserPermissions] = useState<UKInsurancePermission[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userCategory, setUserCategory] = useState<keyof typeof UK_ROLE_CATEGORIES>('POLICYHOLDERS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get comprehensive user profile with permissions
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select(`
            *,
            organisation:organisations(*),
            role_permissions!inner(permission)
          `)
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          return;
        }

        setUserProfile(profile);
        setUserCategory(getUserCategory(profile.role));
        setUserPermissions(profile.role_permissions.map((rp: any) => rp.permission));
        
        console.log('🔐 User permissions loaded:', {
          role: profile.role,
          category: getUserCategory(profile.role),
          permissionCount: profile.role_permissions.length
        });

      } catch (error) {
        console.error('Error in fetchUserPermissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  // Permission checking functions
  const hasPermission = (permission: UKInsurancePermission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: UKInsurancePermission[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  // Role-based capability checks
  const canViewAllClaims = (): boolean => {
    return hasAnyPermission([
      UK_INSURANCE_PERMISSIONS.CLAIMS_VIEW_ALL_ORG,
      UK_INSURANCE_PERMISSIONS.SYSTEM_ADMIN
    ]);
  };

  const canCreateClaims = (): boolean => {
    return hasPermission(UK_INSURANCE_PERMISSIONS.CLAIMS_CREATE);
  };

  const canAuthorisePayments = (): boolean => {
    return hasAnyPermission([
      UK_INSURANCE_PERMISSIONS.PAYMENTS_AUTHORISE_UNLIMITED,
      UK_INSURANCE_PERMISSIONS.PAYMENTS_AUTHORISE_UP_TO_LIMIT,
      UK_INSURANCE_PERMISSIONS.PAYMENTS_AUTHORISE_STANDARD
    ]);
  };

  const canInstructContractors = (): boolean => {
    return userProfile?.can_instruct_contractors || false;
  };

  const canSettleClaims = (): boolean => {
    return userProfile?.can_settle_claims || false;
  };

  const canAccessSensitiveData = (): boolean => {
    return userProfile?.can_access_sensitive_data || false;
  };

  // UI behaviour helpers
  const getClaimsListQuery = () => {
    const category = getUserCategory(userProfile?.role || '');
    
    if (category === 'INSURER_STAFF') {
      if (userProfile?.role === 'super_admin') {
        return { scope: 'all', filter: null };
      } else if (hasPermission(UK_INSURANCE_PERMISSIONS.CLAIMS_VIEW_ALL_ORG)) {
        return { scope: 'organisation', filter: userProfile?.organisation_id };
      } else if (hasPermission(UK_INSURANCE_PERMISSIONS.CLAIMS_VIEW_TEAM)) {
        return { scope: 'team', filter: userProfile?.id };
      } else {
        return { scope: 'assigned', filter: userProfile?.id };
      }
    } else if (category === 'PROFESSIONAL_SERVICES' || category === 'CONTRACTORS' || category === 'SUPPLY_CHAIN') {
      return { scope: 'assigned', filter: userProfile?.id };
    } else {
      return { scope: 'own', filter: userProfile?.id };
    }
  };

  const getNavigationItems = () => {
    const category = getUserCategory(userProfile?.role || '');
    
    const baseItems = [
      { href: '/dashboard', label: 'Dashboard', icon: 'Home' }
    ];

    // Claims/Projects access
    if (category === 'INSURER_STAFF' || category === 'PROFESSIONAL_SERVICES') {
      baseItems.push({ href: '/claims', label: 'Claims', icon: 'FileText' });
    } else if (category === 'CONTRACTORS' || category === 'SUPPLY_CHAIN') {
      baseItems.push({ href: '/projects', label: 'Projects', icon: 'Briefcase' });
    } else {
      baseItems.push({ href: '/my-claim', label: 'My Claim', icon: 'FileText' });
    }

    // Additional navigation based on permissions
    if (hasPermission(UK_INSURANCE_PERMISSIONS.SYSTEM_ADMIN)) {
      baseItems.push(
        { href: '/admin/users', label: 'Users', icon: 'Users' },
        { href: '/admin/organisations', label: 'Organisations', icon: 'Building' },
        { href: '/admin/reports', label: 'Reports', icon: 'BarChart' }
      );
    }

    if (canAuthorisePayments()) {
      baseItems.push({ href: '/payments', label: 'Payments', icon: 'CreditCard' });
    }

    if (category === 'CONTRACTORS' || category === 'SUPPLY_CHAIN') {
      baseItems.push(
        { href: '/quotes', label: 'Quotes', icon: 'Calculator' },
        { href: '/schedules', label: 'Schedule', icon: 'Calendar' }
      );
    }

    return baseItems;
  };

  return {
    userProfile,
    userCategory,
    userPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    canViewAllClaims,
    canCreateClaims,
    canAuthorisePayments,
    canInstructContractors,
    canSettleClaims,
    canAccessSensitiveData,
    getClaimsListQuery,
    getNavigationItems,
    
    // Category checks
    isInsurerStaff: userCategory === 'INSURER_STAFF',
    isProfessionalService: userCategory === 'PROFESSIONAL_SERVICES',
    isContractor: userCategory === 'CONTRACTORS',
    isSupplyChain: userCategory === 'SUPPLY_CHAIN',
    isPolicyholder: userCategory === 'POLICYHOLDERS'
  };
}

// Enhanced Projects/Claims page useEffect with sophisticated filtering
// Removed due to template literal compilation errors
export const enhancedClaimsPageUseEffect = null; /*
useEffect(() => {
  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Please log in to view claims');
        setLoading(false);
        return;
      }

      // Get user profile with permissions
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select(\`
          *,
          organisation:organisations(*),
          role_permissions!inner(permission)
        \`)
        .eq('email', user.email)
        .single();

      if (profileError) {
        setError('Profile not found: ' + profileError.message);
        setLoading(false);
        return;
      }

      setCurrentUser(userProfile);
      const category = getUserCategory(userProfile.role);
      const permissions = userProfile.role_permissions.map(rp => rp.permission);
      setUserCategory(category);
      setUserPermissions(permissions);

      console.log('👤 User loaded:', {
        name: `${userProfile.first_name} ${userProfile.surname}`,
        role: userProfile.role,
        category: category,
        organisation: userProfile.organisation?.name,
        permissionCount: permissions.length
      });

      // Build claims query based on user's role and permissions
      let claimsQuery = supabase
        .from('projects')
        .select(`
          *,
          organisation:organisations(name, type),
          primary_handler:user_profiles!primary_handler_id(first_name, surname, email),
          project_members!inner(role_on_claim, user_id)
        `);

      // Apply filtering based on user category and permissions
      if (category === 'INSURER_STAFF') {
        if (userProfile.role === 'super_admin') {
          // Super admin sees everything - no filter
          console.log('🌟 Super admin access - viewing all claims');
        } else if (permissions.includes('claims.view_all_organisation')) {
          // Organisation-wide access
          claimsQuery = claimsQuery.eq('organisation_id', userProfile.organisation_id);
          console.log('🏢 Organisation access - viewing org claims');
        } else if (permissions.includes('claims.view_team')) {
          // Team access (claims managed by this user or their team)
          claimsQuery = claimsQuery.or(\`primary_handler_id.eq.\${userProfile.id},supervising_manager_id.eq.\${userProfile.id}\`);
          console.log('👥 Team access - viewing team claims');
        } else {
          // Individual access only
          claimsQuery = claimsQuery.eq('project_members.user_id', userProfile.id);
          console.log('👤 Individual access - viewing assigned claims');
        }
      } else if (category === 'PROFESSIONAL_SERVICES' || category === 'CONTRACTORS' || category === 'SUPPLY_CHAIN') {
        // External parties only see claims they're instructed on
        claimsQuery = claimsQuery
          .eq('project_members.user_id', userProfile.id)
          .eq('project_members.instruction_status', 'active');
        console.log('🔧 External access - viewing instructed claims');
      } else if (category === 'POLICYHOLDERS') {
        // Policyholders only see their own claims
        claimsQuery = claimsQuery
          .eq('project_members.user_id', userProfile.id)
          .in('project_members.role_on_claim', ['policyholder', 'additional_insured', 'tenant']);
        console.log('🏠 Policyholder access - viewing own claims');
      }

      const { data: claimsData, error: claimsError } = await claimsQuery
        .order('created_at', { ascending: false })
        .limit(100);

      if (claimsError) {
        console.error('❌ Error fetching claims:', claimsError);
        setError('Failed to load claims: ' + claimsError.message);
      } else {
        console.log('✅ Claims loaded:', {
          count: claimsData?.length || 0,
          userRole: userProfile.role,
          userCategory: category
        });
        setProjects(claimsData || []);
      }

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      setError('Unexpected error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  fetchClaims();
}, []);
*/

// Sophisticated UI component for role-based navigation
export const RoleBasedNavigation = ({ userProfile, userCategory, permissions }: any) => {
  const navigationConfig = {
    INSURER_STAFF: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', always: true },
      { href: '/claims', label: 'Claims Portfolio', icon: 'FileText', always: true },
      { href: '/tasks', label: 'My Tasks', icon: 'CheckSquare', always: true },
      { href: '/calendar', label: 'Calendar', icon: 'Calendar', always: true },
      { 
        href: '/payments', 
        label: 'Payments', 
        icon: 'CreditCard', 
        permission: 'payments.authorise_standard',
        roles: ['claims_handler', 'senior_claims_handler', 'claims_manager', 'claims_director']
      },
      { 
        href: '/reports', 
        label: 'Reports', 
        icon: 'BarChart3', 
        permission: 'reports.management_dashboard',
        roles: ['claims_manager', 'claims_director', 'super_admin']
      },
      { 
        href: '/fraud', 
        label: 'Fraud Cases', 
        icon: 'Shield', 
        permission: 'fraud.investigate',
        roles: ['fraud_investigator', 'technical_claims_specialist']
      },
      { 
        href: '/litigation', 
        label: 'Litigation', 
        icon: 'Scale', 
        permission: 'litigation.manage',
        roles: ['litigation_manager', 'claims_director']
      },
      { 
        href: '/admin', 
        label: 'Administration', 
        icon: 'Settings', 
        permission: 'system.admin',
        roles: ['super_admin']
      }
    ],
    
    PROFESSIONAL_SERVICES: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', always: true },
      { href: '/instructions', label: 'My Instructions', icon: 'FileText', always: true },
      { href: '/reports', label: 'Reports & Surveys', icon: 'FileSearch', always: true },
      { href: '/calendar', label: 'Appointments', icon: 'Calendar', always: true },
      { 
        href: '/invoicing', 
        label: 'Invoicing', 
        icon: 'Receipt', 
        always: true
      },
      { 
        href: '/cpd', 
        label: 'CPD Records', 
        icon: 'GraduationCap', 
        always: true
      }
    ],
    
    CONTRACTORS: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', always: true },
      { href: '/projects', label: 'Active Projects', icon: 'Hammer', always: true },
      { href: '/quotes', label: 'Quotations', icon: 'Calculator', always: true },
      { href: '/schedule', label: 'Work Schedule', icon: 'Calendar', always: true },
      { href: '/materials', label: 'Materials', icon: 'Package', always: true },
      { 
        href: '/emergency', 
        label: 'Emergency Response', 
        icon: 'Siren', 
        roles: ['emergency_contractor']
      },
      { 
        href: '/health-safety', 
        label: 'Health & Safety', 
        icon: 'HardHat', 
        roles: ['principal_contractor']
      }
    ],
    
    SUPPLY_CHAIN: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', always: true },
      { href: '/orders', label: 'Orders', icon: 'ShoppingCart', always: true },
      { href: '/deliveries', label: 'Deliveries', icon: 'Truck', always: true },
      { href: '/invoicing', label: 'Invoicing', icon: 'Receipt', always: true },
      { href: '/inventory', label: 'Inventory', icon: 'Package', always: true }
    ],
    
    POLICYHOLDERS: [
      { href: '/my-claim', label: 'My Claim', icon: 'FileText', always: true },
      { href: '/timeline', label: 'Claim Timeline', icon: 'Clock', always: true },
      { href: '/documents', label: 'Documents', icon: 'Folder', always: true },
      { href: '/communications', label: 'Messages', icon: 'MessageSquare', always: true },
      { href: '/appointments', label: 'Appointments', icon: 'Calendar', always: true },
      { 
        href: '/property-portfolio', 
        label: 'Property Portfolio', 
        icon: 'Building', 
        roles: ['property_manager', 'landlord']
      }
    ]
  };

  const getVisibleNavItems = () => {
    const categoryItems = navigationConfig[userCategory] || [];
    
    return categoryItems.filter(item => {
      // Always show items marked as 'always'
      if (item.always) return true;
      
      // Check role-based access
      if (item.roles && !item.roles.includes(userProfile?.role)) return false;
      
      // Check permission-based access
      if (item.permission && !permissions.includes(item.permission)) return false;
      
      return true;
    });
  };

  return getVisibleNavItems();
};

// Enhanced user profile display component
export const UserProfileDisplay = ({ userProfile }: any) => {
  const roleInfo = getRoleDisplayInfo(userProfile?.role || '');
  const category = getUserCategory(userProfile?.role || '');
  
  return {
    displayName: `${userProfile?.title || ''} ${userProfile?.first_name || ''} ${userProfile?.surname || ''}`.trim(),
    roleDisplay: roleInfo.display,
    roleDescription: roleInfo.description,
    category: roleInfo.category,
    organisation: userProfile?.organisation?.name,
    professionalMemberships: userProfile?.professional_memberships || [],
    canAuthorisePayments: userProfile?.can_authorise_payments,
    paymentLimit: userProfile?.payment_authorisation_limit,
    canInstructContractors: userProfile?.can_instruct_contractors,
    canSettleClaims: userProfile?.can_settle_claims,
    settlementLimit: userProfile?.settlement_authority_limit,
    regionsCovered: userProfile?.regions_covered || [],
    specialisms: userProfile?.specialisms || []
  };
};

// Test code removed - was causing TypeScript compilation errors

// Export empty object to make this a valid module
export {};