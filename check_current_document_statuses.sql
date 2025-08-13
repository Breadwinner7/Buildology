-- Diagnostic script to check current document statuses before migration
-- Run this first to see what data exists

-- Check what approval_status values currently exist
SELECT 
  approval_status, 
  COUNT(*) as count,
  STRING_AGG(DISTINCT type, ', ') as document_types
FROM documents 
GROUP BY approval_status
ORDER BY count DESC;

-- Check for any NULL or problematic values
SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN approval_status IS NULL THEN 1 END) as null_approval_status,
  COUNT(CASE WHEN approval_status = '' THEN 1 END) as empty_approval_status,
  COUNT(CASE WHEN approval_status NOT IN ('pending', 'approved', 'rejected') THEN 1 END) as invalid_approval_status
FROM documents;

-- Show some example problematic records
SELECT id, type, approval_status, workflow_stage, uploaded_at::date
FROM documents 
WHERE approval_status NOT IN ('pending', 'approved', 'rejected') 
   OR approval_status IS NULL
LIMIT 10;

-- Document type breakdown
SELECT 
  type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT approval_status, ', ') as statuses_found
FROM documents 
GROUP BY type
ORDER BY count DESC;