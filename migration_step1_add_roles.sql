-- STEP 1: Add new roles to user_role_enum
-- Run this FIRST and commit before running step 2

-- Add new role values to the enum
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'contractor';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'surveyor';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'handler';

-- Display current enum values to confirm
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
ORDER BY enumsortorder;