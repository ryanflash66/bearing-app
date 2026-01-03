-- Migration: Create consistency_checks table for Gemini consistency analysis
-- Story 3.1: Manual Gemini Consistency Check
-- Implements async job tracking for Gemini consistency checks

-- ============================================================================
-- CONSISTENCY_CHECKS TABLE
-- Stores async job records for Gemini consistency checks
-- ============================================================================
create table if not exists public.consistency_checks (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  status text not null default 'queued' 
    check (status in ('queued', 'running', 'completed', 'failed', 'canceled')),
  model text not null default 'gemini-pro',
  input_hash text not null,                  -- SHA256(manuscript_content) for caching
  report_json jsonb,                         -- Structured issues report
  tokens_estimated int not null default 0,
  tokens_actual int not null default 0,
  error_message text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Index for manuscript lookups
create index if not exists idx_consistency_checks_manuscript 
  on public.consistency_checks(manuscript_id);

-- Index for status lookups (for worker polling)
create index if not exists idx_consistency_checks_status 
  on public.consistency_checks(status) 
  where status in ('queued', 'running');

-- Index for cache lookups (input_hash)
create index if not exists idx_consistency_checks_hash 
  on public.consistency_checks(input_hash);

-- Index for user lookups
create index if not exists idx_consistency_checks_created_by 
  on public.consistency_checks(created_by);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.consistency_checks enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users can view consistency checks for manuscripts in their account
drop policy if exists "consistency_checks_select_member" on public.consistency_checks;
create policy "consistency_checks_select_member"
  on public.consistency_checks for select
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = consistency_checks.manuscript_id
      and public.is_account_member(m.account_id)
    )
  );

-- Users can create consistency checks for manuscripts they can edit
drop policy if exists "consistency_checks_insert_member" on public.consistency_checks;
create policy "consistency_checks_insert_member"
  on public.consistency_checks for insert
  with check (
    created_by = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = consistency_checks.manuscript_id
      and (
        m.owner_user_id = public.get_current_user_id()
        or public.is_account_admin(m.account_id)
      )
    )
  );

-- Users can update consistency checks they created (for retry scenarios)
-- Workers can update status via service role
drop policy if exists "consistency_checks_update_owner" on public.consistency_checks;
create policy "consistency_checks_update_owner"
  on public.consistency_checks for update
  using (
    created_by = public.get_current_user_id()
    or exists (
      select 1 from public.manuscripts m
      where m.id = consistency_checks.manuscript_id
      and public.is_account_admin(m.account_id)
    )
  )
  with check (
    created_by = public.get_current_user_id()
    or exists (
      select 1 from public.manuscripts m
      where m.id = consistency_checks.manuscript_id
      and public.is_account_admin(m.account_id)
    )
  );

-- Grant permissions
grant all on public.consistency_checks to authenticated;

