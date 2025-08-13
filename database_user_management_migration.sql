-- COMPREHENSIVE USER MANAGEMENT SYSTEM MIGRATION
-- This creates the complete organizational structure for the Buildology insurance platform
-- Run this script to implement organizations, companies, policyholders, and enhanced user management

BEGIN;

-- =====================================================
-- 1. CREATE ORGANIZATIONS/COMPANIES STRUCTURE
-- =====================================================

-- Companies/Organizations table (Insurance companies, contractors, service providers)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_type text NOT NULL CHECK (company_type IN ('insurance_company', 'contractor', 'service_provider', 'loss_adjuster', 'surveyor')),
  registration_number text,
  vat_number text,
  website text,
  phone text,
  email text,
  
  -- Address information
  address_line_1 text,
  address_line_2 text,
  city text,
  county text,
  postcode text,
  country text DEFAULT 'UK',
  
  -- Business details
  industry text,
  established_date date,
  employee_count integer,
  annual_revenue numeric,
  
  -- Insurance specific fields
  fca_registration text, -- Financial Conduct Authority for insurance companies
  insurance_license_number text,
  coverage_areas text[], -- Geographic areas covered
  specializations text[], -- Types of claims/work specialized in
  
  -- Status and compliance
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),
  compliance_status text DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'under_review', 'non_compliant')),
  last_compliance_check timestamp with time zone,
  
  -- Relationship fields
  parent_company_id uuid REFERENCES public.companies(id),
  partner_companies uuid[], -- Array of company IDs for partners
  
  -- Financial information
  credit_rating text,
  payment_terms integer DEFAULT 30, -- days
  preferred_payment_method text,
  
  -- Metadata
  logo_url text,
  documents jsonb DEFAULT '{}', -- Store URLs/metadata for company documents
  settings jsonb DEFAULT '{}', -- Company-specific settings
  notes text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- Company contacts table (multiple contacts per company)
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Contact details
  title text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  job_title text,
  department text,
  
  -- Contact information
  email text NOT NULL,
  phone text,
  mobile text,
  direct_line text,
  
  -- Contact type and status
  contact_type text NOT NULL CHECK (contact_type IN ('primary', 'billing', 'technical', 'emergency', 'general')),
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Communication preferences
  preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'post')),
  communication_preferences jsonb DEFAULT '{}',
  
  -- Metadata
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT company_contacts_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 2. ENHANCE USER PROFILES FOR ORGANIZATIONAL STRUCTURE
-- =====================================================

-- Add company affiliation to existing user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS employee_id text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS office_location text,
ADD COLUMN IF NOT EXISTS work_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS skills text[], -- Professional skills/certifications
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'standard' CHECK (access_level IN ('basic', 'standard', 'elevated', 'admin', 'super_admin')),
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_attempt timestamp with time zone,
ADD COLUMN IF NOT EXISTS user_preferences jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"email": true, "sms": false, "push": true}';

-- =====================================================
-- 3. CREATE POLICYHOLDERS/CUSTOMERS STRUCTURE
-- =====================================================

-- Policyholders table (customers who have insurance policies)
CREATE TABLE IF NOT EXISTS public.policyholders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Personal/Business Information
  type text NOT NULL CHECK (type IN ('individual', 'business', 'trust', 'estate')),
  
  -- For individuals
  title text,
  first_name text,
  middle_names text,
  last_name text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  occupation text,
  
  -- For businesses
  business_name text,
  business_type text,
  registration_number text,
  vat_number text,
  
  -- Contact Information
  email text NOT NULL,
  phone text,
  mobile text,
  
  -- Primary Address
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  county text,
  postcode text NOT NULL,
  country text DEFAULT 'UK',
  
  -- Alternative addresses (stored as JSONB for flexibility)
  additional_addresses jsonb DEFAULT '[]',
  
  -- Financial Information
  annual_income numeric,
  credit_score integer,
  payment_method text DEFAULT 'direct_debit' CHECK (payment_method IN ('direct_debit', 'credit_card', 'bank_transfer', 'cheque')),
  bank_details_encrypted text, -- Encrypted bank details
  
  -- Insurance History
  previous_claims_count integer DEFAULT 0,
  previous_insurers text[],
  no_claims_discount_years integer DEFAULT 0,
  
  -- Risk Assessment
  risk_category text DEFAULT 'standard' CHECK (risk_category IN ('low', 'standard', 'elevated', 'high')),
  risk_factors text[],
  
  -- Customer Relationship
  customer_since date DEFAULT CURRENT_DATE,
  customer_status text DEFAULT 'active' CHECK (customer_status IN ('prospect', 'active', 'lapsed', 'cancelled', 'suspended')),
  assigned_agent_id uuid REFERENCES public.user_profiles(id),
  marketing_consent boolean DEFAULT false,
  communication_preferences jsonb DEFAULT '{"email": true, "sms": false, "post": true, "phone": true}',
  
  -- GDPR and Privacy
  data_processing_consent boolean DEFAULT false,
  data_retention_date date,
  subject_access_requests jsonb DEFAULT '[]', -- Log of data subject requests
  
  -- Metadata
  notes text,
  tags text[],
  source text, -- How they found us
  referral_source text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  CONSTRAINT policyholders_pkey PRIMARY KEY (id)
);

