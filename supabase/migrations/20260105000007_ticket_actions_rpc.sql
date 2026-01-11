-- Migration: Ticket Action RPCs
-- Story 4.2

-- 1. reply_to_ticket
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
  -- If Support Replied -> set to 'pending_user'
  -- If User Replied -> set to 'pending_agent'
  IF is_support THEN
     -- Support replying: Move to pending_user
     -- Only if not resolved? Or strictly pending_user.
     -- Usually if resolved, support reply might be follow-up. 
     -- Let's set to pending_user.
     new_status := 'pending_user'::public.support_ticket_status;
  ELSE
     -- User replying: Move to pending_agent
     new_status := 'pending_agent'::public.support_ticket_status;
  END IF;

  -- Update status if changed
  IF ticket_status != new_status THEN
    UPDATE public.support_tickets SET status = new_status WHERE id = ticket_id;
  END IF;
  
  -- Ensure updated_at is touched (trigger handles it, but explicit update ensures it)
END;
$$;

GRANT EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text) TO authenticated;

-- 2. update_ticket_status
CREATE OR REPLACE FUNCTION public.update_ticket_status(ticket_id uuid, new_status public.support_ticket_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permission: Support only
  IF NOT (public.is_support_agent() OR public.is_super_admin()) THEN
     RAISE EXCEPTION 'Access denied';
  END IF;
  
  UPDATE public.support_tickets
  SET status = new_status
  WHERE id = ticket_id;
  
  IF NOT FOUND THEN
     RAISE EXCEPTION 'Ticket not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_ticket_status(uuid, public.support_ticket_status) TO authenticated;
