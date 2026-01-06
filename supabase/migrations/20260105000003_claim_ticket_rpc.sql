-- Migration: Prototype RPC claim_ticket
-- Story 4.1: Admin Role Architecture (RPC First)

CREATE OR REPLACE FUNCTION public.claim_ticket(ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_agent_id uuid;
BEGIN
  -- 1. Check if user is support agent or admin
  IF NOT (public.is_support_agent() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: User is not authorized to claim tickets';
  END IF;

  -- Get current user ID
  SELECT id INTO current_agent_id FROM public.users WHERE auth_id = auth.uid();

  -- 2. Verify ticket state (Unassigned or already Mine)
  -- Note: We lock the row to avoid race conditions
  -- FOR UPDATE might fail if we don't have RLS update permission?
  -- SECURITY DEFINER bypasses RLS, so it works.
  
  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_id 
    AND (assigned_to IS NULL OR assigned_to = current_agent_id)
    FOR UPDATE
  ) THEN
    -- Check if it exists at all
    IF NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id) THEN
        RAISE EXCEPTION 'Ticket not found';
    ELSE
        RAISE EXCEPTION 'Ticket is already assigned to another agent';
    END IF;
  END IF;

  -- 3. Perform Update
  UPDATE public.support_tickets
  SET assigned_to = current_agent_id,
      status = 'in_progress'
  WHERE id = ticket_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ticket(uuid) TO authenticated;
