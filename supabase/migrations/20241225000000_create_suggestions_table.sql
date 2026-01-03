-- Migration: Create suggestions table for Llama AI suggestions
-- Story 2.3: Real-Time Llama AI Suggestions
-- Implements suggestion storage with caching support

-- ============================================================================
-- SUGGESTIONS TABLE
-- Stores Llama AI suggestions for manuscript text selections
-- ============================================================================
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  request_hash text not null,                -- SHA256(selection_text + instruction) for caching
  original_text text not null,
  suggested_text text not null,
  instruction text,                          -- User's instruction/prompt
  confidence numeric(4,3) not null default 0, -- 0.0 to 1.0 (confidence score)
  model text not null default 'llama8b',
  tokens_estimated int not null default 0,
  tokens_actual int not null default 0,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Index for manuscript lookups
create index if not exists idx_suggestions_manuscript 
  on public.suggestions(manuscript_id);

-- Index for cache lookups (request_hash)
create index if not exists idx_suggestions_hash 
  on public.suggestions(request_hash);

-- Index for user lookups
create index if not exists idx_suggestions_created_by 
  on public.suggestions(created_by);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.suggestions enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users can view suggestions for manuscripts in their account
drop policy if exists "suggestions_select_member" on public.suggestions;
create policy "suggestions_select_member"
  on public.suggestions for select
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = suggestions.manuscript_id
      and public.is_account_member(m.account_id)
    )
  );

-- Users can create suggestions for manuscripts they can edit
drop policy if exists "suggestions_insert_member" on public.suggestions;
create policy "suggestions_insert_member"
  on public.suggestions for insert
  with check (
    created_by = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = suggestions.manuscript_id
      and (
        m.owner_user_id = public.get_current_user_id()
        or public.is_account_admin(m.account_id)
      )
    )
  );

-- Suggestions are immutable (no updates or deletes)
-- This is enforced by not creating update/delete policies

-- Grant permissions
grant all on public.suggestions to authenticated;

