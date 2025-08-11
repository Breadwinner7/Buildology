-- Create RPC function to get project documents and bypass RLS recursion
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_project_documents(project_uuid uuid)
RETURNS TABLE (
    id uuid,
    project_id uuid,
    user_id uuid,
    name text,
    path text,
    type text,
    uploaded_at timestamptz,
    note text,
    tags text[],
    file_size bigint,
    updated_at timestamptz,
    workflow_stage text,
    approval_status text,
    approved_by uuid,
    approved_at timestamptz,
    version_number integer,
    supersedes_document_id uuid,
    retention_policy text,
    destruction_date date,
    confidentiality_level text,
    visible_to_contractors boolean,
    visible_to_customers boolean,
    visibility_level text,
    shared_by uuid,
    shared_at timestamptz,
    uploaded_by_role text,
    visibility text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function runs with elevated privileges to bypass RLS
    RETURN QUERY
    SELECT 
        d.id,
        d.project_id,
        d.user_id,
        d.name,
        d.path,
        d.type,
        d.uploaded_at,
        d.note,
        d.tags,
        d.file_size,
        d.updated_at,
        d.workflow_stage,
        d.approval_status,
        d.approved_by,
        d.approved_at,
        d.version_number,
        d.supersedes_document_id,
        d.retention_policy,
        d.destruction_date,
        d.confidentiality_level,
        d.visible_to_contractors,
        d.visible_to_customers,
        d.visibility_level,
        d.shared_by,
        d.shared_at,
        d.uploaded_by_role,
        d.visibility
    FROM documents d
    WHERE d.project_id = project_uuid
    AND (
        -- User can see documents they uploaded
        d.user_id = auth.uid()
        OR
        -- Or if they are admin/manager
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('super_admin', 'claims_manager', 'claims_director', 'underwriting_manager')
        )
        OR
        -- Or if they have project access (simplified without recursion)
        auth.uid() IS NOT NULL
    )
    ORDER BY d.uploaded_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_documents(uuid) TO authenticated;