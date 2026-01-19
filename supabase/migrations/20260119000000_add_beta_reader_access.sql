-- Migration: Add beta reader access tables and policies
-- Story 7.1: Beta Reader Access & Commenting

-- ============================================================================
-- BETA ACCESS TOKENS TABLE
-- Stores token-based access for beta readers
-- ============================================================================
create table if not exists public.beta_access_tokens (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '30 days'),
  permissions text not null default 'read'
    check (permissions in ('read', 'comment')),
  created_by uuid not null references public.users(id) on delete restrict
);

-- ============================================================================
-- BETA COMMENTS TABLE
-- Stores beta reader comments tied to manuscript text selections
-- ============================================================================
create table if not exists public.beta_comments (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  chapter_id uuid,
  selected_text text not null,
  comment_text text not null,
  author_name text not null,
  type text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved'))
);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.beta_access_tokens enable row level security;
alter table public.beta_comments enable row level security;

-- ============================================================================
-- FUNCTION: verify_beta_token
-- Validates token for beta access without exposing token rows directly
-- ============================================================================
create or replace function public.verify_beta_token(token text)
returns table (
  token_id uuid,
  manuscript_id uuid,
  permissions text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id as token_id, manuscript_id, permissions, expires_at
  from public.beta_access_tokens
  where beta_access_tokens.token = verify_beta_token.token
    and beta_access_tokens.expires_at > now()
$$;

-- ============================================================================
-- RLS POLICIES: beta_access_tokens
-- ============================================================================
drop policy if exists "beta_access_tokens_select_owner_admin" on public.beta_access_tokens;
create policy "beta_access_tokens_select_owner_admin"
  on public.beta_access_tokens for select
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_access_tokens.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_access_tokens_insert_owner_admin" on public.beta_access_tokens;
create policy "beta_access_tokens_insert_owner_admin"
  on public.beta_access_tokens for insert
  with check (
    created_by = public.get_current_user_id()
    and exists (
      select 1
      from public.manuscripts m
      where m.id = beta_access_tokens.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_access_tokens_update_owner_admin" on public.beta_access_tokens;
create policy "beta_access_tokens_update_owner_admin"
  on public.beta_access_tokens for update
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_access_tokens.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_access_tokens.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_access_tokens_delete_owner_admin" on public.beta_access_tokens;
create policy "beta_access_tokens_delete_owner_admin"
  on public.beta_access_tokens for delete
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_access_tokens.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

-- ============================================================================
-- RLS POLICIES: beta_comments
-- ============================================================================
drop policy if exists "beta_comments_select_owner_admin" on public.beta_comments;
create policy "beta_comments_select_owner_admin"
  on public.beta_comments for select
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_comments.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_comments_insert_owner_admin" on public.beta_comments;
create policy "beta_comments_insert_owner_admin"
  on public.beta_comments for insert
  with check (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_comments.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_comments_insert_token" on public.beta_comments;
create policy "beta_comments_insert_token"
  on public.beta_comments for insert
  with check (
    exists (
      select 1
      from public.verify_beta_token(
        (coalesce(current_setting('request.headers', true), '{}'))::jsonb ->> 'x-beta-token'
      ) v
      where v.manuscript_id = beta_comments.manuscript_id
        and v.permissions = 'comment'
    )
  );

drop policy if exists "beta_comments_update_owner_admin" on public.beta_comments;
create policy "beta_comments_update_owner_admin"
  on public.beta_comments for update
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_comments.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_comments.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

drop policy if exists "beta_comments_delete_owner_admin" on public.beta_comments;
create policy "beta_comments_delete_owner_admin"
  on public.beta_comments for delete
  using (
    exists (
      select 1
      from public.manuscripts m
      where m.id = beta_comments.manuscript_id
        and m.deleted_at is null
        and (
          m.owner_user_id = public.get_current_user_id()
          or public.is_account_admin(m.account_id)
        )
    )
  );

-- ============================================================================
-- RLS POLICY: manuscripts select via beta token
-- ============================================================================
drop policy if exists "manuscripts_select_beta_token" on public.manuscripts;
create policy "manuscripts_select_beta_token"
  on public.manuscripts for select
  using (
    deleted_at is null
    and exists (
      select 1
      from public.verify_beta_token(
        (coalesce(current_setting('request.headers', true), '{}'))::jsonb ->> 'x-beta-token'
      ) v
      where v.manuscript_id = manuscripts.id
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
grant all on public.beta_access_tokens to authenticated;
grant select, insert, update, delete on public.beta_comments to authenticated;
grant select, insert on public.beta_comments to anon;
grant select on public.manuscripts to anon;
grant execute on function public.verify_beta_token(text) to anon, authenticated;