-- Policyholder contacts table (additional contacts for a policyholder)
CREATE TABLE IF NOT EXISTS public.policyholder_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policyholder_id uuid NOT NULL REFERENCES public.policyholders(id) ON DELETE CASCADE,
  
  relationship text NOT NULL, -- 'spouse', 'partner', 'business_partner', 'authorized_representative', etc.
  
  -- Contact details
  title text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  
  email text,
  phone text,
  mobile text,
  
  -- Authorization
  authorized_to_act boolean DEFAULT false,
  authorization_level text[], -- What they can do on behalf of policyholder
  authorization_expiry date,
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT policyholder_contacts_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 4. CREATE POLICIES STRUCTURE
-- =====================================================

-- Insurance policies table
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_number text NOT NULL UNIQUE,
  policyholder_id uuid NOT NULL REFERENCES public.policyholders(id),
  insurance_company_id uuid NOT NULL REFERENCES public.companies(id),
  
  -- Policy Details
  policy_type text NOT NULL, -- 'home', 'commercial', 'motor', 'travel', etc.
  product_name text NOT NULL,
  coverage_type text, -- 'buildings', 'contents', 'combined', 'public_liability', etc.
  
  -- Financial Information
  sum_insured numeric NOT NULL,
  annual_premium numeric NOT NULL,
  excess_amount numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  
  -- Policy Terms
  start_date date NOT NULL,
  end_date date NOT NULL,
  renewal_date date,
  payment_frequency text DEFAULT 'annual' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual')),
  
  -- Policy Status
  status text DEFAULT 'active' CHECK (status IN ('quote', 'active', 'expired', 'cancelled', 'lapsed', 'suspended')),
  cancellation_reason text,
  cancellation_date date,
  
  -- Coverage Details (stored as JSONB for flexibility)
  coverage_details jsonb DEFAULT '{}',
  exclusions jsonb DEFAULT '[]',
  endorsements jsonb DEFAULT '[]',
  
  -- Risk Information
  risk_address jsonb NOT NULL, -- The address being insured
  additional_risks jsonb DEFAULT '[]', -- Additional locations/items
  
  -- Broker/Agent Information
  broker_id uuid REFERENCES public.user_profiles(id),
  agent_commission_rate numeric DEFAULT 0,
  
  -- Documents and Notes
  policy_documents text[], -- URLs to policy documents
  notes text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  CONSTRAINT insurance_policies_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 5. ENHANCE EXISTING PROJECTS TABLE FOR BETTER INTEGRATION
-- =====================================================

-- Add relationships to existing projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS policyholder_id uuid REFERENCES public.policyholders(id),
ADD COLUMN IF NOT EXISTS insurance_policy_id uuid REFERENCES public.insurance_policies(id),
ADD COLUMN IF NOT EXISTS insurance_company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS assigned_contractor_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS loss_adjuster_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS incident_date date,
ADD COLUMN IF NOT EXISTS incident_cause text,
ADD COLUMN IF NOT EXISTS incident_description text,
ADD COLUMN IF NOT EXISTS claim_reference text,
ADD COLUMN IF NOT EXISTS policy_excess numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS settlement_authority_limit numeric;

-- =====================================================
-- 6. CREATE USER SESSIONS AND ACTIVITY TRACKING
-- =====================================================

