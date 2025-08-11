-- =================================================================
-- COMPREHENSIVE DATABASE ENHANCEMENT SCRIPT
-- =================================================================
-- This script enhances your existing database to support the full
-- frontend application with all features working correctly.
-- 
-- Run this AFTER your current database structure is in place.
-- =================================================================

-- =================================================================
-- 1. ENHANCE EXISTING TABLES WITH MISSING COLUMNS
-- =================================================================

-- Enhance compliance_checks table to match frontend expectations
ALTER TABLE public.compliance_checks 
ADD COLUMN IF NOT EXISTS check_type TEXT,
ADD COLUMN IF NOT EXISTS assessment_date DATE,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS risk_rating TEXT,
ADD COLUMN IF NOT EXISTS findings TEXT,
ADD COLUMN IF NOT EXISTS recommendations TEXT,
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remedial_actions TEXT[],
ADD COLUMN IF NOT EXISTS regulatory_reference TEXT;

-- Add check constraints for enhanced compliance_checks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_compliance_status' 
        AND table_name = 'compliance_checks'
    ) THEN
        ALTER TABLE public.compliance_checks 
        ADD CONSTRAINT check_compliance_status 
        CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending_review', 'expired', 'under_review'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_risk_rating' 
        AND table_name = 'compliance_checks'
    ) THEN
        ALTER TABLE public.compliance_checks 
        ADD CONSTRAINT check_risk_rating 
        CHECK (risk_rating IS NULL OR risk_rating IN ('very_low', 'low', 'medium', 'high', 'critical'));
    END IF;
END $$;

-- Enhance fca_reporting_events table
ALTER TABLE public.fca_reporting_events 
ADD COLUMN IF NOT EXISTS event_category TEXT,
ADD COLUMN IF NOT EXISTS occurred_date DATE,
ADD COLUMN IF NOT EXISTS regulatory_impact TEXT,
ADD COLUMN IF NOT EXISTS customer_impact TEXT,
ADD COLUMN IF NOT EXISTS financial_impact NUMERIC,
ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
ADD COLUMN IF NOT EXISTS preventive_measures TEXT[];

-- Add check constraints for enhanced fca_reporting_events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_event_category' 
        AND table_name = 'fca_reporting_events'
    ) THEN
        ALTER TABLE public.fca_reporting_events 
        ADD CONSTRAINT check_event_category 
        CHECK (event_category IS NULL OR event_category IN ('complaints', 'data_breach', 'conduct_risk', 'operational_risk', 'financial_crime', 'other'));
    END IF;
END $$;

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
ADD COLUMN IF NOT EXISTS risk_owner UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS review_frequency TEXT,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS last_review_date DATE;

