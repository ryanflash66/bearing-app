-- Migration: Fix create_ticket RPC to include ticket_owner_auth_id
-- Debugging Critical Support Issues

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
  current_auth_id uuid;
BEGIN
  -- Get user ID and Auth ID
  current_auth_id := auth.uid();
  SELECT id INTO user_pk FROM public.users WHERE auth_id = current_auth_id;
  
  IF user_pk IS NULL THEN
     RAISE EXCEPTION 'User not found';
  END IF;

  -- 1. Rate Limit Check (AC 4.2.5)
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
  -- CRITICAL FIX: Include ticket_owner_auth_id (required by 20260108000006_optimize_realtime_rls.sql)
  INSERT INTO public.support_messages (
    ticket_id, 
    sender_user_id, 
    message, 
    is_internal,
    ticket_owner_auth_id -- Added
  )
  VALUES (
    new_ticket_id,
    user_pk,
    message,
    false,
    current_auth_id -- The creator is the owner
  );

  RETURN new_ticket_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
