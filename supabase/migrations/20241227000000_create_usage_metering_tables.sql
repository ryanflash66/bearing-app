-- Migration: Create billing cycles and usage metering tables
-- Story 3.3: AI Usage Metering & Hard Caps

-- ============================================================================
-- BILLING CYCLES TABLE
-- Tracks the billing period for an account to aggregate usage
-- ============================================================================
create table if not exists public.billing_cycles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup of open cycle
create index if not exists idx_billing_cycles_account_status 
  on public.billing_cycles(account_id, status);

-- Trigger for updated_at
drop trigger if exists trg_billing_cycles_updated_at on public.billing_cycles;
create trigger trg_billing_cycles_updated_at
  before update on public.billing_cycles
  for each row execute function public.update_updated_at();

-- ============================================================================
-- AI USAGE EVENTS TABLE
-- Immutable log of AI token usage (estimated + actual)
-- ============================================================================
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  cycle_id uuid references public.billing_cycles(id) on delete set null,
  feature text not null, -- e.g., 'consistency_check', 'suggestion'
  model text not null,   -- e.g., 'gemini-1.5-pro', 'llama-3'
  tokens_estimated int not null default 0,
  tokens_actual int default 0,
  created_at timestamptz not null default now()
);

-- Index for usage aggregation
create index if not exists idx_ai_usage_events_cycle 
  on public.ai_usage_events(cycle_id);

create index if not exists idx_ai_usage_events_account_created 
  on public.ai_usage_events(account_id, created_at);

-- ============================================================================
-- TRIGGER: Prevent mutations to ai_usage_events (immutable)
-- ============================================================================
create or replace function public.prevent_usage_mutation()
returns trigger 
language plpgsql
security definer
as $$
begin
  raise exception 'ai_usage_events table is immutable - updates and deletes are not allowed';
end;
$$;

drop trigger if exists trg_ai_usage_no_update on public.ai_usage_events;
create trigger trg_ai_usage_no_update 
  before update on public.ai_usage_events
  for each row execute function public.prevent_usage_mutation();

drop trigger if exists trg_ai_usage_no_delete on public.ai_usage_events;
create trigger trg_ai_usage_no_delete 
  before delete on public.ai_usage_events
  for each row execute function public.prevent_usage_mutation();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.billing_cycles enable row level security;
alter table public.ai_usage_events enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Billing Cycles: Members can view
drop policy if exists "billing_cycles_select_member" on public.billing_cycles;
create policy "billing_cycles_select_member" on public.billing_cycles
  for select using (public.is_account_member(account_id));

-- Billing Cycles: Only admins/owner can manage
drop policy if exists "billing_cycles_all_admin" on public.billing_cycles;
create policy "billing_cycles_all_admin" on public.billing_cycles
  for all using (public.is_account_admin_or_owner(account_id));

-- Usage Events: Members can view
drop policy if exists "ai_usage_events_select_member" on public.ai_usage_events;
create policy "ai_usage_events_select_member" on public.ai_usage_events
  for select using (public.is_account_member(account_id));

-- Usage Events: Members can insert (to log their usage)
drop policy if exists "ai_usage_events_insert_member" on public.ai_usage_events;
create policy "ai_usage_events_insert_member" on public.ai_usage_events
  for insert with check (
    public.is_account_member(account_id)
    and user_id = public.get_current_user_id()
  );

-- Grant permissions
grant all on public.billing_cycles to authenticated;
grant all on public.ai_usage_events to authenticated;
