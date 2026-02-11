-- Migration: Cover generation job + gallery persistence
-- Story 5.9: AI Cover Generator

-- ============================================================================
-- COVER JOBS
-- ============================================================================
create table if not exists public.cover_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')) default 'queued',
  prompt text not null,
  genre text not null,
  mood text not null,
  style text not null,
  wrapped_prompt text,
  provider text not null default 'vertex-ai',
  model text not null default 'imagen-4.0',
  images jsonb not null default '[]'::jsonb,
  selected_url text,
  error_message text,
  retry_count integer not null default 0 check (retry_count >= 0 and retry_count <= 3),
  retry_after timestamptz,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cover_jobs_user_status on public.cover_jobs(user_id, status);
create index if not exists idx_cover_jobs_manuscript_requested on public.cover_jobs(manuscript_id, requested_at desc);
create index if not exists idx_cover_jobs_retry_after on public.cover_jobs(retry_after) where retry_after is not null;

drop trigger if exists trg_cover_jobs_updated_at on public.cover_jobs;
create trigger trg_cover_jobs_updated_at
  before update on public.cover_jobs
  for each row execute function public.update_updated_at();

-- ============================================================================
-- GALLERY ASSETS
-- ============================================================================
create table if not exists public.gallery_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  job_id uuid references public.cover_jobs(id) on delete set null,
  asset_type text not null check (asset_type in ('cover')),
  url text not null,
  provider text not null default 'vertex-ai',
  model text not null default 'imagen-4.0',
  prompt text not null,
  wrapped_prompt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_assets_account_created on public.gallery_assets(account_id, created_at desc);
create index if not exists idx_gallery_assets_manuscript on public.gallery_assets(manuscript_id);
create index if not exists idx_gallery_assets_user on public.gallery_assets(user_id);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.cover_jobs enable row level security;
alter table public.gallery_assets enable row level security;

-- ============================================================================
-- RLS: COVER JOBS
-- ============================================================================
drop policy if exists "cover_jobs_select_owner" on public.cover_jobs;
create policy "cover_jobs_select_owner"
  on public.cover_jobs for select
  using (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = cover_jobs.manuscript_id
        and m.owner_user_id = public.get_current_user_id()
    )
  );

drop policy if exists "cover_jobs_insert_owner" on public.cover_jobs;
create policy "cover_jobs_insert_owner"
  on public.cover_jobs for insert
  with check (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = cover_jobs.manuscript_id
        and m.owner_user_id = public.get_current_user_id()
    )
  );

drop policy if exists "cover_jobs_update_owner" on public.cover_jobs;
create policy "cover_jobs_update_owner"
  on public.cover_jobs for update
  using (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = cover_jobs.manuscript_id
        and m.owner_user_id = public.get_current_user_id()
    )
  )
  with check (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.manuscripts m
      where m.id = cover_jobs.manuscript_id
        and m.owner_user_id = public.get_current_user_id()
    )
  );

-- ============================================================================
-- RLS: GALLERY ASSETS
-- ============================================================================
drop policy if exists "gallery_assets_select_owner" on public.gallery_assets;
create policy "gallery_assets_select_owner"
  on public.gallery_assets for select
  using (
    user_id = public.get_current_user_id()
    and public.is_account_member(account_id)
  );

drop policy if exists "gallery_assets_insert_owner" on public.gallery_assets;
create policy "gallery_assets_insert_owner"
  on public.gallery_assets for insert
  with check (
    user_id = public.get_current_user_id()
    and public.is_account_member(account_id)
  );

drop policy if exists "gallery_assets_update_owner" on public.gallery_assets;
create policy "gallery_assets_update_owner"
  on public.gallery_assets for update
  using (
    user_id = public.get_current_user_id()
    and public.is_account_member(account_id)
  )
  with check (
    user_id = public.get_current_user_id()
    and public.is_account_member(account_id)
  );

drop policy if exists "gallery_assets_delete_owner" on public.gallery_assets;
create policy "gallery_assets_delete_owner"
  on public.gallery_assets for delete
  using (
    user_id = public.get_current_user_id()
    and public.is_account_member(account_id)
  );

grant all on public.cover_jobs to authenticated;
grant all on public.cover_jobs to service_role;
grant all on public.gallery_assets to authenticated;
grant all on public.gallery_assets to service_role;