-- User sessions table for security tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  
  -- Session Information
  login_time timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  logout_time timestamp with time zone,
  session_duration interval,
  
  -- Device and Location Information
  ip_address inet,
  user_agent text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  browser text,
  operating_system text,
  location_country text,
  location_city text,
  
  -- Security Information
  login_method text DEFAULT 'password' CHECK (login_method IN ('password', 'sso', 'token', 'mfa')),
  mfa_verified boolean DEFAULT false,
  is_suspicious boolean DEFAULT false,
  security_flags text[],
  
  -- Session Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'suspicious')),
  termination_reason text,
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

-- User activity log for audit trail
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  session_id uuid REFERENCES public.user_sessions(id),
  
  -- Activity Information
  action text NOT NULL, -- 'login', 'logout', 'view_project', 'create_claim', etc.
  resource_type text, -- 'project', 'claim', 'user', 'company', etc.
  resource_id uuid,
  
  -- Request Information
  ip_address inet,
  user_agent text,
  request_path text,
  request_method text,
  
  -- Activity Details
  activity_details jsonb DEFAULT '{}', -- Store specific action details
  before_state jsonb, -- State before the action (for updates)
  after_state jsonb, -- State after the action (for updates)
  
  -- Security and Compliance
  compliance_relevant boolean DEFAULT false,
  gdpr_relevant boolean DEFAULT false,
  security_event boolean DEFAULT false,
  
  -- Timestamp
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT user_activity_log_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 7. CREATE SECURITY TABLES FOR REAL DATA
-- =====================================================

-- Security incidents table (replace mock data in security hooks)
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Incident Basic Information
  title text NOT NULL,
  description text NOT NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('data_breach', 'unauthorized_access', 'malware', 'phishing', 'ddos', 'insider_threat', 'system_compromise', 'other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  
  -- Detection Information
  detected_at timestamp with time zone DEFAULT now(),
  detection_method text, -- 'automated_scan', 'user_report', 'monitoring_alert', etc.
  detector_user_id uuid REFERENCES public.user_profiles(id),
  
  -- Impact Assessment
  affected_systems text[],
  affected_users uuid[],
  affected_data_types text[],
  business_impact text,
  estimated_cost numeric DEFAULT 0,
  
  -- Response Information
  assigned_to_user_id uuid REFERENCES public.user_profiles(id),
  response_team text[],
  containment_actions jsonb DEFAULT '[]',
  recovery_actions jsonb DEFAULT '[]',
  lessons_learned text,
  
  -- Timeline
  first_occurrence timestamp with time zone,
  last_occurrence timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  
  -- External Communication
  regulators_notified boolean DEFAULT false,
  customers_notified boolean DEFAULT false,
  media_involved boolean DEFAULT false,
  law_enforcement_involved boolean DEFAULT false,
  
  -- Evidence and Documentation
  evidence_files text[], -- URLs to evidence files
  forensic_report_url text,
  post_incident_report_url text,
  
  -- Compliance
  gdpr_reportable boolean DEFAULT false,
  gdpr_reported_at timestamp with time zone,
  other_compliance_requirements text[],
  
  -- Metadata
  tags text[],
  related_incidents uuid[], -- IDs of related incidents
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  CONSTRAINT security_incidents_pkey PRIMARY KEY (id)
);

-- Vulnerability scans table (replace mock data in vulnerability scanner)
CREATE TABLE IF NOT EXISTS public.vulnerability_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Scan Information
  scan_name text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('quick', 'full', 'targeted', 'compliance', 'penetration')),
  scan_engine text NOT NULL, -- 'nessus', 'openvas', 'qualys', 'rapid7', 'custom'
  
  -- Timing
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  duration_seconds integer,
  
  -- Targets
  target_systems text[] NOT NULL,
  target_networks text[],
  scan_scope jsonb DEFAULT '{}',
  
  -- Results Summary
  status text DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_vulnerabilities integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  high_count integer DEFAULT 0,
  medium_count integer DEFAULT 0,
  low_count integer DEFAULT 0,
  info_count integer DEFAULT 0,
  
  -- Risk Assessment
  risk_score numeric DEFAULT 0, -- 0-100 risk score
  security_posture text, -- 'excellent', 'good', 'fair', 'poor', 'critical'
  
  -- Configuration
  scan_config jsonb DEFAULT '{}',
  credentials_used boolean DEFAULT false,
  
  -- Results and Reports
  raw_results jsonb DEFAULT '{}',
  executive_summary text,
  detailed_report_url text,
  
  -- Follow-up
  remediation_priority text DEFAULT 'normal' CHECK (remediation_priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to_user_id uuid REFERENCES public.user_profiles(id),
  remediation_deadline date,
  
  -- Metadata
  initiated_by_user_id uuid REFERENCES public.user_profiles(id),
  automated boolean DEFAULT false,
  recurring_scan_id uuid, -- If part of a recurring scan schedule
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT vulnerability_scans_pkey PRIMARY KEY (id)
);

