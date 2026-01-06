-- Migration: Epic 4 Hardening Fixes
-- Date: 2026-01-05
-- Issues Addressed:
-- 1. C1: Race condition in reply_to_ticket (Optimistic Locking)
-- 2. M1: Missing updated_at refresh in reply_to_ticket

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

  -- Update status if changed (with Optimistic Locking)
  IF ticket_status != new_status THEN
    UPDATE public.support_tickets 
    SET status = new_status,
        updated_at = now() -- FIX M1: Explicit touch
    WHERE id = ticket_id 
      AND status = ticket_status; -- FIX C1: Optimistic Locking
      
    IF NOT FOUND THEN
       -- Could retry loop here, but for now noticing it is sufficient safety
       RAISE EXCEPTION 'Concurrent modification detected. Please try again.';
    END IF;
  ELSE
    -- Even if status didn't change, we added a message, so touch updated_at
    UPDATE public.support_tickets 
    SET updated_at = now()
    WHERE id = ticket_id;
  END IF;
  
END;
$$;

GRANT EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text) TO authenticated;
