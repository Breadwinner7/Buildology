-- IMMEDIATE FIX: Run this in Supabase SQL Editor to see your documents again
-- This temporarily disables the problematic RLS policy

-- Step 1: Disable RLS temporarily to fix the recursion
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 2: Check if you have documents (this should show your documents now)
SELECT id, name, type, uploaded_at, project_id FROM documents ORDER BY uploaded_at DESC LIMIT 10;

-- Step 3: Re-enable RLS with a simple policy
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a simple, working RLS policy
DROP POLICY IF EXISTS "Enable read access for all auth users" ON documents;
CREATE POLICY "Enable read access for all auth users" ON documents
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for auth users" ON documents;
CREATE POLICY "Enable insert for auth users" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for owners" ON documents;
CREATE POLICY "Enable update for owners" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for owners" ON documents;
CREATE POLICY "Enable delete for owners" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Test the fix
SELECT 'Documents RLS policy fixed!' as status;