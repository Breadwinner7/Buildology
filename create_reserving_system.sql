?-- Reserving and Building System with HOD Codes
-- This script creates the necessary tables for damage assessment, HOD codes, PC sums, and surveyor integration

-- HOD (Head of Damage) Codes lookup table
CREATE TABLE public.hod_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL, -- 'building', 'contents', 'consequential', 'alternative', 'professional_fees'
  sub_category text,
  typical_rate_low numeric,
  typical_rate_high numeric,
  unit_type text DEFAULT 'per_item', -- 'per_item', 'per_square_metre', 'per_hour', 'percentage'
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hod_codes_pkey PRIMARY KEY (id)
);

-- Project reserves for damage assessment
CREATE TABLE public.project_reserves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_type text NOT NULL DEFAULT 'initial', -- 'initial', 'revised', 'final'
  total_reserve_amount numeric NOT NULL DEFAULT 0,
  building_reserve numeric DEFAULT 0,
  contents_reserve numeric DEFAULT 0,
  consequential_reserve numeric DEFAULT 0,
  alternative_accommodation_reserve numeric DEFAULT 0,
  professional_fees_reserve numeric DEFAULT 0,
  currency text DEFAULT 'GBP',
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  status text DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'superseded'
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_reserves_pkey PRIMARY KEY (id),
  CONSTRAINT project_reserves_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_reserves_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT project_reserves_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id)
);

-- Individual damage items with HOD codes
CREATE TABLE public.damage_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_id uuid,
  hod_code_id uuid NOT NULL,
  item_description text NOT NULL,
  location text, -- Room/area where damage occurred
  quantity numeric DEFAULT 1,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  vat_rate numeric DEFAULT 20.0,
  vat_amount numeric DEFAULT 0,
  total_including_vat numeric NOT NULL,
  damage_cause text,
  damage_extent text, -- 'minor', 'moderate', 'major', 'total_loss'
  repair_method text, -- 'repair', 'replace', 'make_good'
  urgency text DEFAULT 'normal', -- 'low', 'normal', 'high', 'emergency'
  photos text[] DEFAULT '{}', -- Array of photo URLs/paths
  measurements jsonb, -- Structured measurement data
  supplier_quotes jsonb DEFAULT '{}', -- Quotes from suppliers/contractors
  surveyor_notes text,
  contractor_notes text,
  status text DEFAULT 'estimated', -- 'estimated', 'quoted', 'approved', 'works_ordered', 'completed'
  created_by uuid,
  surveyed_by uuid,
  surveyed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT damage_items_pkey PRIMARY KEY (id),
  CONSTRAINT damage_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT damage_items_reserve_id_fkey FOREIGN KEY (reserve_id) REFERENCES public.project_reserves(id),
  CONSTRAINT damage_items_hod_code_id_fkey FOREIGN KEY (hod_code_id) REFERENCES public.hod_codes(id),
  CONSTRAINT damage_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT damage_items_surveyed_by_fkey FOREIGN KEY (surveyed_by) REFERENCES public.user_profiles(id)
);

-- PC (Prime Cost) Sums for undefined scope items
CREATE TABLE public.pc_sums (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_id uuid,
  pc_sum_description text NOT NULL,
  allocated_amount numeric NOT NULL,
  spent_amount numeric DEFAULT 0,
  remaining_amount numeric DEFAULT 0,
  category text, -- Links to HOD code categories
  justification text NOT NULL,
  scope_definition text,
  expected_completion_date date,
  actual_completion_date date,
  contractor_id uuid, -- Who will execute this PC sum
  status text DEFAULT 'allocated', -- 'allocated', 'in_progress', 'completed', 'cancelled'
  approval_required boolean DEFAULT true,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pc_sums_pkey PRIMARY KEY (id),
  CONSTRAINT pc_sums_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT pc_sums_reserve_id_fkey FOREIGN KEY (reserve_id) REFERENCES public.project_reserves(id),
  CONSTRAINT pc_sums_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.user_profiles(id),
  CONSTRAINT pc_sums_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id),
  CONSTRAINT pc_sums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Scope variations and changes
