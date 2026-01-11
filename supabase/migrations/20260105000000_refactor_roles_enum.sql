-- Migration: Refactor User Roles to use Enum
-- Story 4.1: Admin Role Architecture

-- 1. Create the new enum type
CREATE TYPE public.app_role AS ENUM ('user', 'support_agent', 'super_admin');

-- 2. Update existing data to map to new values
-- Strategy: Drop constraint, update data, cast type, set default.

ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

-- Drop the check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Map old values to new values
UPDATE public.users SET role = 'user' WHERE role = 'author';
UPDATE public.users SET role = 'super_admin' WHERE role = 'admin';
UPDATE public.users SET role = 'support_agent' WHERE role = 'support';

-- Fallback for any other values (shouldn't exist, but safe to handle)
UPDATE public.users SET role = 'user' WHERE role NOT IN ('user', 'super_admin', 'support_agent');

-- Cast column to new type
ALTER TABLE public.users 
  ALTER COLUMN role TYPE public.app_role 
  USING role::public.app_role;

-- Set new default
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user'::public.app_role;

-- 3. Update helper function to use new values
CREATE OR REPLACE FUNCTION public.is_platform_support()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role IN ('super_admin', 'support_agent')
  )
$$;

-- 4. Grant permissions
GRANT USAGE ON TYPE public.app_role TO anon, authenticated;
