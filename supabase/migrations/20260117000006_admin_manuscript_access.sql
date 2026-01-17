-- Migration: Grant Admins Global Read Access to Manuscripts
-- Story 4.1: Admin Role Architecture
-- Objective: Allow "admin" and "super_admin" roles to view all manuscripts for content oversight.

-- 1. Helper function to check if user has global admin privileges
-- Note: 'admin' role in this context refers to the system-wide admin capability defined in AC 4.1.3
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

-- 2. Add RLS Policy for Global Admin Read Access
-- This runs in addition to existing account-based policies.
-- If existing policies are restrictive, we might need to check if they conflict, 
-- but generally RLS adds permissions (OR logic) unless they are RESTRICTIVE policies.
-- The existing policies are mostly PERMISSIVE.

CREATE POLICY "Global Admins can view all manuscripts"
ON public.manuscripts
FOR SELECT
USING (public.is_global_admin());

-- 3. Add similar policy for Manuscript Versions
CREATE POLICY "Global Admins can view all versions"
ON public.manuscript_versions
FOR SELECT
USING (
  public.is_global_admin()
);
