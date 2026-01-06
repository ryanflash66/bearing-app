-- Migration: God Mode for Super Admin
-- Enable full access to users table for super_admin

-- 1. Ensure helper function exists and is correct
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- 2. Allow Super Admin to SELECT all users
DROP POLICY IF EXISTS "super_admin_select_all" ON public.users;
CREATE POLICY "super_admin_select_all"
  ON public.users FOR SELECT
  USING (public.is_super_admin());

-- 3. Allow Super Admin to UPDATE all users (roles)
DROP POLICY IF EXISTS "super_admin_update_all" ON public.users;
CREATE POLICY "super_admin_update_all"
  ON public.users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 4. Grant execute on function
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
