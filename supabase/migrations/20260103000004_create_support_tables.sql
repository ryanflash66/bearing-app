-- Migration: Create Support Tickets and Messages tables
-- Story 4.3: In-App Support Messaging

-- Enum for ticket status
create type public.support_ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

-- Support Tickets Table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id), -- Direct link to auth users for simplicity, or public.users? public.users is better for app logic, but RLS uses auth.uid().
  -- Let's use public.users(id) but ensure we can map back.
  -- Existing tables reference public.users(id)?
  -- public.accounts references public.users(id).
  -- public.users has auth_id.
  -- Let's reference public.users(id).
  
  -- Correction: referencing public.users(id) makes RLS slightly more complex (need to join users), but consistent with other tables.
  -- RLS: user_id corresponds to a public.users row where auth_id = auth.uid().
  
  subject text not null,
  status public.support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fix foreign key to reference public.users
alter table public.support_tickets
  drop constraint if exists support_tickets_user_id_fkey,
  add constraint support_tickets_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;


-- Support Messages Table
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete restrict, -- Who sent it
  message text not null,
  is_internal boolean not null default false, -- Internal notes visible only to admins/support
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_messages_ticket on public.support_messages(ticket_id);


-- RLS Policies

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Helper to check if user is support/admin
-- We can reuse existing function or create a dedicated one.
-- users.role is what matters.

create or replace function public.is_platform_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
    and role in ('admin', 'support')
  )
$$;

-- Tickets Policies

-- View: Owners or Support
create policy "Users can view own tickets" on public.support_tickets
  for select using (
    user_id = (select id from public.users where auth_id = auth.uid())
    or public.is_platform_support()
  );

-- Insert: Users can create tickets for themselves
create policy "Users can create tickets" on public.support_tickets
  for insert with check (
    user_id = (select id from public.users where auth_id = auth.uid())
  );

-- Update: Support can update status. Owners can update basic info? Maybe not subject. 
-- Let's allow support to update status.
create policy "Support can update tickets" on public.support_tickets
  for update using (
    public.is_platform_support()
  );
  
-- Messages Policies

-- View: Ticket Owner (if not internal) or Support (all)
create policy "Users can view messages" on public.support_messages
  for select using (
    (
      -- Message belongs to a ticket owned by user AND is not internal
      exists (
        select 1 from public.support_tickets
        where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = (select id from public.users where auth_id = auth.uid())
      )
      and is_internal = false
    )
    or public.is_platform_support()
  );

-- Insert: Ticket owner can reply, Support can reply
create policy "Users and Support can send messages" on public.support_messages
  for insert with check (
    -- Sender must be the current user
    sender_user_id = (select id from public.users where auth_id = auth.uid())
    and (
      -- If user is ticket owner
      exists (
        select 1 from public.support_tickets
        where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = (select id from public.users where auth_id = auth.uid())
      )
      -- Or user is support
      or public.is_platform_support()
    )
  );
  
-- Trigger for updated_at on tickets
create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at();

-- Grant permissions
grant all on public.support_tickets to authenticated;
grant all on public.support_messages to authenticated;
