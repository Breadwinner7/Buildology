-- Fix infinite recursion in documents table RLS policy
-- Run this in your Supabase SQL Editor

-- First, disable RLS temporarily to see existing policies
SET session_replication_role = replica;

-- Drop all existing policies on documents table
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON documents;
DROP POLICY IF EXISTS "Enable update for document owners" ON documents;
DROP POLICY IF EXISTS "Enable delete for document owners" ON documents;

-- Re-enable normal replication
SET session_replication_role = DEFAULT;

-- Create new, simple RLS policies without recursion
CREATE POLICY "documents_select_policy" ON documents
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND (
            -- User can see documents they uploaded
            user_id = auth.uid() 
            OR 
            -- Or if they have access to the project (simplified check)
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.id = documents.project_id
            )
        )
    );

CREATE POLICY "documents_insert_policy" ON documents
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

CREATE POLICY "documents_update_policy" ON documents
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() 
                AND up.role IN ('super_admin', 'claims_manager', 'claims_director')
            )
        )
    );

CREATE POLICY "documents_delete_policy" ON documents
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() 
                AND up.role IN ('super_admin', 'claims_manager', 'claims_director')
            )
        )
    );

-- Ensure RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Test query to verify it works
SELECT COUNT(*) as document_count FROM documents;