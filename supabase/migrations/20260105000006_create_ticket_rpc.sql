-- Migration: create_ticket RPC and Fix claim_ticket
-- Story 4.2

-- 1. Create create_ticket function
CREATE OR REPLACE FUNCTION public.create_ticket(
  subject text,
  message text,
  priority public.ticket_priority DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ticket_id uuid;
  active_ticket_count int;
  user_pk uuid;
BEGIN
  -- Get user ID
  SELECT id INTO user_pk FROM public.users WHERE auth_id = auth.uid();
  IF user_pk IS NULL THEN
     RAISE EXCEPTION 'User not found';
  END IF;

  -- 1. Rate Limit Check (AC 4.2.5)
  -- Count 'open', 'pending_user', 'pending_agent' tickets for this user.
  SELECT COUNT(*) INTO active_ticket_count
  FROM public.support_tickets
  WHERE user_id = user_pk
  AND status NOT IN ('resolved'); 

  IF active_ticket_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: You have 5 active tickets. Please resolve existing tickets before creating a new one.';
  END IF;

  -- 2. Create Ticket
  INSERT INTO public.support_tickets (user_id, subject, priority, status)
  VALUES (
    user_pk,
    subject,
    priority,
    'open'
  )
  RETURNING id INTO new_ticket_id;

  -- 3. Create Initial Message
  INSERT INTO public.support_messages (ticket_id, sender_user_id, message, is_internal)
  VALUES (
    new_ticket_id,
    user_pk,
    message,
    false
  );

  RETURN new_ticket_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ticket(text, text, public.ticket_priority) TO authenticated;

-- 2. Fix claim_ticket status
-- Migration 04 changed 'in_progress' to 'pending_agent'.
-- We need to update existing claim_ticket to use 'pending_agent'.

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
  -- FIXED: status 'in_progress' -> 'pending_agent'
  UPDATE public.support_tickets
  SET assigned_to = current_agent_id,
      status = 'pending_agent'
  WHERE id = ticket_id;

END;
$$;