-- Individual vulnerabilities found in scans
CREATE TABLE IF NOT EXISTS public.vulnerabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.vulnerability_scans(id) ON DELETE CASCADE,
  
  -- Vulnerability Information
  vulnerability_id text NOT NULL, -- CVE ID or scanner-specific ID
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  cvss_score numeric,
  cvss_vector text,
  
  -- Affected Asset
  affected_host text NOT NULL,
  affected_service text,
  affected_port integer,
  affected_component text,
  
  -- Classification
  vulnerability_category text, -- 'sql_injection', 'xss', 'buffer_overflow', etc.
  cwe_id text, -- Common Weakness Enumeration ID
  owasp_category text,
  
  -- Status and Remediation
  status text DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'false_positive', 'fixed', 'mitigated', 'accepted_risk')),
  remediation_effort text CHECK (remediation_effort IN ('low', 'medium', 'high')),
  remediation_instructions text,
  patch_available boolean DEFAULT false,
  patch_details text,
  
  -- Business Context
  business_criticality text DEFAULT 'medium' CHECK (business_criticality IN ('low', 'medium', 'high', 'critical')),
  data_exposure_risk boolean DEFAULT false,
  internet_facing boolean DEFAULT false,
  
  -- Timeline
  first_detected timestamp with time zone DEFAULT now(),
  last_detected timestamp with time zone DEFAULT now(),
  fixed_at timestamp with time zone,
  verified_fixed_at timestamp with time zone,
  
  -- Assignment
  assigned_to_user_id uuid REFERENCES public.user_profiles(id),
  fix_deadline date,
  
  -- Evidence
  evidence_details jsonb DEFAULT '{}',
  proof_of_concept text,
  screenshot_urls text[],
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT vulnerabilities_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 8. CREATE BACKUP AND RECOVERY TABLES
-- =====================================================

-- Backup configurations (replace mock data in disaster recovery)
CREATE TABLE IF NOT EXISTS public.backup_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Configuration Details
  name text NOT NULL,
  description text,
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential', 'transaction_log')),
  
  -- Source and Target
  source_systems jsonb NOT NULL, -- What systems/databases to backup
  target_storage jsonb NOT NULL, -- Where to store backups
  
  -- Schedule
  schedule_type text NOT NULL CHECK (schedule_type IN ('manual', 'hourly', 'daily', 'weekly', 'monthly')),
  schedule_config jsonb DEFAULT '{}', -- Cron-like schedule configuration
  
  -- Retention Policy
  retention_daily integer DEFAULT 7,
  retention_weekly integer DEFAULT 4,
  retention_monthly integer DEFAULT 12,
  retention_yearly integer DEFAULT 7,
  
  -- Backup Options
  compression_enabled boolean DEFAULT true,
  encryption_enabled boolean DEFAULT true,
  verification_enabled boolean DEFAULT true,
  
  -- Status
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT backup_configurations_pkey PRIMARY KEY (id)
);

