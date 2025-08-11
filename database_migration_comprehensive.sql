-- COMPREHENSIVE DATABASE MIGRATION SCRIPT
-- This script aligns the reserving system with the existing database schema
-- Run this script to bring your database up to date with all enhanced features

BEGIN;

-- =====================================================
-- 1. UPDATE PROJECT_RESERVES TABLE (Enhanced Tracking)
-- =====================================================

-- Add estimated vs actual columns to existing project_reserves table
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS estimated_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_contents_reserve numeric DEFAULT 0, 
ADD COLUMN IF NOT EXISTS estimated_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_total_reserve_amount numeric DEFAULT 0;

-- Add actual columns (renamed for clarity)
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS actual_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_contents_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_total_reserve_amount numeric DEFAULT 0;

-- Add variance tracking columns
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS variance_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_contents_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_total_reserve_amount numeric DEFAULT 0;

-- Migrate existing data to new structure (copy to actual columns)
UPDATE public.project_reserves 
SET 
  actual_building_reserve = COALESCE(building_reserve, 0),
  actual_contents_reserve = COALESCE(contents_reserve, 0),
  actual_consequential_reserve = COALESCE(consequential_reserve, 0),
  actual_alternative_accommodation_reserve = COALESCE(alternative_accommodation_reserve, 0),
  actual_professional_fees_reserve = COALESCE(professional_fees_reserve, 0),
  actual_total_reserve_amount = COALESCE(total_reserve_amount, 0),
  -- Set estimated equal to actual initially for existing records
  estimated_building_reserve = COALESCE(building_reserve, 0),
  estimated_contents_reserve = COALESCE(contents_reserve, 0),
  estimated_consequential_reserve = COALESCE(consequential_reserve, 0),
  estimated_alternative_accommodation_reserve = COALESCE(alternative_accommodation_reserve, 0),
  estimated_professional_fees_reserve = COALESCE(professional_fees_reserve, 0),
  estimated_total_reserve_amount = COALESCE(total_reserve_amount, 0)
WHERE 
  actual_building_reserve = 0 OR actual_building_reserve IS NULL;

-- =====================================================
-- 2. CREATE RESERVE HISTORY TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reserve_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_id uuid NOT NULL,
  change_type text NOT NULL, -- 'initial_estimate', 'revised_estimate', 'actual_update', 'variance_review'
  category text NOT NULL, -- 'building', 'contents', 'consequential', 'alternative', 'professional_fees'
  previous_estimated_amount numeric DEFAULT 0,
  new_estimated_amount numeric DEFAULT 0,
  previous_actual_amount numeric DEFAULT 0,
  new_actual_amount numeric DEFAULT 0,
  variance_amount numeric DEFAULT 0,
  variance_percentage numeric DEFAULT 0,
  change_reason text,
  supporting_documents text[], -- URLs or file references
  created_by uuid,
  change_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reserve_history_pkey PRIMARY KEY (id),
  CONSTRAINT reserve_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT reserve_history_reserve_id_fkey FOREIGN KEY (reserve_id) REFERENCES public.project_reserves(id),
  CONSTRAINT reserve_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- =====================================================
-- 3. CREATE/UPDATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to calculate and update variances automatically
CREATE OR REPLACE FUNCTION update_reserve_variances()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variances when estimated or actual amounts change
  NEW.variance_building_reserve := COALESCE(NEW.actual_building_reserve, 0) - COALESCE(NEW.estimated_building_reserve, 0);
  NEW.variance_contents_reserve := COALESCE(NEW.actual_contents_reserve, 0) - COALESCE(NEW.estimated_contents_reserve, 0);
  NEW.variance_consequential_reserve := COALESCE(NEW.actual_consequential_reserve, 0) - COALESCE(NEW.estimated_consequential_reserve, 0);
  NEW.variance_alternative_accommodation_reserve := COALESCE(NEW.actual_alternative_accommodation_reserve, 0) - COALESCE(NEW.estimated_alternative_accommodation_reserve, 0);
  NEW.variance_professional_fees_reserve := COALESCE(NEW.actual_professional_fees_reserve, 0) - COALESCE(NEW.estimated_professional_fees_reserve, 0);
  
  -- Calculate total variances
  NEW.variance_total_reserve_amount := 
    NEW.variance_building_reserve + 
    NEW.variance_contents_reserve + 
    NEW.variance_consequential_reserve + 
    NEW.variance_alternative_accommodation_reserve + 
    NEW.variance_professional_fees_reserve;
  
  -- Update totals
  NEW.estimated_total_reserve_amount := 
    COALESCE(NEW.estimated_building_reserve, 0) +
    COALESCE(NEW.estimated_contents_reserve, 0) +
    COALESCE(NEW.estimated_consequential_reserve, 0) +
    COALESCE(NEW.estimated_alternative_accommodation_reserve, 0) +
    COALESCE(NEW.estimated_professional_fees_reserve, 0);
    
  NEW.actual_total_reserve_amount := 
    COALESCE(NEW.actual_building_reserve, 0) +
    COALESCE(NEW.actual_contents_reserve, 0) +
    COALESCE(NEW.actual_consequential_reserve, 0) +
    COALESCE(NEW.actual_alternative_accommodation_reserve, 0) +
    COALESCE(NEW.actual_professional_fees_reserve, 0);

  -- Update legacy total_reserve_amount for backwards compatibility
  NEW.total_reserve_amount := NEW.actual_total_reserve_amount;

  -- Update legacy individual reserve amounts for backwards compatibility
  NEW.building_reserve := NEW.actual_building_reserve;
  NEW.contents_reserve := NEW.actual_contents_reserve;
  NEW.consequential_reserve := NEW.actual_consequential_reserve;
  NEW.alternative_accommodation_reserve := NEW.actual_alternative_accommodation_reserve;
  NEW.professional_fees_reserve := NEW.actual_professional_fees_reserve;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic variance calculation
