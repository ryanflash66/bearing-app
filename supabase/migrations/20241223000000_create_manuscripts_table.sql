-- Migration: Create manuscripts table
-- Story 2.1: Manuscript CRUD + Autosave
-- Implements manuscript storage with soft delete and autosave support

-- ============================================================================
-- MANUSCRIPTS TABLE
-- Root content object for author manuscripts
-- ============================================================================
create table if not exists public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  title text not null default 'Untitled',
  status text not null default 'draft' 
    check (status in ('draft', 'in_review', 'ready', 'published', 'archived')),
  content_json jsonb not null default '{}'::jsonb,    -- TipTap editor state
  content_text text not null default '',               -- Plaintext extraction for word count/AI
  content_hash text,                                   -- SHA256 for deduplication/sync
  word_count int not null default 0,                   -- Cached word count for performance
  last_saved_at timestamptz,                           -- Last successful autosave timestamp
  deleted_at timestamptz,                              -- Soft delete timestamp (null = active)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for account lookups (active manuscripts only)
create index if not exists idx_manuscripts_account_active 
  on public.manuscripts(account_id) 
  where deleted_at is null;

-- Index for owner lookups
create index if not exists idx_manuscripts_owner 
  on public.manuscripts(owner_user_id);

-- Index for soft delete cleanup jobs
create index if not exists idx_manuscripts_deleted_at 
  on public.manuscripts(deleted_at) 
  where deleted_at is not null;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
drop trigger if exists trg_manuscripts_updated_at on public.manuscripts;
create trigger trg_manuscripts_updated_at
  before update on public.manuscripts
  for each row execute function public.update_updated_at();

-- ============================================================================
-- FUNCTION: Calculate word count from content_text
-- ============================================================================
create or replace function public.calculate_word_count(content text)
returns int
language plpgsql
immutable
as $$
begin
  -- Handle null or empty content
  if content is null or trim(content) = '' then
    return 0;
  end if;
  
  -- Count words by splitting on whitespace
  return array_length(regexp_split_to_array(trim(content), '\s+'), 1);
end;
$$;

-- ============================================================================
-- TRIGGER: Auto-update word_count when content_text changes
-- ============================================================================
create or replace function public.update_manuscript_word_count()
returns trigger
language plpgsql
as $$
begin
  -- Only recalculate if content_text changed
  if new.content_text is distinct from old.content_text then
    new.word_count = public.calculate_word_count(new.content_text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_manuscripts_word_count on public.manuscripts;
create trigger trg_manuscripts_word_count
  before update on public.manuscripts
  for each row execute function public.update_manuscript_word_count();

-- Also calculate on insert
create or replace function public.set_manuscript_word_count()
returns trigger
language plpgsql
as $$
begin
  new.word_count = public.calculate_word_count(new.content_text);
  return new;
end;
$$;

drop trigger if exists trg_manuscripts_word_count_insert on public.manuscripts;
create trigger trg_manuscripts_word_count_insert
  before insert on public.manuscripts
  for each row execute function public.set_manuscript_word_count();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.manuscripts enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Members can view active manuscripts in their account
drop policy if exists "manuscripts_select_member" on public.manuscripts;
create policy "manuscripts_select_member"
  on public.manuscripts for select
  using (
    public.is_account_member(account_id)
    and deleted_at is null
  );

-- Admins can view deleted manuscripts (for recovery)
drop policy if exists "manuscripts_select_deleted_admin" on public.manuscripts;
create policy "manuscripts_select_deleted_admin"
  on public.manuscripts for select
  using (
    public.is_account_admin_or_owner(account_id)
    and deleted_at is not null
  );

-- Members can create manuscripts in their account
drop policy if exists "manuscripts_insert_member" on public.manuscripts;
create policy "manuscripts_insert_member"
  on public.manuscripts for insert
  with check (
    public.is_account_member(account_id)
    and owner_user_id = public.get_current_user_id()
  );

-- Only owner or admin can update manuscripts
drop policy if exists "manuscripts_update_owner_admin" on public.manuscripts;
create policy "manuscripts_update_owner_admin"
  on public.manuscripts for update
  using (
    owner_user_id = public.get_current_user_id()
    or public.is_account_admin(account_id)
  )
  with check (
    owner_user_id = public.get_current_user_id()
    or public.is_account_admin(account_id)
  );

-- Only owner or admin can soft delete manuscripts
drop policy if exists "manuscripts_delete_owner_admin" on public.manuscripts;
create policy "manuscripts_delete_owner_admin"
  on public.manuscripts for delete
  using (
    owner_user_id = public.get_current_user_id()
    or public.is_account_admin(account_id)
  );

-- Grant permissions
grant all on public.manuscripts to authenticated;
grant execute on function public.calculate_word_count(text) to authenticated;


