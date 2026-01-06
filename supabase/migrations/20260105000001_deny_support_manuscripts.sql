-- Migration: Explicitly Deny Support Agent Access to Manuscripts
-- Story 4.1: Admin Role Architecture
-- AC 4.1.2: Support Agent Manuscript Restrictions

-- 1. Helper function to check for global support agent role
CREATE OR REPLACE FUNCTION public.is_support_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = 'support_agent'::public.app_role
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_support_agent() TO authenticated;

-- 2. Restrictive Policy
-- Ensures that support agents are blocked from accessing manuscripts 
-- unless they effectively own them (permitting personal use).
CREATE POLICY "restrict_support_manuscript_access"
ON public.manuscripts
AS RESTRICTIVE
FOR ALL
USING (
  NOT public.is_support_agent() 
  OR 
  owner_user_id = public.get_current_user_id()
);
