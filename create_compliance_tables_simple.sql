-- Simple compliance tables creation script
-- Run this in Supabase SQL Editor

-- Create compliance_checks table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    organisation_id UUID,
    check_type TEXT NOT NULL,
    compliance_status TEXT NOT NULL DEFAULT 'pending_review',
    assessment_date DATE NOT NULL,
    expiry_date DATE,
    next_review_date DATE,
    assessed_by UUID,
    risk_rating TEXT NOT NULL,
    findings TEXT NOT NULL,
    recommendations TEXT,
    action_required BOOLEAN DEFAULT false,
    remedial_actions TEXT[],
    evidence_documents TEXT[],
    regulatory_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create FCA reporting events table if it doesn't exist
CREATE TABLE IF NOT EXISTS fca_reporting_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    organisation_id UUID,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    occurred_date DATE NOT NULL,
    reported_date DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    regulatory_impact TEXT NOT NULL,
    customer_impact TEXT,
    financial_impact DECIMAL(15,2),
    remedial_actions TEXT[],
    lessons_learned TEXT,
    preventive_measures TEXT[],
    reported_by UUID,
    assigned_to UUID,
    fca_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create risk_assessments table if it doesn't exist
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    organisation_id UUID,
    risk_category TEXT NOT NULL,
    risk_description TEXT NOT NULL,
    inherent_risk TEXT NOT NULL,
    current_controls TEXT[],
    control_effectiveness TEXT NOT NULL DEFAULT 'not_assessed',
    residual_risk TEXT NOT NULL,
    risk_appetite TEXT NOT NULL,
    action_required BOOLEAN DEFAULT false,
    mitigation_actions TEXT[],
    risk_owner UUID,
    review_frequency TEXT NOT NULL,
    next_review_date DATE NOT NULL,
    last_review_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_assessed_by ON compliance_checks(assessed_by);

CREATE INDEX IF NOT EXISTS idx_fca_events_project_id ON fca_reporting_events(project_id);
CREATE INDEX IF NOT EXISTS idx_fca_events_status ON fca_reporting_events(status);
CREATE INDEX IF NOT EXISTS idx_fca_events_reported_by ON fca_reporting_events(reported_by);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_project_id ON risk_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_category ON risk_assessments(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_owner ON risk_assessments(risk_owner);

-- Enable RLS
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fca_reporting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for authenticated users initially)
CREATE POLICY "Allow authenticated users to access compliance_checks" ON compliance_checks
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to access fca_reporting_events" ON fca_reporting_events
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to access risk_assessments" ON risk_assessments
    FOR ALL USING (auth.uid() IS NOT NULL);

SELECT 'Simple compliance tables created successfully!' as status;