CREATE TABLE public.scope_variations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_id uuid,
  variation_type text NOT NULL, -- 'addition', 'omission', 'change'
  description text NOT NULL,
  original_scope text,
  revised_scope text,
  cost_impact numeric NOT NULL, -- Can be positive or negative
  time_impact_days integer DEFAULT 0,
  justification text NOT NULL,
  client_instructions text,
  surveyor_recommendation text,
  status text DEFAULT 'proposed', -- 'proposed', 'client_review', 'approved', 'rejected', 'implemented'
  client_approval_required boolean DEFAULT true,
  client_approved boolean DEFAULT false,
  client_approved_by text,
  client_approved_at timestamp with time zone,
  surveyor_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scope_variations_pkey PRIMARY KEY (id),
  CONSTRAINT scope_variations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT scope_variations_reserve_id_fkey FOREIGN KEY (reserve_id) REFERENCES public.project_reserves(id),
  CONSTRAINT scope_variations_surveyor_id_fkey FOREIGN KEY (surveyor_id) REFERENCES public.user_profiles(id),
  CONSTRAINT scope_variations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Survey forms and damage assessments
CREATE TABLE public.survey_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  form_type text NOT NULL, -- 'initial_survey', 'detailed_survey', 'progress_inspection', 'final_inspection'
  surveyor_id uuid NOT NULL,
  survey_date date NOT NULL,
  property_type text,
  year_built integer,
  construction_type text,
  occupancy_status text, -- 'occupied', 'vacant', 'partially_occupied'
  access_gained boolean DEFAULT true,
  access_restrictions text,
  weather_conditions text,
  cause_of_loss text,
  incident_date date,
  damage_summary text NOT NULL,
  recommendations text,
  urgent_actions_required text,
  health_safety_concerns text,
  salvage_opportunities text,
  make_safe_required boolean DEFAULT false,
  make_safe_completed boolean DEFAULT false,
  make_safe_cost numeric,
  drying_equipment_required boolean DEFAULT false,
  drying_equipment_installed boolean DEFAULT false,
  environmental_monitoring jsonb, -- Moisture readings, temperature, etc.
  photos_taken integer DEFAULT 0,
  photo_references text[] DEFAULT '{}',
  sketch_plan_attached boolean DEFAULT false,
  additional_specialists_required text[] DEFAULT '{}', -- 'structural_engineer', 'asbestos_surveyor', etc.
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  form_completed_at timestamp with time zone,
  client_present boolean DEFAULT false,
  client_representative_name text,
  client_signature text, -- Base64 encoded signature or reference
  surveyor_signature text,
  form_status text DEFAULT 'in_progress', -- 'in_progress', 'completed', 'approved', 'rejected'
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_forms_pkey PRIMARY KEY (id),
  CONSTRAINT survey_forms_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT survey_forms_surveyor_id_fkey FOREIGN KEY (surveyor_id) REFERENCES public.user_profiles(id),
  CONSTRAINT survey_forms_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id)
);

-- Contractor assessment forms and quotes
CREATE TABLE public.contractor_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  damage_item_ids uuid[] DEFAULT '{}', -- Links to specific damage items
  assessment_type text DEFAULT 'quotation', -- 'quotation', 'feasibility', 'progress_report', 'completion_report'
  trade_speciality text, -- 'building', 'electrical', 'plumbing', 'roofing', 'flooring', etc.
  site_visit_date date,
  works_description text NOT NULL,
  methodology text,
  materials_specification text,
  labour_requirements text,
  equipment_requirements text,
  estimated_duration_days integer,
  proposed_start_date date,
  proposed_completion_date date,
  health_safety_method_statement text,
  insurance_requirements_met boolean DEFAULT false,
  qualifications_certificates_provided boolean DEFAULT false,
  subtotal_labour numeric DEFAULT 0,
  subtotal_materials numeric DEFAULT 0,
  subtotal_plant_equipment numeric DEFAULT 0,
  subtotal_other numeric DEFAULT 0,
  total_net_amount numeric NOT NULL,
  vat_rate numeric DEFAULT 20.0,
  vat_amount numeric NOT NULL,
  total_gross_amount numeric NOT NULL,
  payment_terms text,
  warranty_period_months integer DEFAULT 12,
  exclusions text,
  assumptions text,
  variations_policy text,
  quote_valid_until date,
  status text DEFAULT 'submitted', -- 'draft', 'submitted', 'under_review', 'accepted', 'rejected', 'superseded'
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  acceptance_notes text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contractor_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT contractor_assessments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT contractor_assessments_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.user_profiles(id),
  CONSTRAINT contractor_assessments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)
);

