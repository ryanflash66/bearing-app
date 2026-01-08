-- Optimization: Denormalize auth_id for Realtime RLS Performance
-- Adds auth_user_id to notifications and ticket_owner_auth_id to support_messages
-- Enables "Zero-Lookup" policies for Realtime compatibility

-- Robust Migration Pattern: Add -> Backfill -> Cleanup -> Constrain

-- 1. NOTIFICATIONS
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Backfill notifications
UPDATE public.notifications n
SET auth_user_id = u.auth_id
FROM public.users u
WHERE n.user_id = u.id;

-- Cleanup orphans: Remove notifications where auth_user_id is NULL or invalid
-- (Handles cases where public.users has data but auth.users does not)
DELETE FROM public.notifications 
WHERE auth_user_id IS NULL 
   OR auth_user_id NOT IN (SELECT id FROM auth.users);

-- Add Constraints
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_auth_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);

ALTER TABLE public.notifications 
ALTER COLUMN auth_user_id SET NOT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_auth_user_id ON public.notifications(auth_user_id);

-- New RLS Policy for Notifications (Zero-Lookup)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
TO public 
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
TO public 
USING (auth_user_id = auth.uid());


-- 2. SUPPORT MESSAGES
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS ticket_owner_auth_id uuid;

-- Backfill support_messages
UPDATE public.support_messages sm
SET ticket_owner_auth_id = u.auth_id
FROM public.support_tickets st
JOIN public.users u ON st.user_id = u.id
WHERE sm.ticket_id = st.id;

-- Cleanup orphans: Remove messages where ticket status/owner is broken or user deleted
DELETE FROM public.support_messages 
WHERE ticket_owner_auth_id IS NULL 
   OR ticket_owner_auth_id NOT IN (SELECT id FROM auth.users);

-- Add Constraints
ALTER TABLE public.support_messages 
DROP CONSTRAINT IF EXISTS support_messages_ticket_owner_auth_id_fkey;

ALTER TABLE public.support_messages
ADD CONSTRAINT support_messages_ticket_owner_auth_id_fkey 
FOREIGN KEY (ticket_owner_auth_id) REFERENCES auth.users(id);

ALTER TABLE public.support_messages 
ALTER COLUMN ticket_owner_auth_id SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_owner_auth_id ON public.support_messages(ticket_owner_auth_id);

-- New RLS Policy for Support Messages
DROP POLICY IF EXISTS "Users can view messages" ON public.support_messages;

CREATE POLICY "Users can view messages" 
ON public.support_messages FOR SELECT 
TO public 
USING (
  ticket_owner_auth_id = auth.uid() 
  OR 
  (EXISTS ( 
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() 
    AND (role = 'support_agent' OR role = 'super_admin')
  ))
);


-- 3. UPDATE RPC `reply_to_ticket` to populate new columns
CREATE OR REPLACE FUNCTION public.reply_to_ticket(
  ticket_id uuid,
  content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_owner_pk uuid;
  v_ticket_owner_auth_id uuid;
  v_ticket_subject text;
  v_sender_pk uuid;
  v_sender_auth_id uuid;
  v_sender_role text;
BEGIN
  -- Get current user (sender)
  v_sender_auth_id := auth.uid();
  
  SELECT id, role INTO v_sender_pk, v_sender_role
  FROM public.users
  WHERE auth_id = v_sender_auth_id;
  
  IF v_sender_pk IS NULL THEN
    RAISE EXCEPTION 'Access denied: User not found';
  END IF;

  -- Get ticket details (Including Owner's Auth ID)
  SELECT 
    st.user_id, 
    st.subject, 
    u.auth_id 
  INTO 
    v_ticket_owner_pk, 
    v_ticket_subject, 
    v_ticket_owner_auth_id
  FROM public.support_tickets st
  JOIN public.users u ON st.user_id = u.id
  WHERE st.id = ticket_id;
  
  IF v_ticket_owner_pk IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  -- Auth Check: Must be owner or support
  -- (Support logic: sender role check)
  IF v_sender_pk != v_ticket_owner_pk AND 
     v_sender_role NOT IN ('support_agent', 'super_admin') THEN
     RAISE EXCEPTION 'Access denied';
  END IF;

  -- Insert Message with Denormalized ticket_owner_auth_id
  INSERT INTO public.support_messages (
    ticket_id, 
    sender_user_id, 
    message, 
    is_internal, 
    ticket_owner_auth_id
  )
  VALUES (
    ticket_id, 
    v_sender_pk, 
    content, 
    false, 
    v_ticket_owner_auth_id -- Vital for RLS
  );

  -- Update Ticket Logic (Status & Timestamp)
  UPDATE public.support_tickets
  SET 
    updated_at = now(),
    status = CASE 
      WHEN v_sender_pk = v_ticket_owner_pk THEN 'pending_support'::public.support_ticket_status
      ELSE 'pending_user'::public.support_ticket_status
    END
  WHERE id = ticket_id;
  
  -- Create Notification if Support replied to User
  -- We include auth_user_id for the notification RLS
  IF v_sender_pk != v_ticket_owner_pk THEN
    INSERT INTO public.notifications (
      user_id, 
      auth_user_id, -- Denormalized for RLS
      type, 
      title, 
      message, 
      entity_type, 
      entity_id
    ) VALUES (
      v_ticket_owner_pk,
      v_ticket_owner_auth_id, -- The recipient's auth_id
      'support_reply',
      'New Reply on Ticket',
      FORMAT('New reply on ticket: %s', v_ticket_subject),
      'support_ticket',
      ticket_id
    );
  END IF;

END;
$$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