-- Backup history/jobs
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  configuration_id uuid NOT NULL REFERENCES public.backup_configurations(id),
  
  -- Job Information
  job_name text NOT NULL,
  backup_type text NOT NULL,
  
  -- Timing
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  duration_seconds integer,
  
  -- Status
  status text DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message text,
  warning_count integer DEFAULT 0,
  
  -- Backup Details
  data_size_bytes bigint DEFAULT 0,
  compressed_size_bytes bigint DEFAULT 0,
  compression_ratio numeric DEFAULT 0,
  file_count integer DEFAULT 0,
  
  -- Storage Information
  backup_location text NOT NULL,
  backup_files text[] DEFAULT '{}',
  checksum text,
  
  -- Verification
  verification_status text CHECK (verification_status IN ('pending', 'passed', 'failed', 'skipped')),
  verification_completed_at timestamp with time zone,
  
  -- Recovery Information
  recovery_point timestamp with time zone, -- Point in time this backup represents
  can_restore boolean DEFAULT true,
  restore_instructions text,
  
  -- Metadata
  initiated_by text DEFAULT 'scheduled', -- 'scheduled', 'manual', 'api'
  initiated_by_user_id uuid REFERENCES public.user_profiles(id),
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT backup_jobs_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Company indexes
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_parent ON public.companies(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON public.company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_type ON public.company_contacts(contact_type);

-- Enhanced user profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager ON public.user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_access_level ON public.user_profiles(access_level);

-- Policyholder indexes
CREATE INDEX IF NOT EXISTS idx_policyholders_type ON public.policyholders(type);
CREATE INDEX IF NOT EXISTS idx_policyholders_status ON public.policyholders(customer_status);
CREATE INDEX IF NOT EXISTS idx_policyholders_agent ON public.policyholders(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_policyholders_email ON public.policyholders(email);
CREATE INDEX IF NOT EXISTS idx_policyholder_contacts_holder ON public.policyholder_contacts(policyholder_id);

-- Insurance policies indexes
CREATE INDEX IF NOT EXISTS idx_policies_number ON public.insurance_policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_holder ON public.insurance_policies(policyholder_id);
CREATE INDEX IF NOT EXISTS idx_policies_company ON public.insurance_policies(insurance_company_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.insurance_policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_dates ON public.insurance_policies(start_date, end_date);

-- Project relationship indexes
CREATE INDEX IF NOT EXISTS idx_projects_policyholder ON public.projects(policyholder_id);
CREATE INDEX IF NOT EXISTS idx_projects_policy ON public.projects(insurance_policy_id);
CREATE INDEX IF NOT EXISTS idx_projects_insurance_company ON public.projects(insurance_company_id);

-- Session and activity indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON public.user_sessions(login_time);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource ON public.user_activity_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON public.user_activity_log(created_at);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON public.security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned ON public.security_incidents(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_status ON public.vulnerability_scans(status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_started ON public.vulnerability_scans(started_at);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan ON public.vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON public.vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON public.vulnerabilities(status);

-- Backup indexes
CREATE INDEX IF NOT EXISTS idx_backup_configs_active ON public.backup_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_config ON public.backup_jobs(configuration_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON public.backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_started ON public.backup_jobs(started_at);

-- =====================================================
-- 10. ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policyholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policyholder_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be refined based on specific requirements)
-- Companies: Users can access companies they're associated with
DROP POLICY IF EXISTS "Users can access associated companies" ON public.companies;
CREATE POLICY "Users can access associated companies" ON public.companies 
  FOR ALL TO authenticated USING (
    -- Users can access their own company
    id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
    OR
    -- Or companies they work with through projects
    id IN (
      SELECT DISTINCT UNNEST(ARRAY[insurance_company_id, assigned_contractor_id, loss_adjuster_id])
      FROM public.projects p
      JOIN public.project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR
    -- Or if they are admin
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Similar policies for other tables... (abbreviated for space)
-- Policyholders: Users can access policyholders for projects they're involved in
DROP POLICY IF EXISTS "Users can access project policyholders" ON public.policyholders;
CREATE POLICY "Users can access project policyholders" ON public.policyholders 
  FOR ALL TO authenticated USING (
    -- Users can access policyholders for projects they're members of
    id IN (
      SELECT p.policyholder_id
      FROM public.projects p
      JOIN public.project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = auth.uid() AND p.policyholder_id IS NOT NULL
    )
    OR
    -- Or if they are admin/agent assigned to the policyholder
    assigned_agent_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'agent')
    )
  );

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration:

-- 1. Check new tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('companies', 'policyholders', 'insurance_policies', 'security_incidents', 'vulnerability_scans', 'backup_configurations');

-- 2. Check enhanced user_profiles columns:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name IN ('company_id', 'job_title', 'access_level');

-- 3. Check project relationships:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name IN ('policyholder_id', 'insurance_policy_id', 'insurance_company_id');