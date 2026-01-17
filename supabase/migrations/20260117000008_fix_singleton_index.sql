-- Migration: Force Recreate Singleton Super Admin Index
-- Story 4.1: Admin Role Architecture
-- Objective: Ensure the singleton constraint exists definitively.

DROP INDEX IF EXISTS public.idx_singleton_super_admin;

CREATE UNIQUE INDEX idx_singleton_super_admin 
ON public.users (role) 
WHERE role = 'super_admin'::public.app_role;

COMMENT ON INDEX public.idx_singleton_super_admin IS 'Enforces that only one user in the entire system can be a super_admin.';
