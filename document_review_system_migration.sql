-- Migration: Add Document Review System Columns
-- Run this migration to add review functionality alongside existing approval system
-- Date: 2025-08-12

BEGIN;

-- Add review system columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS review_status text 
  CHECK (review_status = ANY (ARRAY['unreviewed'::text, 'reviewed'::text]));

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reviewed_by uuid;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS review_comments text;

-- Add foreign key constraint for reviewed_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_reviewed_by_fkey'
    AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents 
    ADD CONSTRAINT documents_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id);
  END IF;
END $$;

-- First, let's see what approval_status values exist
-- Update any existing invalid approval_status values to valid ones
UPDATE public.documents 
SET approval_status = 'available' 
WHERE approval_status IS NULL OR approval_status = '';

UPDATE public.documents 
SET approval_status = 'available' 
WHERE approval_status = 'auto_approved';

UPDATE public.documents 
SET approval_status = 'approved' 
WHERE approval_status NOT IN ('pending', 'approved', 'rejected', 'available');

-- Now update approval_status CHECK constraint to include new statuses
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_approval_status_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_approval_status_check 
  CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'available'::text]));

-- Set up review statuses for existing documents based on document type
-- Documents that require review (photos, reports, etc.) -> mark as unreviewed
UPDATE public.documents 
SET review_status = 'unreviewed'
WHERE type IN (
  'Photos - Before',
  'Photos - During', 
  'Photos - After',
  'Photos - Damage',
  'Report',
  'Technical Drawing',
  'Specification',
  'Correspondence',
  'Schedule',
  'Other'
)
AND review_status IS NULL;

-- Documents that require approval but are already approved -> keep as approved, no review needed
-- Documents that require approval and are pending -> keep as pending, no review status
-- This maintains the existing approval workflow

-- Set availability status for documents that should be immediately available
UPDATE public.documents 
SET approval_status = 'available'
WHERE type IN (
  'Photos - Before',
  'Photos - During', 
  'Photos - After',
  'Photos - Damage',
  'Report',
  'Technical Drawing',
  'Specification',
  'Correspondence',
  'Schedule',
  'Other'
)
AND approval_status = 'pending';

-- Create indexes for better performance on review queries
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON public.documents(review_status) 
  WHERE review_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by ON public.documents(reviewed_by) 
  WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_workflow_status ON public.documents(approval_status, review_status);

-- Add helpful comments
COMMENT ON COLUMN public.documents.review_status IS 'Review status for documents that need quality control review';
COMMENT ON COLUMN public.documents.reviewed_by IS 'User who reviewed the document for quality control';
COMMENT ON COLUMN public.documents.reviewed_at IS 'Timestamp when document was reviewed';
COMMENT ON COLUMN public.documents.review_comments IS 'Optional comments from reviewer';

-- Migration complete
COMMIT;

-- ===============================================================================
-- MIGRATION VERIFICATION QUERIES (run these after migration to verify success)
-- ===============================================================================

-- Verify new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'documents' 
-- AND column_name IN ('review_status', 'reviewed_by', 'reviewed_at', 'review_comments')
-- ORDER BY column_name;

-- Verify constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'documents' 
-- AND constraint_name LIKE '%review%' OR constraint_name LIKE '%approval_status%';

-- Verify indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'documents' 
-- AND indexname LIKE '%review%';