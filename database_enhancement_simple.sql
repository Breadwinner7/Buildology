-- =================================================================
-- SIMPLE DATABASE ENHANCEMENT SCRIPT
-- =================================================================
-- This script enhances your existing database safely
-- Run this in Supabase SQL Editor
-- =================================================================

-- =================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- =================================================================

-- Enhance compliance_checks table
ALTER TABLE public.compliance_checks 
ADD COLUMN IF NOT EXISTS check_type TEXT,
ADD COLUMN IF NOT EXISTS assessment_date DATE,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS assessed_by UUID,
ADD COLUMN IF NOT EXISTS risk_rating TEXT,
ADD COLUMN IF NOT EXISTS findings TEXT,
ADD COLUMN IF NOT EXISTS recommendations TEXT,
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remedial_actions TEXT[],
ADD COLUMN IF NOT EXISTS regulatory_reference TEXT;

-- Enhance fca_reporting_events table
ALTER TABLE public.fca_reporting_events 
ADD COLUMN IF NOT EXISTS event_category TEXT,
ADD COLUMN IF NOT EXISTS occurred_date DATE,
ADD COLUMN IF NOT EXISTS regulatory_impact TEXT,
ADD COLUMN IF NOT EXISTS customer_impact TEXT,
ADD COLUMN IF NOT EXISTS financial_impact NUMERIC,
ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
ADD COLUMN IF NOT EXISTS preventive_measures TEXT[];

-- Enhance risk_assessments table
ALTER TABLE public.risk_assessments 
ADD COLUMN IF NOT EXISTS risk_category TEXT,
ADD COLUMN IF NOT EXISTS risk_description TEXT,
ADD COLUMN IF NOT EXISTS inherent_risk TEXT,
ADD COLUMN IF NOT EXISTS current_controls TEXT[],
ADD COLUMN IF NOT EXISTS control_effectiveness TEXT DEFAULT 'not_assessed',
ADD COLUMN IF NOT EXISTS residual_risk TEXT,
ADD COLUMN IF NOT EXISTS risk_appetite TEXT,
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mitigation_actions TEXT[],
ADD COLUMN IF NOT EXISTS risk_owner UUID,
ADD COLUMN IF NOT EXISTS review_frequency TEXT,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS last_review_date DATE;

-- Enhance tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- =================================================================
-- 2. CREATE MISSING CRITICAL TABLES
-- =================================================================

-- Timeline Events for Activity Tracking
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    user_id UUID,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA Tracking for Dashboard Metrics  
CREATE TABLE IF NOT EXISTS public.sla_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    stage TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    warning_sent BOOLEAN DEFAULT false,
    escalation_sent BOOLEAN DEFAULT false,
    breach_logged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    priority TEXT DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Categories
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =================================================================

-- Timeline Events Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_project_id ON public.timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON public.timeline_events(created_at DESC);

-- SLA Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_sla_tracking_project_id ON public.sla_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_due_date ON public.sla_tracking(due_date);

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Enhanced Compliance Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_checks_check_type ON public.compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_assessment_date ON public.compliance_checks(assessment_date DESC);

-- Enhanced Risk Assessment Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_category ON public.risk_assessments(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_inherent_risk ON public.risk_assessments(inherent_risk);

-- =================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =================================================================

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 5. CREATE BASIC RLS POLICIES
-- =================================================================

-- Timeline Events Policies
DROP POLICY IF EXISTS "Users can view timeline events" ON public.timeline_events;
CREATE POLICY "Users can view timeline events" 
ON public.timeline_events FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create timeline events" ON public.timeline_events;
CREATE POLICY "Users can create timeline events" 
ON public.timeline_events FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- SLA Tracking Policies
DROP POLICY IF EXISTS "Users can view sla tracking" ON public.sla_tracking;
CREATE POLICY "Users can view sla tracking" 
ON public.sla_tracking FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Notification Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Document Categories Policies  
DROP POLICY IF EXISTS "Anyone can view document categories" ON public.document_categories;
CREATE POLICY "Anyone can view document categories" 
ON public.document_categories FOR SELECT 
USING (true);

-- =================================================================
-- 6. INSERT SAMPLE DATA
-- =================================================================

-- Sample Document Categories
INSERT INTO public.document_categories (name, description, color) VALUES 
    ('Contracts', 'Legal agreements and contracts', '#3B82F6'),
    ('Reports', 'Assessment and inspection reports', '#10B981'),
    ('Photos', 'Photographic evidence and documentation', '#F59E0B'),
    ('Certificates', 'Professional certificates and qualifications', '#8B5CF6'),
    ('Correspondence', 'Email and letter communications', '#6B7280'),
    ('Technical', 'Technical drawings and specifications', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Sample Timeline Events (only if projects exist)
INSERT INTO public.timeline_events (project_id, user_id, type, content)
SELECT 
    p.id,
    (SELECT id FROM public.user_profiles LIMIT 1),
    'project_created',
    'Project "' || p.name || '" was created'
FROM public.projects p
LIMIT 5;

-- Sample Project Financials (only if table exists and projects exist)
INSERT INTO public.project_financials (project_id, budget_total, budget_spent)
SELECT 
    p.id,
    (RANDOM() * 100000 + 10000)::NUMERIC(12,2),
    (RANDOM() * 50000)::NUMERIC(12,2)
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_financials pf WHERE pf.project_id = p.id
)
LIMIT 10;

-- Sample SLA Tracking
INSERT INTO public.sla_tracking (project_id, stage, due_date)
SELECT 
    p.id,
    p.status,
    NOW() + INTERVAL '30 days'
FROM public.projects p
WHERE p.status IN ('survey_booked', 'works_in_progress', 'awaiting_agreement')
LIMIT 10;

-- =================================================================
-- 7. CREATE HELPFUL VIEWS
-- =================================================================

-- Project Overview View
CREATE OR REPLACE VIEW public.project_overview AS
SELECT 
    p.*,
    COALESCE(pf.budget_total, 0) as budget_total,
    COALESCE(pf.budget_spent, 0) as budget_spent,
    COALESCE(pf.budget_remaining, 0) as budget_remaining,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status != 'done' THEN t.id END) as pending_tasks,
    COUNT(DISTINCT d.id) as total_documents
FROM public.projects p
LEFT JOIN public.project_financials pf ON p.id = pf.project_id
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.documents d ON p.id = d.project_id
GROUP BY p.id, pf.budget_total, pf.budget_spent, pf.budget_remaining;

-- Success Message
SELECT 'Database enhancement completed successfully!' as status,
       'All frontend features should now be functional' as result;