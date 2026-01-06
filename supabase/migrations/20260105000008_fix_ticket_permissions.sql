-- Migration: Fix Ticket RPC Permissions and Timestamps
-- Story 4.2 Code Review Fixes

-- 1. Fix update_ticket_status to allow users to resolve their own tickets (AC 4.2.4)
-- and ensure updated_at is refreshed.
CREATE OR REPLACE FUNCTION public.update_ticket_status(ticket_id uuid, new_status public.support_ticket_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_pk uuid;
  ticket_owner_id uuid;
  is_support boolean;
BEGIN
  -- Get user
  SELECT id INTO current_user_pk FROM public.users WHERE auth_id = auth.uid();
  
  -- Check roles
  is_support := (public.is_support_agent() OR public.is_super_admin());

  -- Get Ticket Info
  SELECT user_id INTO ticket_owner_id FROM public.support_tickets WHERE id = ticket_id;

  IF NOT FOUND THEN
     RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Permission Logic: Reference AC 4.2.4
  -- 1. Support/Admin can update to anything.
  -- 2. Owner can update to 'resolved' ONLY.
  IF is_support THEN
     -- Allowed
  ELSIF ticket_owner_id = current_user_pk AND new_status = 'resolved' THEN
     -- Allowed
  ELSE
     RAISE EXCEPTION 'Access denied';
  END IF;
  
  UPDATE public.support_tickets
  SET status = new_status,
      updated_at = now()
  WHERE id = ticket_id;
END;
$$;

-- 2. Fix reply_to_ticket to ensure updated_at is refreshed (AC 4.2.2/4.2.3)
CREATE OR REPLACE FUNCTION public.reply_to_ticket(ticket_id uuid, content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_pk uuid;
  ticket_owner_id uuid;
  ticket_status public.support_ticket_status;
  new_status public.support_ticket_status;
  is_support boolean;
BEGIN
  -- Get user
  SELECT id INTO current_user_pk FROM public.users WHERE auth_id = auth.uid();
  IF current_user_pk IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if Support
  is_support := (public.is_support_agent() OR public.is_super_admin());

  -- Get Ticket Info
  SELECT user_id, status INTO ticket_owner_id, ticket_status 
  FROM public.support_tickets WHERE id = ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  -- Auth Check: Must be owner or support
  IF ticket_owner_id != current_user_pk AND NOT is_support THEN
     RAISE EXCEPTION 'Access denied';
  END IF;

  -- Insert Message
  INSERT INTO public.support_messages (ticket_id, sender_user_id, message, is_internal)
  VALUES (ticket_id, current_user_pk, content, false);

  -- State Transition Logic
  IF is_support THEN
     new_status := 'pending_user'::public.support_ticket_status;
  ELSE
     new_status := 'pending_agent'::public.support_ticket_status;
  END IF;

  -- Update status and timestamp
  -- Even if status doesn't change, we MUST update updated_at (AC 4.2.3)
  UPDATE public.support_tickets 
  SET status = new_status,
      updated_at = now()
  WHERE id = ticket_id;
  
END;
$$;
