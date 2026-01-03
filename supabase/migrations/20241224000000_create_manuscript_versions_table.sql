-- Migration: Create manuscript_versions table
-- Story 2.2: Version History & Restore
-- Implements immutable version snapshots for manuscript content

-- ============================================================================
-- MANUSCRIPT_VERSIONS TABLE
-- Immutable snapshots of manuscript content for version history
-- ============================================================================
create table if not exists public.manuscript_versions (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  version_num int not null,
  content_json jsonb not null,                    -- TipTap editor state snapshot
  content_text text not null,                    -- Plaintext snapshot
  title text not null,                            -- Title snapshot (may change)
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (manuscript_id, version_num)
);

-- Index for manuscript lookups (most common query)
create index if not exists idx_manuscript_versions_manuscript 
  on public.manuscript_versions(manuscript_id, created_at desc);

-- Index for pagination (cursor-based loading)
create index if not exists idx_manuscript_versions_created_at 
  on public.manuscript_versions(created_at desc);

-- ============================================================================
-- FUNCTION: Prevent version mutations (immutable table)
-- ============================================================================
create or replace function public.prevent_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'manuscript_versions is immutable - versions cannot be updated or deleted';
end;
$$;

-- ============================================================================
-- TRIGGERS: Enforce immutability
-- ============================================================================
drop trigger if exists trg_manuscript_versions_no_update on public.manuscript_versions;
create trigger trg_manuscript_versions_no_update
  before update on public.manuscript_versions
  for each row execute function public.prevent_version_mutation();

drop trigger if exists trg_manuscript_versions_no_delete on public.manuscript_versions;
create trigger trg_manuscript_versions_no_delete
  before delete on public.manuscript_versions
  for each row execute function public.prevent_version_mutation();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.manuscript_versions enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Members can view versions for manuscripts in their account
drop policy if exists "manuscript_versions_select_member" on public.manuscript_versions;
create policy "manuscript_versions_select_member"
  on public.manuscript_versions for select
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = manuscript_versions.manuscript_id
        and public.is_account_member(m.account_id)
        and m.deleted_at is null
    )
  );

-- Only owner or admin can create versions (via restore or snapshot)
drop policy if exists "manuscript_versions_insert_owner_admin" on public.manuscript_versions;
create policy "manuscript_versions_insert_owner_admin"
  on public.manuscript_versions for insert
  with check (
    exists (
      select 1 from public.manuscripts m
      where m.id = manuscript_versions.manuscript_id
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
        and m.deleted_at is null
    )
  );

-- No update or delete policies (enforced by triggers)

-- Grant permissions
grant select, insert on public.manuscript_versions to authenticated;
grant execute on function public.prevent_version_mutation() to authenticated;

