-- Fix RLS policies for compliance tables

-- FCA Reporting Events RLS Policy
DROP POLICY IF EXISTS "Users can insert their own FCA events" ON fca_reporting_events;
DROP POLICY IF EXISTS "Users can view FCA events" ON fca_reporting_events;
DROP POLICY IF EXISTS "Users can update FCA events" ON fca_reporting_events;

CREATE POLICY "Users can insert FCA events" ON fca_reporting_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view FCA events" ON fca_reporting_events
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update FCA events" ON fca_reporting_events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Compliance Checks RLS Policy
DROP POLICY IF EXISTS "Users can insert compliance checks" ON compliance_checks;
DROP POLICY IF EXISTS "Users can view compliance checks" ON compliance_checks;
DROP POLICY IF EXISTS "Users can update compliance checks" ON compliance_checks;

CREATE POLICY "Users can insert compliance checks" ON compliance_checks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view compliance checks" ON compliance_checks
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update compliance checks" ON compliance_checks
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Risk Assessments RLS Policy (if the table exists)
DROP POLICY IF EXISTS "Users can insert risk assessments" ON risk_assessments;
DROP POLICY IF EXISTS "Users can view risk assessments" ON risk_assessments;
DROP POLICY IF EXISTS "Users can update risk assessments" ON risk_assessments;

CREATE POLICY "Users can insert risk assessments" ON risk_assessments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view risk assessments" ON risk_assessments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update risk assessments" ON risk_assessments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Make sure RLS is enabled on all tables
ALTER TABLE fca_reporting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;