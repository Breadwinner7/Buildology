-- SUPPLY CHAIN ENHANCEMENT FOR EXISTING DATABASE (FIXED VERSION)
-- This extends existing tables rather than creating duplicates
-- Focuses on contractor/surveyor management and user roles

BEGIN;

-- =====================================================
-- 1. ENHANCE EXISTING user_profiles TABLE
-- =====================================================

-- Add contractor-specific fields (only if they don't already exist)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS contractor_license_number text,
ADD COLUMN IF NOT EXISTS contractor_license_expiry date,
ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_policy_numbers jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trade_specialties text[],
ADD COLUMN IF NOT EXISTS years_experience integer,
ADD COLUMN IF NOT EXISTS hourly_rate numeric,
ADD COLUMN IF NOT EXISTS daily_rate numeric,
ADD COLUMN IF NOT EXISTS equipment_owned text[],
ADD COLUMN IF NOT EXISTS certifications_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS performance_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_contractor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contractor_notes text;

-- Add surveyor-specific fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS surveyor_registration_number text,
ADD COLUMN IF NOT EXISTS surveyor_level text CHECK (surveyor_level IN ('trainee', 'qualified', 'senior', 'principal') OR surveyor_level IS NULL),
ADD COLUMN IF NOT EXISTS rics_membership_number text,
ADD COLUMN IF NOT EXISTS other_professional_memberships jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS surveyor_specialisms text[],
ADD COLUMN IF NOT EXISTS pi_insurance_limit numeric,
ADD COLUMN IF NOT EXISTS pi_insurance_expiry date;

-- Add customer/policyholder specific fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS customer_type text CHECK (customer_type IN ('individual', 'business', 'trust', 'estate') OR customer_type IS NULL),
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS customer_since date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS risk_category text DEFAULT 'standard' CHECK (risk_category IN ('low', 'standard', 'elevated', 'high') OR risk_category IS NULL),
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS communication_preferences jsonb DEFAULT '{"email": true, "sms": false, "post": true}';

-- =====================================================
-- 2. ENHANCE EXISTING organisations TABLE  
-- =====================================================

-- Add contractor company specific fields
ALTER TABLE public.organisations 
ADD COLUMN IF NOT EXISTS contractor_license_number text,
ADD COLUMN IF NOT EXISTS contractor_registration_date date,
ADD COLUMN IF NOT EXISTS trade_associations text[],
ADD COLUMN IF NOT EXISTS accreditations jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS geographic_coverage text[],
ADD COLUMN IF NOT EXISTS minimum_project_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS maximum_project_value numeric,
ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS preferred_supplier boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS supplier_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS contractor_specialties text[],
ADD COLUMN IF NOT EXISTS equipment_available text[],
ADD COLUMN IF NOT EXISTS workforce_size integer;

-- Add surveyor practice specific fields  
ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS surveyor_practice_license text,
ADD COLUMN IF NOT EXISTS rics_regulated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS surveyors_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS surveyor_specialisms text[],
ADD COLUMN IF NOT EXISTS survey_types_offered text[];

-- =====================================================
-- 3. CREATE CONTRACTOR TEAMS TABLE (New - for project teams)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contractor_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contractor_organisation_id uuid NOT NULL REFERENCES public.organisations(id),
  team_name text NOT NULL,
  team_lead_user_id uuid REFERENCES public.user_profiles(id),
  
  -- Team composition
  team_members uuid[] DEFAULT '{}', -- Array of user_profile IDs
  specialties text[],
  
  -- Availability and capacity
  is_available boolean DEFAULT true,
  current_projects integer DEFAULT 0,
  max_concurrent_projects integer DEFAULT 3,
  geographic_coverage text[],
  
  -- Performance tracking
  projects_completed integer DEFAULT 0,
  average_project_rating numeric DEFAULT 0,
  on_time_completion_rate numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT contractor_teams_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 4. CREATE USER AVAILABILITY TABLE (New - for scheduling)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Availability windows
  date_from date NOT NULL,
  date_to date NOT NULL,
  available_hours_per_day numeric DEFAULT 8,
  
  -- Availability type
  availability_type text NOT NULL CHECK (availability_type IN ('available', 'booked', 'unavailable', 'holiday')),
  project_id uuid REFERENCES public.projects(id), -- If booked on a project
  
  -- Notes
  notes text,
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT user_availability_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 5. EXTEND PROJECT ASSIGNMENTS (Enhance existing project_members)
-- =====================================================

-- Add more specific role assignments to existing project_members table
ALTER TABLE public.project_members 
ADD COLUMN IF NOT EXISTS role_specific_permissions jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hourly_rate numeric,
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS assignment_notes text;

-- =====================================================
-- 6. CREATE CONTRACTOR PERFORMANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contractor_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contractor_user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  
  -- Performance metrics
  work_quality_rating integer CHECK (work_quality_rating BETWEEN 1 AND 5),
  timeliness_rating integer CHECK (timeliness_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  professionalism_rating integer CHECK (professionalism_rating BETWEEN 1 AND 5),
  
  -- Project specifics
  project_start_date date,
  project_end_date date,
  project_duration_days integer,
  was_on_time boolean,
  was_within_budget boolean,
  
  -- Feedback
  positive_feedback text,
  areas_for_improvement text,
  would_use_again boolean,
  
  -- Evaluation details
  evaluated_by uuid REFERENCES public.user_profiles(id),
  evaluation_date date DEFAULT CURRENT_DATE,
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT contractor_performance_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 7. ENHANCE ROLE PERMISSIONS FOR SUPPLY CHAIN
-- =====================================================

-- First check if role_permissions table exists and what columns it has
DO $$ 
BEGIN
  -- Check if the table exists before trying to insert
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    -- Try to insert permissions, but handle the case where there's no unique constraint
    BEGIN
      -- Contractor permissions
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'contractor', 'projects', 'view_assigned_projects', 'View projects they are assigned to', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'contractor' AND permission_category = 'projects' AND permission = 'view_assigned_projects'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'contractor', 'projects', 'update_project_progress', 'Update progress on assigned projects', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'contractor' AND permission_category = 'projects' AND permission = 'update_project_progress'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'contractor', 'quotes', 'submit_quotes', 'Submit quotes for project work', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'contractor' AND permission_category = 'quotes' AND permission = 'submit_quotes'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'contractor', 'documents', 'upload_progress_photos', 'Upload work progress photographs', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'contractor' AND permission_category = 'documents' AND permission = 'upload_progress_photos'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'contractor', 'invoices', 'submit_invoices', 'Submit invoices for completed work', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'contractor' AND permission_category = 'invoices' AND permission = 'submit_invoices'
      );
      
      -- Surveyor permissions
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'surveyor', 'surveys', 'conduct_surveys', 'Conduct property surveys', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'surveyor' AND permission_category = 'surveys' AND permission = 'conduct_surveys'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'surveyor', 'surveys', 'approve_survey_reports', 'Approve and submit survey reports', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'surveyor' AND permission_category = 'surveys' AND permission = 'approve_survey_reports'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'surveyor', 'reserves', 'set_initial_reserves', 'Set initial damage reserve amounts', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'surveyor' AND permission_category = 'reserves' AND permission = 'set_initial_reserves'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'surveyor', 'damage_items', 'create_damage_assessments', 'Create detailed damage assessments', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'surveyor' AND permission_category = 'damage_items' AND permission = 'create_damage_assessments'
      );
      
      -- Admin permissions for supply chain management
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'admin', 'contractors', 'manage_all_contractors', 'Full contractor management access', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'admin' AND permission_category = 'contractors' AND permission = 'manage_all_contractors'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'admin', 'surveyors', 'manage_all_surveyors', 'Full surveyor management access', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'admin' AND permission_category = 'surveyors' AND permission = 'manage_all_surveyors'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'admin', 'performance', 'view_all_performance_data', 'View performance data for all users', false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'admin' AND permission_category = 'performance' AND permission = 'view_all_performance_data'
      );
      
      INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
      SELECT 'admin', 'supply_chain', 'configure_supply_chain', 'Configure supply chain settings', true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role = 'admin' AND permission_category = 'supply_chain' AND permission = 'configure_supply_chain'
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert role_permissions: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'role_permissions table does not exist, skipping permission inserts';
  END IF;
