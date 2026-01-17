-- Migration: Enforce Singleton Super Admin
-- Story 4.1: Admin Role Architecture
-- Objective: Ensure only one user can hold the 'super_admin' role at any time.

DO $$
BEGIN
  IF (SELECT count(*) FROM public.users WHERE role = 'super_admin'::public.app_role) > 1 THEN
    RAISE EXCEPTION 'Migration Failed: Multiple super_admin users found. Please resolve manually before applying constraint.';
  END IF;
END $$;


-- 1. Create a unique partial index on the users table
-- This physically prevents a second row from having role = 'super_admin'
CREATE UNIQUE INDEX IF NOT EXISTS idx_singleton_super_admin 
ON public.users (role) 
WHERE role = 'super_admin'::public.app_role;

-- 2. Add a comment explaining the constraint
COMMENT ON INDEX public.idx_singleton_super_admin IS 'Enforces that only one user in the entire system can be a super_admin.';
