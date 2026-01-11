-- Migration: Add assigned_to to Support Tickets and Refine policies
-- Story 4.1: Admin Role Architecture

-- 1. Add assigned_to column
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- 2. Helper for Super Admin
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
    AND role = 'super_admin'::public.app_role
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- 3. Update RLS Policies for Tickets

-- Drop existing broad policies
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Support can update tickets" ON public.support_tickets;

-- Policy 1: Owners can view their own tickets
-- Policy 1: Owners can view their own tickets
CREATE POLICY "tickets_select_owner" ON public.support_tickets
FOR SELECT USING (
  user_id = public.get_current_user_id()
);

-- Policy 2: Support Agents can view Assigned or Unassigned tickets
-- Super Admins can view ALL
CREATE POLICY "tickets_select_support" ON public.support_tickets
FOR SELECT USING (
  public.is_super_admin()
  OR
  (
    public.is_support_agent()
    AND
    (
      assigned_to = public.get_current_user_id()
      OR
      assigned_to IS NULL
    )
  )
);

-- Note: No UPDATE policy for support agents ensures they must use RPCs (Story 4.1.4)
