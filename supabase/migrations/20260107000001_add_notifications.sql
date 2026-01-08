-- Migration: Add Notifications and Update Reply RPC
-- Fixes Critical Finding 1 (Missing In-App Notifications) implementation

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null, -- 'support_reply', 'system', etc.
  title text not null,
  message text not null,
  entity_type text, -- 'support_ticket', etc.
  entity_id uuid,   -- link to the entity
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS for Notifications
alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications
  for select using (
    user_id = (select id from public.users where auth_id = auth.uid())
  );

create policy "Users can update own notifications" on public.notifications
  for update using (
    user_id = (select id from public.users where auth_id = auth.uid())
  );

-- Update reply_to_ticket to create in-app notification for the author when support replies
create or replace function public.reply_to_ticket(
  ticket_id uuid,
  content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_owner_id uuid;
  v_sender_id uuid;
  v_sender_role text;
  v_ticket_subject text;
begin
  -- Get current user (sender)
  select id, role into v_sender_id, v_sender_role
  from public.users
  where auth_id = auth.uid();
  
  if v_sender_id is null then
    raise exception 'Access denied: User not found';
  end if;

  -- Get ticket details
  select user_id, subject into v_ticket_owner_id, v_ticket_subject
  from public.support_tickets
  where id = ticket_id;
  
  if v_ticket_owner_id is null then
    raise exception 'Ticket not found';
  end if;

  -- Insert Message
  insert into public.support_messages (ticket_id, sender_user_id, message)
  values (ticket_id, v_sender_id, content);

  -- Update Ticket (status and timestamp)
  update public.support_tickets
  set 
    updated_at = now(),
    -- Logic: If Author replies -> pending_support. If Support replies -> pending_user.
    status = case 
      when v_sender_id = v_ticket_owner_id then 'pending_support'::public.support_ticket_status
      else 'pending_user'::public.support_ticket_status
    end
  where id = ticket_id;
  
  -- Create Notification if Support repled to User
  if v_sender_id != v_ticket_owner_id then
    insert into public.notifications (
      user_id, 
      type, 
      title, 
      message, 
      entity_type, 
      entity_id
    ) values (
      v_ticket_owner_id,
      'support_reply',
      'New Reply on Ticket',
      format('New reply on ticket: %s', v_ticket_subject),
      'support_ticket',
      ticket_id
    );
  end if;

end;
$$;
