-- Migration: Fix Support Tables RLS Performance
-- Address auth_rls_initplan warnings for support_tickets and support_messages

-- 1. Fix is_platform_support function
-- Optimization: cache auth.uid()
-- Security: set search_path = public
create or replace function public.is_platform_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = (select auth.uid())
    and role in ('admin', 'support')
  )
$$;

-- 2. Fix Support Tickets Policies

drop policy if exists "Users can view own tickets" on public.support_tickets;
create policy "Users can view own tickets" on public.support_tickets
  for select using (
    user_id = public.get_current_user_id()
    or public.is_platform_support()
  );

drop policy if exists "Users can create tickets" on public.support_tickets;
create policy "Users can create tickets" on public.support_tickets
  for insert with check (
    user_id = public.get_current_user_id()
  );

-- 3. Fix Support Messages Policies

drop policy if exists "Users can view messages" on public.support_messages;
create policy "Users can view messages" on public.support_messages
  for select using (
    (
      -- Message belongs to a ticket owned by user AND is not internal
      exists (
        select 1 from public.support_tickets
        where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = public.get_current_user_id()
      )
      and is_internal = false
    )
    or public.is_platform_support()
  );

drop policy if exists "Users and Support can send messages" on public.support_messages;
create policy "Users and Support can send messages" on public.support_messages
  for insert with check (
    -- Sender must be the current user
    sender_user_id = public.get_current_user_id()
    and (
      -- If user is ticket owner
      exists (
        select 1 from public.support_tickets
        where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = public.get_current_user_id()
      )
      -- Or user is support
      or public.is_platform_support()
    )
  );