DROP TRIGGER IF EXISTS trigger_update_reserve_variances ON public.project_reserves;
CREATE TRIGGER trigger_update_reserve_variances
  BEFORE INSERT OR UPDATE ON public.project_reserves
  FOR EACH ROW
  EXECUTE FUNCTION update_reserve_variances();

-- =====================================================
-- 4. UPDATE HOD_CODES DATA (Remove Mock Data, Add Real Structure)
-- =====================================================

-- Clear existing HOD codes if they exist (removing mock data)
DELETE FROM public.hod_codes;

-- Insert real, practical HOD code structure for insurance claims
INSERT INTO public.hod_codes (code, description, category, sub_category, typical_rate_low, typical_rate_high, unit_type, notes) VALUES
-- Building - Essential Core Codes
('B01.01', 'External Wall Repair - Masonry/Brick', 'building', 'structural', 150.00, 300.00, 'per_square_metre', 'Includes minor pointing and replacement'),
('B01.02', 'External Wall Replacement - Major', 'building', 'structural', 400.00, 800.00, 'per_square_metre', 'Complete reconstruction required'),
('B02.01', 'Roof Covering - Tile Replacement', 'building', 'roofing', 80.00, 150.00, 'per_square_metre', 'Standard concrete/clay tiles'),
('B02.02', 'Roof Structure - Timber Repair', 'building', 'roofing', 200.00, 400.00, 'per_square_metre', 'Includes rafters and battens'),
('B03.01', 'Windows - Standard Replacement', 'building', 'glazing', 250.00, 500.00, 'per_square_metre', 'UPVC double glazed'),
('B03.02', 'Doors - External Replacement', 'building', 'doors', 600.00, 1200.00, 'per_item', 'Including frame and hardware'),
('B04.01', 'Internal Walls - Plaster Repair', 'building', 'internal', 45.00, 85.00, 'per_square_metre', 'Including decoration'),
('B04.02', 'Floor Finishes - Carpet', 'building', 'flooring', 25.00, 65.00, 'per_square_metre', 'Standard domestic quality'),
('B04.03', 'Floor Finishes - Hardwood', 'building', 'flooring', 80.00, 200.00, 'per_square_metre', 'Engineered or solid wood'),
('B05.01', 'Kitchen - Standard Replacement', 'building', 'kitchen', 8000.00, 20000.00, 'per_item', 'Complete kitchen including appliances'),
('B05.02', 'Bathroom - Standard Replacement', 'building', 'bathroom', 4000.00, 12000.00, 'per_item', 'Including sanitaryware and tiling'),

