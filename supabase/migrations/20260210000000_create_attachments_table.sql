-- Migration: Create attachments table and indexes
-- Story 8.8: Image upload + AI generation in manuscript

-- ============================================================================
-- ATTACHMENTS TABLE
-- Stores metadata for user uploads and AI-generated images
-- ============================================================================
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  source text not null check (source in ('user_upload', 'ai_generation')),
  storage_path text not null,
  alt_text text,
  file_size bigint not null,
  mime_type text not null,
  original_filename text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Indexes
create index if not exists idx_attachments_manuscript on public.attachments(manuscript_id);
create index if not exists idx_attachments_created_at on public.attachments(created_at);

-- ============================================================================
-- AI USAGE INDEX
-- For rate limiting (Max 5 generations/min/user)
-- ============================================================================
create index if not exists idx_ai_usage_created_at on public.ai_usage_events(created_at);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.attachments enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Policy: Owners can view their manuscript's attachments
drop policy if exists "attachments_select_owner" on public.attachments;
create policy "attachments_select_owner"
  on public.attachments for select
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = attachments.manuscript_id
      and m.owner_user_id = public.get_current_user_id()
    )
  );

-- Policy: Owners can insert attachments for their manuscripts
drop policy if exists "attachments_insert_owner" on public.attachments;
create policy "attachments_insert_owner"
  on public.attachments for insert
  with check (
    user_id = public.get_current_user_id()
    and
    exists (
      select 1 from public.manuscripts m
      where m.id = attachments.manuscript_id
      and m.owner_user_id = public.get_current_user_id()
    )
  );

-- Policy: Owners can delete their manuscript's attachments
drop policy if exists "attachments_delete_owner" on public.attachments;
create policy "attachments_delete_owner"
  on public.attachments for delete
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = attachments.manuscript_id
      and m.owner_user_id = public.get_current_user_id()
    )
  );

-- Policy: Owners can update their manuscript's attachments (for soft-delete)
drop policy if exists "attachments_update_owner" on public.attachments;
create policy "attachments_update_owner"
  on public.attachments for update
  using (
    exists (
      select 1 from public.manuscripts m
      where m.id = attachments.manuscript_id
      and m.owner_user_id = public.get_current_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.manuscripts m
      where m.id = attachments.manuscript_id
      and m.owner_user_id = public.get_current_user_id()
    )
  );

-- Grant permissions
grant all on public.attachments to authenticated;
grant all on public.attachments to service_role;