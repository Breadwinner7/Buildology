-- Create compliance and risk management tables
-- Run this in Supabase SQL Editor

-- Create compliance_checks table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL CHECK (check_type IN (
        'data_protection',
        'conduct_of_business', 
        'treating_customers_fairly',
        'complaints_handling',
        'financial_crime',
        'market_conduct',
        'prudential',
        'client_assets',
        'systems_and_controls',
        'skilled_persons_report'
    )),
    compliance_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (compliance_status IN (
        'compliant',
        'non_compliant', 
        'pending_review',
        'expired',
        'under_review'
    )),
    assessment_date DATE NOT NULL,
    expiry_date DATE,
    next_review_date DATE,
    assessed_by UUID REFERENCES user_profiles(id),
    risk_rating TEXT NOT NULL CHECK (risk_rating IN ('very_low', 'low', 'medium', 'high', 'critical')),
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
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN (
        'complaints',
        'data_breach',
        'conduct_risk', 
        'operational_risk',
        'financial_crime',
        'other'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    occurred_date DATE NOT NULL,
    reported_date DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    regulatory_impact TEXT NOT NULL CHECK (regulatory_impact IN ('very_low', 'low', 'medium', 'high', 'critical')),
    customer_impact TEXT,
    financial_impact DECIMAL(15,2),
    remedial_actions TEXT[],
    lessons_learned TEXT,
    preventive_measures TEXT[],
    reported_by UUID REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),
    fca_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create risk_assessments table if it doesn't exist
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    risk_category TEXT NOT NULL CHECK (risk_category IN (
        'operational',
        'conduct',
        'financial',
        'regulatory',
        'reputational',
        'strategic'
    )),
    risk_description TEXT NOT NULL,
    inherent_risk TEXT NOT NULL CHECK (inherent_risk IN ('very_low', 'low', 'medium', 'high', 'critical')),
    current_controls TEXT[],
    control_effectiveness TEXT NOT NULL DEFAULT 'not_assessed' CHECK (control_effectiveness IN (
        'effective',
        'partially_effective',
        'ineffective',
        'not_assessed'
    )),
    residual_risk TEXT NOT NULL CHECK (residual_risk IN ('very_low', 'low', 'medium', 'high', 'critical')),
    risk_appetite TEXT NOT NULL CHECK (risk_appetite IN ('very_low', 'low', 'medium', 'high', 'critical')),
    action_required BOOLEAN DEFAULT false,
    mitigation_actions TEXT[],
    risk_owner UUID REFERENCES user_profiles(id),
    review_frequency TEXT NOT NULL CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annually', 'annually')),
    next_review_date DATE NOT NULL,
    last_review_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_expiry ON compliance_checks(expiry_date);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_next_review ON compliance_checks(next_review_date);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_assessed_by ON compliance_checks(assessed_by);

CREATE INDEX IF NOT EXISTS idx_fca_events_project_id ON fca_reporting_events(project_id);
CREATE INDEX IF NOT EXISTS idx_fca_events_status ON fca_reporting_events(status);
CREATE INDEX IF NOT EXISTS idx_fca_events_severity ON fca_reporting_events(severity);
CREATE INDEX IF NOT EXISTS idx_fca_events_due_date ON fca_reporting_events(due_date);
CREATE INDEX IF NOT EXISTS idx_fca_events_reported_by ON fca_reporting_events(reported_by);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_project_id ON risk_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_category ON risk_assessments(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_residual_risk ON risk_assessments(residual_risk);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_next_review ON risk_assessments(next_review_date);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_owner ON risk_assessments(risk_owner);

-- Enable RLS on all tables
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fca_reporting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for compliance_checks
CREATE POLICY "Users can view compliance checks for accessible projects" ON compliance_checks
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            project_id IS NULL OR
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.id = compliance_checks.project_id
            )
        )
    );

CREATE POLICY "Users can create compliance checks" ON compliance_checks
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND assessed_by = auth.uid()
    );

CREATE POLICY "Users can update compliance checks they created" ON compliance_checks
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            assessed_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() 
                AND up.role IN ('super_admin', 'claims_manager', 'claims_director')
            )
        )
    );

-- Create RLS policies for fca_reporting_events  
CREATE POLICY "Users can view FCA events for accessible projects" ON fca_reporting_events
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            project_id IS NULL OR
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.id = fca_reporting_events.project_id
            )
        )
    );

CREATE POLICY "Users can create FCA events" ON fca_reporting_events
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND reported_by = auth.uid()
    );

CREATE POLICY "Users can update FCA events they reported or are assigned to" ON fca_reporting_events
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            reported_by = auth.uid() OR
            assigned_to = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() 
                AND up.role IN ('super_admin', 'claims_manager', 'claims_director')
            )
        )
    );

-- Create RLS policies for risk_assessments
CREATE POLICY "Users can view risk assessments for accessible projects" ON risk_assessments
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            project_id IS NULL OR
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.id = risk_assessments.project_id
            )
        )
    );

CREATE POLICY "Users can create risk assessments" ON risk_assessments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Risk owners and managers can update risk assessments" ON risk_assessments
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            risk_owner = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() 
                AND up.role IN ('super_admin', 'claims_manager', 'claims_director')
            )
        )
    );

-- Insert some sample data for testing (only if user_profiles exist)
-- Note: Uncomment these lines after ensuring user_profiles table exists and has data

/*
INSERT INTO compliance_checks (
    check_type, assessment_date, assessed_by, risk_rating, findings, recommendations, action_required
) VALUES 
(
    'data_protection',
    CURRENT_DATE - INTERVAL '30 days',
    (SELECT id FROM user_profiles LIMIT 1),
    'medium',
    'GDPR compliance assessment completed. Most processes are compliant with minor gaps in documentation.',
    'Update privacy notices and improve data subject request procedures.',
    true
),
(
    'treating_customers_fairly',
    CURRENT_DATE - INTERVAL '60 days', 
    (SELECT id FROM user_profiles LIMIT 1),
    'low',
    'TCF principles are well embedded across customer-facing processes.',
    'Continue current practices with regular monitoring.',
    false
);

INSERT INTO fca_reporting_events (
    event_type, event_category, severity, description, occurred_date, due_date, 
    regulatory_impact, reported_by
) VALUES
(
    'Customer Data Breach',
    'data_breach',
    'high',
    'Personal data of 150 customers was inadvertently disclosed due to email system misconfiguration.',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '23 days',
    'high',
    (SELECT id FROM user_profiles LIMIT 1)
),
(
    'Complaint Handling Delay',
    'complaints',
    'medium', 
    'Customer complaint response exceeded 8-week deadline due to system issues.',
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '16 days',
    'medium',
    (SELECT id FROM user_profiles LIMIT 1)
);
*/

-- Success message
SELECT 'Compliance and risk management tables created successfully!' as status;