-- Contents - Practical Categories
('C01.01', 'Furniture - Living Room Suite', 'contents', 'furniture', 800.00, 2500.00, 'per_item', 'Standard 3-piece suite'),
('C01.02', 'Furniture - Bedroom Set', 'contents', 'furniture', 1000.00, 3000.00, 'per_item', 'Bed, wardrobe, chest of drawers'),
('C01.03', 'Furniture - Dining Set', 'contents', 'furniture', 500.00, 1500.00, 'per_item', 'Table and 4-6 chairs'),
('C02.01', 'Electronics - Television', 'contents', 'electronics', 400.00, 2000.00, 'per_item', 'Based on size and features'),
('C02.02', 'Electronics - Computer Equipment', 'contents', 'electronics', 500.00, 3000.00, 'per_item', 'Desktop/laptop including peripherals'),
('C03.01', 'Appliances - Washing Machine', 'contents', 'appliances', 300.00, 800.00, 'per_item', 'Standard domestic machine'),
('C03.02', 'Appliances - Refrigerator', 'contents', 'appliances', 400.00, 1200.00, 'per_item', 'Fridge freezer combination'),
('C04.01', 'Clothing - Adult Full Wardrobe', 'contents', 'clothing', 1000.00, 3000.00, 'per_item', 'Complete seasonal wardrobe'),
('C04.02', 'Clothing - Child Wardrobe', 'contents', 'clothing', 400.00, 1000.00, 'per_item', 'Age-appropriate clothing'),

-- Alternative Accommodation
('A01.01', 'Hotel Accommodation - Standard', 'alternative', 'accommodation', 80.00, 150.00, 'per_night', 'Per room including breakfast'),
('A01.02', 'Rental Property - Short Term', 'alternative', 'accommodation', 100.00, 300.00, 'per_night', 'Self-catering accommodation'),
('A02.01', 'Storage Costs - Containerised', 'alternative', 'storage', 150.00, 300.00, 'per_week', 'Professional storage per week'),
('A03.01', 'Removal Costs - Professional', 'alternative', 'services', 400.00, 1000.00, 'per_item', 'Complete removal service'),

-- Professional Fees
('P01.01', 'Loss Adjusting Fee', 'professional_fees', 'adjusting', 2000.00, 8000.00, 'per_item', 'Complex claim investigation'),
('P01.02', 'Building Survey Fee', 'professional_fees', 'surveying', 800.00, 2500.00, 'per_item', 'Detailed damage assessment'),
('P02.01', 'Legal Fees - Standard', 'professional_fees', 'legal', 200.00, 400.00, 'per_hour', 'Solicitor hourly rate'),
('P03.01', 'Architect Fees', 'professional_fees', 'design', 1500.00, 5000.00, 'per_item', 'Design and planning services'),

-- PC Sum Categories (Placeholders for undefined scope)
('PC01', 'Building Works - Undefined Scope', 'building', 'pc_sum', 0.00, 0.00, 'per_item', 'To be defined based on further investigation'),
('PC02', 'Contents Replacement - TBD', 'contents', 'pc_sum', 0.00, 0.00, 'per_item', 'Pending detailed assessment'),
('PC03', 'Professional Services - TBD', 'professional_fees', 'pc_sum', 0.00, 0.00, 'per_item', 'Additional professional input required');

-- =====================================================
-- 5. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for reserve_history table
CREATE INDEX IF NOT EXISTS idx_reserve_history_project_id ON public.reserve_history(project_id);
CREATE INDEX IF NOT EXISTS idx_reserve_history_reserve_id ON public.reserve_history(reserve_id);
CREATE INDEX IF NOT EXISTS idx_reserve_history_category ON public.reserve_history(category);
CREATE INDEX IF NOT EXISTS idx_reserve_history_change_type ON public.reserve_history(change_type);
CREATE INDEX IF NOT EXISTS idx_reserve_history_change_date ON public.reserve_history(change_date);

-- Enhanced indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_project_reserves_estimated_total ON public.project_reserves(estimated_total_reserve_amount);
CREATE INDEX IF NOT EXISTS idx_project_reserves_actual_total ON public.project_reserves(actual_total_reserve_amount);
CREATE INDEX IF NOT EXISTS idx_project_reserves_variance_total ON public.project_reserves(variance_total_reserve_amount);

