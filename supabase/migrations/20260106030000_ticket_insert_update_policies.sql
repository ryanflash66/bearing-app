-- Migration: Add INSERT policy for support_tickets and UPDATE for Super Admins
-- Story 4.1: Admin Role Architecture (Code Review Fix)
-- Issue: Missing INSERT policy for users creating tickets, missing UPDATE for Super Admins

-- Policy 1: Users can INSERT their own tickets
CREATE POLICY "tickets_insert_owner" ON public.support_tickets
FOR INSERT 
WITH CHECK (
  user_id = public.get_current_user_id()
);

-- Policy 2: Super Admins can UPDATE any ticket
-- Note: Support Agents still must use RPCs (RPC-First pattern per AC 4.1.4)
CREATE POLICY "tickets_update_super_admin" ON public.support_tickets
FOR UPDATE
USING (
  public.is_super_admin()
)
WITH CHECK (
  public.is_super_admin()
);

-- Add comment clarifying policy intent
COMMENT ON POLICY "tickets_update_super_admin" ON public.support_tickets IS 
  'Super Admins can directly update tickets. Support Agents must use RPCs (claim_ticket, etc.) per RPC-First pattern.';
