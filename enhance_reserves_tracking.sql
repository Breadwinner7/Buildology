-- Enhance reserves tracking with estimated vs actual reserves
-- This adds columns to track both estimated and actual reserves for each category

-- Add estimated vs actual columns to project_reserves
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS estimated_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_contents_reserve numeric DEFAULT 0, 
ADD COLUMN IF NOT EXISTS estimated_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_total_reserve_amount numeric DEFAULT 0;

-- Rename existing columns to be clearer about actual reserves
-- This is safer than dropping and recreating
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS actual_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_contents_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_total_reserve_amount numeric DEFAULT 0;

-- Copy existing data to actual columns if they haven't been copied yet
UPDATE public.project_reserves 
SET 
  actual_building_reserve = building_reserve,
  actual_contents_reserve = contents_reserve,
  actual_consequential_reserve = consequential_reserve,
  actual_alternative_accommodation_reserve = alternative_accommodation_reserve,
  actual_professional_fees_reserve = professional_fees_reserve,
  actual_total_reserve_amount = total_reserve_amount
WHERE actual_building_reserve = 0 AND building_reserve > 0;

-- Add variance tracking columns
ALTER TABLE public.project_reserves 
ADD COLUMN IF NOT EXISTS variance_building_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_contents_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_consequential_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_alternative_accommodation_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_professional_fees_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_total_reserve_amount numeric DEFAULT 0;

-- Add reserve history table for tracking changes over time
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

-- Create function to calculate and update variances
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic variance calculation
DROP TRIGGER IF EXISTS trigger_update_reserve_variances ON public.project_reserves;
CREATE TRIGGER trigger_update_reserve_variances
  BEFORE INSERT OR UPDATE ON public.project_reserves
  FOR EACH ROW
  EXECUTE FUNCTION update_reserve_variances();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reserve_history_project_id ON public.reserve_history(project_id);
CREATE INDEX IF NOT EXISTS idx_reserve_history_reserve_id ON public.reserve_history(reserve_id);
CREATE INDEX IF NOT EXISTS idx_reserve_history_category ON public.reserve_history(category);
CREATE INDEX IF NOT EXISTS idx_reserve_history_change_type ON public.reserve_history(change_type);

-- Enable RLS on reserve_history
ALTER TABLE public.reserve_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for reserve_history
CREATE POLICY "Users can manage reserve history" ON public.reserve_history 
  FOR ALL TO authenticated USING (true);

-- Update existing reserves to have estimated values equal to actual values initially
UPDATE public.project_reserves 
SET 
  estimated_building_reserve = COALESCE(building_reserve, 0),
  estimated_contents_reserve = COALESCE(contents_reserve, 0),
  estimated_consequential_reserve = COALESCE(consequential_reserve, 0),
  estimated_alternative_accommodation_reserve = COALESCE(alternative_accommodation_reserve, 0),
  estimated_professional_fees_reserve = COALESCE(professional_fees_reserve, 0)
WHERE estimated_building_reserve = 0;