END $$;

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User profile indexes for supply chain queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_contractor_specialties ON public.user_profiles USING GIN (trade_specialties);
CREATE INDEX IF NOT EXISTS idx_user_profiles_surveyor_level ON public.user_profiles(surveyor_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_type ON public.user_profiles(customer_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_risk_category ON public.user_profiles(risk_category);

-- Organisation indexes
CREATE INDEX IF NOT EXISTS idx_organisations_contractor_specialties ON public.organisations USING GIN (contractor_specialties);
CREATE INDEX IF NOT EXISTS idx_organisations_geographic_coverage ON public.organisations USING GIN (geographic_coverage);
CREATE INDEX IF NOT EXISTS idx_organisations_preferred_supplier ON public.organisations(preferred_supplier);

-- Performance and availability indexes
CREATE INDEX IF NOT EXISTS idx_contractor_performance_user ON public.contractor_performance(contractor_user_id);
CREATE INDEX IF NOT EXISTS idx_contractor_performance_project ON public.contractor_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_user_date ON public.user_availability(user_id, date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_contractor_teams_organisation ON public.contractor_teams(contractor_organisation_id);

-- =====================================================
-- 9. CREATE VIEWS FOR SUPPLY CHAIN REPORTING
-- =====================================================

-- View for contractor directory with performance
CREATE OR REPLACE VIEW public.contractor_directory AS
SELECT 
  up.id,
  up.first_name,
  up.surname,
  up.email,
  up.job_title,
  up.trade_specialties,
  up.years_experience,
  up.hourly_rate,
  up.daily_rate,
  up.performance_rating,
  up.preferred_contractor,
  org.name as company_name,
  org.type as organisation_type,
  org.contractor_specialties,
  org.geographic_coverage,
  org.preferred_supplier,
  -- Calculate average performance from contractor_performance table
  COALESCE(AVG(cp.work_quality_rating), 0) as avg_work_quality,
  COALESCE(AVG(cp.timeliness_rating), 0) as avg_timeliness,
  COUNT(cp.id) as projects_evaluated
FROM public.user_profiles up
LEFT JOIN public.organisations org ON up.organisation_id = org.id
LEFT JOIN public.contractor_performance cp ON up.id = cp.contractor_user_id
WHERE up.role = 'contractor'
GROUP BY up.id, org.id, org.name, org.type, org.contractor_specialties, org.geographic_coverage, org.preferred_supplier;

-- View for surveyor directory
CREATE OR REPLACE VIEW public.surveyor_directory AS
SELECT 
  up.id,
  up.first_name,
  up.surname,
  up.email,
  up.surveyor_level,
  up.rics_membership_number,
  up.surveyor_specialisms,
  up.regions_covered,
  up.maximum_claim_value,
  org.name as practice_name,
  org.rics_regulated,
  org.survey_types_offered
FROM public.user_profiles up
LEFT JOIN public.organisations org ON up.organisation_id = org.id
WHERE up.role = 'surveyor';

-- View for customer/policyholder directory
CREATE OR REPLACE VIEW public.customer_directory AS
SELECT 
  up.id,
  up.first_name,
  up.surname,
  up.business_name,
  up.email,
  up.customer_type,
  up.risk_category,
  up.customer_since,
  up.marketing_consent,
  COUNT(DISTINCT ip.id) as policy_count,
  COUNT(DISTINCT c.id) as claim_count
FROM public.user_profiles up
LEFT JOIN public.insurance_policies ip ON up.id = ip.policyholder_id
LEFT JOIN public.claims c ON ip.id = c.policy_id
WHERE up.role = 'policyholder'
GROUP BY up.id;

-- =====================================================
-- 10. UPDATE EXISTING RLS POLICIES IF NEEDED
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.contractor_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_performance ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for new tables
DROP POLICY IF EXISTS "Users can manage their own availability" ON public.user_availability;
CREATE POLICY "Users can manage their own availability" ON public.user_availability 
  FOR ALL TO authenticated USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can view contractor performance" ON public.contractor_performance;
CREATE POLICY "Users can view contractor performance" ON public.contractor_performance 
  FOR SELECT TO authenticated USING (
    contractor_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.project_members pm 
      WHERE pm.project_id = contractor_performance.project_id 
      AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the enhancements:

-- 1. Check enhanced user_profiles structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name LIKE '%contractor%' OR column_name LIKE '%surveyor%' OR column_name LIKE '%customer%';

-- 2. Check enhanced organisations structure  
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organisations' AND column_name LIKE '%contractor%' OR column_name LIKE '%surveyor%';

-- 3. Check new supply chain permissions (if role_permissions table exists)
-- SELECT * FROM public.role_permissions WHERE role IN ('contractor', 'surveyor', 'admin') AND permission_category IN ('contractors', 'surveyors', 'supply_chain');

-- 4. Test contractor directory view
-- SELECT * FROM public.contractor_directory LIMIT 5;

-- 5. Test surveyor directory view  
-- SELECT * FROM public.surveyor_directory LIMIT 5;

-- 6. Test customer directory view
-- SELECT * FROM public.customer_directory LIMIT 5;