-- =====================================================
-- 6. UPDATE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on reserve_history
ALTER TABLE public.reserve_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for reserve_history
DROP POLICY IF EXISTS "Users can manage reserve history" ON public.reserve_history;
CREATE POLICY "Users can manage reserve history" ON public.reserve_history 
  FOR ALL TO authenticated USING (
    -- Users can access reserve history for projects they have access to
    EXISTS (
      SELECT 1 FROM public.project_members pm 
      WHERE pm.project_id = reserve_history.project_id 
      AND pm.user_id = auth.uid()
    )
    OR
    -- Or if they are admin
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- =====================================================
-- 7. CREATE VIEWS FOR REPORTING
-- =====================================================

-- Create view for reserve summaries
CREATE OR REPLACE VIEW public.reserve_summary_view AS
SELECT 
  pr.id,
  pr.project_id,
  p.name as project_name,
  pr.reserve_type,
  pr.status,
  pr.estimated_total_reserve_amount,
  pr.actual_total_reserve_amount,
  pr.variance_total_reserve_amount,
  CASE 
    WHEN pr.estimated_total_reserve_amount > 0 
    THEN (pr.variance_total_reserve_amount / pr.estimated_total_reserve_amount) * 100 
    ELSE 0 
  END as variance_percentage,
  pr.created_at,
  pr.updated_at,
  CONCAT(up.first_name, ' ', up.surname) as created_by_name
FROM public.project_reserves pr
JOIN public.projects p ON pr.project_id = p.id
LEFT JOIN public.user_profiles up ON pr.created_by = up.id;

-- Create view for damage items with HOD details
CREATE OR REPLACE VIEW public.damage_items_detailed AS
SELECT 
  di.*,
  hc.code as hod_code,
  hc.description as hod_description,
  hc.category as hod_category,
  hc.sub_category as hod_sub_category,
  p.name as project_name,
  CONCAT(up.first_name, ' ', up.surname) as created_by_name
FROM public.damage_items di
LEFT JOIN public.hod_codes hc ON di.hod_code_id = hc.id
LEFT JOIN public.projects p ON di.project_id = p.id
LEFT JOIN public.user_profiles up ON di.created_by = up.id;

-- =====================================================
-- 8. CREATE STORED PROCEDURES FOR COMMON OPERATIONS
-- =====================================================

-- Function to create a new reserve with history logging
CREATE OR REPLACE FUNCTION create_reserve_with_history(
  p_project_id uuid,
  p_reserve_type text,
  p_estimated_building numeric DEFAULT 0,
  p_estimated_contents numeric DEFAULT 0,
  p_estimated_consequential numeric DEFAULT 0,
  p_estimated_alternative numeric DEFAULT 0,
  p_estimated_professional numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_reserve_id uuid;
BEGIN
  -- Insert new reserve
  INSERT INTO public.project_reserves (
    project_id,
    reserve_type,
    estimated_building_reserve,
    estimated_contents_reserve,
    estimated_consequential_reserve,
    estimated_alternative_accommodation_reserve,
    estimated_professional_fees_reserve,
    notes,
    created_by,
    status
  ) VALUES (
    p_project_id,
    p_reserve_type,
    p_estimated_building,
    p_estimated_contents,
    p_estimated_consequential,
    p_estimated_alternative,
    p_estimated_professional,
    p_notes,
    COALESCE(p_created_by, auth.uid()),
    'draft'
  ) RETURNING id INTO v_reserve_id;

  -- Log initial creation in history
  INSERT INTO public.reserve_history (
    project_id,
    reserve_id,
    change_type,
    category,
    new_estimated_amount,
    change_reason,
    created_by
  ) VALUES 
  (p_project_id, v_reserve_id, 'initial_estimate', 'building', p_estimated_building, 'Initial reserve creation', COALESCE(p_created_by, auth.uid())),
  (p_project_id, v_reserve_id, 'initial_estimate', 'contents', p_estimated_contents, 'Initial reserve creation', COALESCE(p_created_by, auth.uid())),
  (p_project_id, v_reserve_id, 'initial_estimate', 'consequential', p_estimated_consequential, 'Initial reserve creation', COALESCE(p_created_by, auth.uid())),
  (p_project_id, v_reserve_id, 'initial_estimate', 'alternative', p_estimated_alternative, 'Initial reserve creation', COALESCE(p_created_by, auth.uid())),
  (p_project_id, v_reserve_id, 'initial_estimate', 'professional_fees', p_estimated_professional, 'Initial reserve creation', COALESCE(p_created_by, auth.uid()));

  RETURN v_reserve_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update actual reserves with history logging
CREATE OR REPLACE FUNCTION update_actual_reserves(
  p_reserve_id uuid,
  p_category text,
  p_new_amount numeric,
  p_reason text,
  p_updated_by uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_old_amount numeric;
  v_project_id uuid;
BEGIN
  -- Get current amount and project_id
  SELECT 
    CASE p_category
      WHEN 'building' THEN actual_building_reserve
      WHEN 'contents' THEN actual_contents_reserve  
      WHEN 'consequential' THEN actual_consequential_reserve
      WHEN 'alternative' THEN actual_alternative_accommodation_reserve
      WHEN 'professional_fees' THEN actual_professional_fees_reserve
      ELSE 0
    END,
    project_id
  INTO v_old_amount, v_project_id
  FROM public.project_reserves 
  WHERE id = p_reserve_id;

  -- Update the actual amount
  UPDATE public.project_reserves 
  SET 
    actual_building_reserve = CASE WHEN p_category = 'building' THEN p_new_amount ELSE actual_building_reserve END,
    actual_contents_reserve = CASE WHEN p_category = 'contents' THEN p_new_amount ELSE actual_contents_reserve END,
    actual_consequential_reserve = CASE WHEN p_category = 'consequential' THEN p_new_amount ELSE actual_consequential_reserve END,
    actual_alternative_accommodation_reserve = CASE WHEN p_category = 'alternative' THEN p_new_amount ELSE actual_alternative_accommodation_reserve END,
    actual_professional_fees_reserve = CASE WHEN p_category = 'professional_fees' THEN p_new_amount ELSE actual_professional_fees_reserve END,
    updated_at = now()
  WHERE id = p_reserve_id;

  -- Log the change
  INSERT INTO public.reserve_history (
    project_id,
    reserve_id,
    change_type,
    category,
    previous_actual_amount,
    new_actual_amount,
    variance_amount,
    change_reason,
    created_by
  ) VALUES (
    v_project_id,
    p_reserve_id,
    'actual_update',
    p_category,
    v_old_amount,
    p_new_amount,
    p_new_amount - v_old_amount,
    p_reason,
    COALESCE(p_updated_by, auth.uid())
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. INSERT DEFAULT ROLE PERMISSIONS FOR RESERVES
-- =====================================================

-- Insert permissions for reserve management (using existing database roles)
-- First, check if these permissions already exist to avoid duplicates
INSERT INTO public.role_permissions (role, permission_category, permission, description, requires_additional_auth)
SELECT 'admin', 'reserves', 'create_reserve', 'Create new project reserves', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin' AND permission_category = 'reserves' AND permission = 'create_reserve')

UNION ALL

SELECT 'admin', 'reserves', 'update_estimated', 'Update estimated reserve amounts', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin' AND permission_category = 'reserves' AND permission = 'update_estimated')

UNION ALL

SELECT 'admin', 'reserves', 'update_actual', 'Update actual reserve amounts', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin' AND permission_category = 'reserves' AND permission = 'update_actual')

UNION ALL

SELECT 'admin', 'reserves', 'approve_reserve', 'Approve reserve changes', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin' AND permission_category = 'reserves' AND permission = 'approve_reserve')

UNION ALL

SELECT 'admin', 'reserves', 'view_variance', 'View variance analysis', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin' AND permission_category = 'reserves' AND permission = 'view_variance')

UNION ALL

SELECT 'surveyor', 'reserves', 'create_reserve', 'Create new project reserves', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'surveyor' AND permission_category = 'reserves' AND permission = 'create_reserve')

UNION ALL

SELECT 'surveyor', 'reserves', 'update_estimated', 'Update estimated reserve amounts', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'surveyor' AND permission_category = 'reserves' AND permission = 'update_estimated')

UNION ALL

SELECT 'surveyor', 'reserves', 'update_actual', 'Update actual reserve amounts', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'surveyor' AND permission_category = 'reserves' AND permission = 'update_actual')

UNION ALL

SELECT 'surveyor', 'reserves', 'view_variance', 'View variance analysis', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'surveyor' AND permission_category = 'reserves' AND permission = 'view_variance')

UNION ALL

SELECT 'handler', 'reserves', 'view_variance', 'View variance analysis', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'handler' AND permission_category = 'reserves' AND permission = 'view_variance')

UNION ALL

SELECT 'handler', 'reserves', 'update_actual', 'Update actual reserve amounts', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'handler' AND permission_category = 'reserves' AND permission = 'update_actual')

UNION ALL

SELECT 'contractor', 'reserves', 'view_variance', 'View assigned project variances only', false
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'contractor' AND permission_category = 'reserves' AND permission = 'view_variance');

COMMIT;

-- =====================================================
-- MIGRATION VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the migration completed successfully:

-- 1. Check project_reserves structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'project_reserves' ORDER BY ordinal_position;

-- 2. Check reserve_history table exists
-- SELECT COUNT(*) FROM public.reserve_history;

-- 3. Check HOD codes were inserted
-- SELECT category, COUNT(*) as code_count FROM public.hod_codes GROUP BY category;

-- 4. Test variance calculation trigger
-- SELECT id, estimated_total_reserve_amount, actual_total_reserve_amount, variance_total_reserve_amount FROM public.project_reserves LIMIT 5;

-- 5. Check views were created
-- SELECT * FROM public.reserve_summary_view LIMIT 5;

-- End of migration script