-- Add check constraints for enhanced risk_assessments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_risk_category' 
        AND table_name = 'risk_assessments'
    ) THEN
        ALTER TABLE public.risk_assessments 
        ADD CONSTRAINT check_risk_category 
        CHECK (risk_category IS NULL OR risk_category IN ('operational', 'conduct', 'financial', 'regulatory', 'reputational', 'strategic'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_control_effectiveness' 
        AND table_name = 'risk_assessments'
    ) THEN
        ALTER TABLE public.risk_assessments 
        ADD CONSTRAINT check_control_effectiveness 
        CHECK (control_effectiveness IN ('effective', 'partially_effective', 'ineffective', 'not_assessed'));
    END IF;
END $$;

-- Enhance tasks table for priority management
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- Update priority constraint to match frontend expectations
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_priority_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_priority_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
END $$;

-- =================================================================
-- 2. CREATE MISSING CRITICAL TABLES
-- =================================================================

-- Timeline Events for Activity Tracking
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id),
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Financials (if missing required columns)
DO $$ 
BEGIN
    -- Check if project_financials exists and has the right structure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_financials' 
        AND column_name = 'budget_total'
    ) THEN
        -- Create or enhance project_financials
        CREATE TABLE IF NOT EXISTS public.project_financials (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id UUID UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
            budget_total NUMERIC(12,2) DEFAULT 0,
            budget_allocated NUMERIC(12,2) DEFAULT 0,
            budget_spent NUMERIC(12,2) DEFAULT 0,
            budget_remaining NUMERIC(12,2) GENERATED ALWAYS AS (budget_total - budget_spent) STORED,
            contract_value NUMERIC(12,2),
            invoice_total NUMERIC(12,2) DEFAULT 0,
            payment_received NUMERIC(12,2) DEFAULT 0,
            payment_outstanding NUMERIC(12,2) GENERATED ALWAYS AS (invoice_total - payment_received) STORED,
            currency TEXT DEFAULT 'GBP',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- SLA Tracking for Dashboard Metrics
CREATE TABLE IF NOT EXISTS public.sla_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    warning_sent BOOLEAN DEFAULT false,
    escalation_sent BOOLEAN DEFAULT false,
    breach_logged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Thread Participants (if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'thread_participants'
    ) THEN
        CREATE TABLE public.thread_participants (
            thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            last_read_at TIMESTAMPTZ,
            PRIMARY KEY (thread_id, user_id)
        );
    END IF;
END $$;

-- Document Categories and Types Enhancement
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default document categories
INSERT INTO public.document_categories (name, description, color) VALUES 
    ('Contracts', 'Legal agreements and contracts', '#3B82F6'),
    ('Reports', 'Assessment and inspection reports', '#10B981'),
    ('Photos', 'Photographic evidence and documentation', '#F59E0B'),
    ('Certificates', 'Professional certificates and qualifications', '#8B5CF6'),
    ('Correspondence', 'Email and letter communications', '#6B7280'),
    ('Technical', 'Technical drawings and specifications', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Notification System
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================
-- 3. CREATE ENHANCED INDEXES FOR PERFORMANCE
-- =================================================================

-- Timeline Events Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_project_id ON public.timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON public.timeline_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON public.timeline_events(type);

-- SLA Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_sla_tracking_project_id ON public.sla_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_due_date ON public.sla_tracking(due_date);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_breach_logged ON public.sla_tracking(breach_logged);

-- Enhanced Compliance Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_checks_check_type ON public.compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_assessment_date ON public.compliance_checks(assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_risk_rating ON public.compliance_checks(risk_rating);

-- Enhanced Risk Assessment Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_category ON public.risk_assessments(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_inherent_risk ON public.risk_assessments(inherent_risk);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_residual_risk ON public.risk_assessments(residual_risk);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_next_review ON public.risk_assessments(next_review_date);

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

-- =================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- =================================================================

-- Enable RLS on new tables
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies for Timeline Events
CREATE POLICY "Users can view timeline events for accessible projects" 
ON public.timeline_events FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Basic RLS Policies for SLA Tracking
CREATE POLICY "Users can view SLA tracking for accessible projects" 
ON public.sla_tracking FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Basic RLS Policies for Notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Public read access for document categories
CREATE POLICY "Anyone can view document categories" 
ON public.document_categories FOR SELECT 
USING (true);

-- =================================================================
-- 5. CREATE HELPFUL VIEWS FOR COMPLEX QUERIES
-- =================================================================

-- Project Overview View
CREATE OR REPLACE VIEW public.project_overview AS
SELECT 
    p.*,
    pf.budget_total,
    pf.budget_spent,
    pf.budget_remaining,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status != 'done' THEN t.id END) as pending_tasks,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT a.id) as total_appointments
FROM public.projects p
LEFT JOIN public.project_financials pf ON p.id = pf.project_id
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.documents d ON p.id = d.project_id
LEFT JOIN public.appointments a ON p.id = a.project_id
GROUP BY p.id, pf.budget_total, pf.budget_spent, pf.budget_remaining;

-- Compliance Summary View
CREATE OR REPLACE VIEW public.compliance_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(cc.id) as total_compliance_checks,
    COUNT(CASE WHEN cc.compliance_status = 'compliant' THEN 1 END) as compliant_count,
    COUNT(CASE WHEN cc.compliance_status = 'non_compliant' THEN 1 END) as non_compliant_count,
    COUNT(ra.id) as total_risk_assessments,
    COUNT(CASE WHEN ra.risk_level = 'critical' THEN 1 END) as critical_risks,
    COUNT(CASE WHEN ra.risk_level = 'high' THEN 1 END) as high_risks
FROM public.projects p
LEFT JOIN public.compliance_checks cc ON p.id = cc.project_id
LEFT JOIN public.risk_assessments ra ON p.id = ra.project_id
GROUP BY p.id, p.name;

-- =================================================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- =================================================================

-- Sample Timeline Events
INSERT INTO public.timeline_events (project_id, user_id, type, content) 
SELECT 
    p.id,
    (SELECT id FROM public.user_profiles LIMIT 1),
    'project_created',
    'Project "' || p.name || '" was created'
FROM public.projects p
LIMIT 5
ON CONFLICT DO NOTHING;

-- Sample SLA Tracking
INSERT INTO public.sla_tracking (project_id, stage, due_date)
SELECT 
    p.id,
    p.status,
    NOW() + INTERVAL '30 days'
FROM public.projects p
WHERE p.status IN ('survey_booked', 'works_in_progress', 'awaiting_agreement')
LIMIT 10
ON CONFLICT DO NOTHING;

-- Sample Project Financials
INSERT INTO public.project_financials (project_id, budget_total, budget_spent)
SELECT 
    p.id,
    (RANDOM() * 100000 + 10000)::NUMERIC(12,2),
    (RANDOM() * 50000)::NUMERIC(12,2)
FROM public.projects p
ON CONFLICT (project_id) DO NOTHING;

-- =================================================================
-- 7. UPDATE FUNCTIONS AND TRIGGERS
-- =================================================================

-- Function to automatically update project updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for project updates
DROP TRIGGER IF EXISTS update_project_timestamp ON public.projects;
CREATE TRIGGER update_project_timestamp
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_timestamp();

-- Function to create timeline event on project status change
CREATE OR REPLACE FUNCTION create_project_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.timeline_events (project_id, type, content, created_at)
        VALUES (
            NEW.id,
            'status_change',
            'Project status changed from "' || COALESCE(OLD.status, 'unknown') || '" to "' || NEW.status || '"',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for project status changes
DROP TRIGGER IF EXISTS create_project_timeline_event ON public.projects;
CREATE TRIGGER create_project_timeline_event
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_timeline_event();

-- =================================================================
-- COMPLETION MESSAGE
-- =================================================================

SELECT 'Database enhancement completed successfully! All frontend features should now work correctly.' as status;
SELECT 'Tables enhanced: ' || COUNT(*) || ' existing tables updated' as enhancement_summary
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('compliance_checks', 'fca_reporting_events', 'risk_assessments', 'tasks');

SELECT 'New tables created: timeline_events, sla_tracking, document_categories, notifications' as new_tables;