-- Reserve movements and tracking
CREATE TABLE public.reserve_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  reserve_id uuid NOT NULL,
  movement_type text NOT NULL, -- 'initial_setting', 'increase', 'decrease', 'transfer', 'release'
  category text, -- Which reserve category is affected
  amount numeric NOT NULL,
  reason text NOT NULL,
  reference_document text, -- Reference to survey, quote, invoice, etc.
  reference_id uuid, -- ID of related record
  authorized_by uuid,
  processed_by uuid,
  movement_date date DEFAULT CURRENT_DATE,
  accounting_period text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reserve_movements_pkey PRIMARY KEY (id),
  CONSTRAINT reserve_movements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT reserve_movements_reserve_id_fkey FOREIGN KEY (reserve_id) REFERENCES public.project_reserves(id),
  CONSTRAINT reserve_movements_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.user_profiles(id),
  CONSTRAINT reserve_movements_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.user_profiles(id)
);

-- Insert standard HOD codes for insurance claims
INSERT INTO public.hod_codes (code, description, category, sub_category, typical_rate_low, typical_rate_high, unit_type, notes) VALUES
-- Building Damage
('B001', 'Roof tiles - concrete/clay replacement', 'building', 'roofing', 45.00, 85.00, 'per_square_metre', 'Including battens and felt where necessary'),
('B002', 'Roof tiles - slate replacement', 'building', 'roofing', 120.00, 180.00, 'per_square_metre', 'Natural slate including fixings'),
('B003', 'Guttering and downpipes replacement', 'building', 'roofing', 35.00, 55.00, 'per_metre', 'PVC or cast iron systems'),
('B004', 'Windows - double glazed unit replacement', 'building', 'glazing', 180.00, 350.00, 'per_square_metre', 'Standard white UPVC frame'),
('B005', 'External doors - front door replacement', 'building', 'doors', 800.00, 2500.00, 'per_item', 'Including frame and ironmongery'),
('B006', 'Internal doors replacement', 'building', 'doors', 150.00, 400.00, 'per_item', 'Including hanging and ironmongery'),
('B007', 'Flooring - carpet replacement', 'building', 'flooring', 25.00, 65.00, 'per_square_metre', 'Standard domestic carpet and underlay'),
('B008', 'Flooring - laminate replacement', 'building', 'flooring', 35.00, 85.00, 'per_square_metre', 'Including underlay and installation'),
('B009', 'Wall finishes - plaster repair and redecoration', 'building', 'decorating', 45.00, 75.00, 'per_square_metre', 'Including preparation and two coats'),
('B010', 'Kitchen units replacement', 'building', 'kitchen', 350.00, 800.00, 'per_metre', 'Standard range including worktops'),
('B011', 'Bathroom suite replacement', 'building', 'bathroom', 1200.00, 3500.00, 'per_item', 'Basin, WC, bath/shower, tiling'),
('B012', 'Central heating radiator', 'building', 'heating', 180.00, 350.00, 'per_item', 'Including pipework and TRV'),

