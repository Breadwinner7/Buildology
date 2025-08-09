-- PostgreSQL Concurrent Index Creation Script
-- Run this script with: psql -d your_database -f create_indexes.sql
-- Note: Each CREATE INDEX CONCURRENTLY must run outside of a transaction

-- Enable error handling
\set ON_ERROR_STOP on

-- Display progress
\echo 'Starting concurrent index creation...'
\echo 'This may take some time depending on table sizes.'

-- Composite indexes for common query patterns
\echo 'Creating composite indexes...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_stage_org 
ON projects(status, current_stage, organisation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_type_date 
ON documents(project_id, type, uploaded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_status_due 
ON tasks(assigned_to, status, due_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_created 
ON messages(thread_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role_active 
ON user_profiles(role, is_active) WHERE is_active = true;

-- Partial indexes for active records only
\echo 'Creating partial indexes for active records...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_projects 
ON projects(current_stage, created_at) 
WHERE status NOT IN ('closed', 'cancelled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_approvals 
ON approval_requests(assigned_to, created_at)
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_overdue_tasks 
ON tasks(assigned_to, due_date)
WHERE status != 'completed' AND due_date < CURRENT_DATE;

-- GIN indexes for JSONB and array columns
\echo 'Creating GIN indexes for JSONB and array columns...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_specialisms 
ON user_profiles USING gin(specialisms);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_vulnerability_flags 
ON projects USING gin(vulnerability_flags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_tags 
ON documents USING gin(tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_metadata 
ON messages USING gin(metadata);

-- Full-text search optimization
\echo 'Creating full-text search indexes...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_fulltext 
ON projects 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(contact_name, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_fulltext 
ON documents
USING gin(to_tsvector('english', name || ' ' || COALESCE(note, '')));

-- Expression indexes for computed values
\echo 'Creating expression indexes...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_age 
ON projects((EXTRACT(DAYS FROM NOW() - created_at)));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_full_name 
ON user_profiles((first_name || ' ' || surname));

-- Display completion message
\echo 'Index creation completed successfully!'

-- Optional: Display index information
\echo 'Checking created indexes...'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;