-- Contents
('C001', 'Furniture - three piece suite', 'contents', 'furniture', 800.00, 2500.00, 'per_item', 'Standard domestic suite'),
('C002', 'Furniture - dining table and chairs', 'contents', 'furniture', 400.00, 1200.00, 'per_item', 'Table plus 4-6 chairs'),
('C003', 'Furniture - bedroom furniture set', 'contents', 'furniture', 600.00, 1800.00, 'per_item', 'Bed, wardrobe, chest of drawers'),
('C004', 'Electrical - television', 'contents', 'electrical', 300.00, 1500.00, 'per_item', 'Based on screen size and features'),
('C005', 'Electrical - washing machine', 'contents', 'electrical', 350.00, 800.00, 'per_item', 'Standard domestic machine'),
('C006', 'Electrical - refrigerator/freezer', 'contents', 'electrical', 400.00, 1000.00, 'per_item', 'Fridge freezer combination'),
('C007', 'Clothing - adult wardrobe', 'contents', 'personal', 800.00, 2500.00, 'per_item', 'Complete seasonal wardrobe'),
('C008', 'Clothing - child wardrobe', 'contents', 'personal', 300.00, 800.00, 'per_item', 'Age-appropriate clothing'),
('C009', 'Books and media collection', 'contents', 'personal', 500.00, 2000.00, 'per_item', 'Personal library and media'),
('C010', 'Kitchen utensils and crockery', 'contents', 'kitchen', 200.00, 600.00, 'per_item', 'Complete kitchen equipment'),

-- Alternative Accommodation
('A001', 'Hotel accommodation', 'alternative', 'accommodation', 80.00, 200.00, 'per_night', 'Per room per night including breakfast'),
('A002', 'Rental property', 'alternative', 'accommodation', 150.00, 400.00, 'per_night', 'Self-catering accommodation'),
('A003', 'Storage costs', 'alternative', 'storage', 25.00, 65.00, 'per_week', 'Containerised storage per week'),
('A004', 'Removal costs', 'alternative', 'removal', 350.00, 800.00, 'per_item', 'Professional removal service'),
('A005', 'Excess travel costs', 'alternative', 'travel', 0.45, 0.65, 'per_mile', 'Additional travel costs per mile'),

-- Professional Fees
('P001', 'Loss Adjuster fees', 'professional_fees', 'adjusting', 8.0, 15.0, 'percentage', 'Percentage of settlement'),
('P002', 'Building Surveyor fees', 'professional_fees', 'surveying', 800.00, 2000.00, 'per_item', 'Survey and specification'),
('P003', 'Structural Engineer fees', 'professional_fees', 'engineering', 1200.00, 3000.00, 'per_item', 'Structural assessment and design'),
('P004', 'Architect fees', 'professional_fees', 'design', 5.0, 12.0, 'percentage', 'Percentage of building works'),
('P005', 'Quantity Surveyor fees', 'professional_fees', 'quantity_surveying', 2.0, 5.0, 'percentage', 'Cost planning and monitoring'),
('P006', 'Legal fees', 'professional_fees', 'legal', 200.00, 500.00, 'per_hour', 'Solicitor hourly rate'),
('P007', 'Project management fees', 'professional_fees', 'management', 3.0, 8.0, 'percentage', 'Project management and coordination');

-- Create indexes for performance
CREATE INDEX idx_damage_items_project_id ON public.damage_items(project_id);
CREATE INDEX idx_damage_items_hod_code_id ON public.damage_items(hod_code_id);
CREATE INDEX idx_damage_items_status ON public.damage_items(status);
CREATE INDEX idx_project_reserves_project_id ON public.project_reserves(project_id);
CREATE INDEX idx_project_reserves_status ON public.project_reserves(status);
CREATE INDEX idx_pc_sums_project_id ON public.pc_sums(project_id);
CREATE INDEX idx_survey_forms_project_id ON public.survey_forms(project_id);
CREATE INDEX idx_contractor_assessments_project_id ON public.contractor_assessments(project_id);
CREATE INDEX idx_reserve_movements_project_id ON public.reserve_movements(project_id);
CREATE INDEX idx_hod_codes_category ON public.hod_codes(category);
CREATE INDEX idx_hod_codes_is_active ON public.hod_codes(is_active);

-- Add RLS policies
ALTER TABLE public.hod_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_sums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allowing authenticated users to access their project data)
CREATE POLICY "Users can view HOD codes" ON public.hod_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage project reserves" ON public.project_reserves 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage damage items" ON public.damage_items 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage PC sums" ON public.pc_sums 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage scope variations" ON public.scope_variations 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage survey forms" ON public.survey_forms 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage contractor assessments" ON public.contractor_assessments 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage reserve movements" ON public.reserve_movements 
  FOR ALL TO authenticated USING (true);