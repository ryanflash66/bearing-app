-- Migration: Create core account management tables
-- Story 1.3: Account & Role Management
-- This migration creates the foundational tables for multi-tenancy support

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- Links to Supabase auth.users via auth_id, stores application-level user data
-- ============================================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,  -- References auth.users(id) from Supabase Auth
  email text not null unique,
  display_name text,
  pen_name text,
  role text not null default 'author' check (role in ('author', 'admin', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_users_auth_id on public.users(auth_id);
create index if not exists idx_users_email on public.users(email);

-- ============================================================================
-- ACCOUNTS TABLE
-- Represents a tenant/organization that groups users and their data
-- ============================================================================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Index for owner lookups
create index if not exists idx_accounts_owner on public.accounts(owner_user_id);

-- ============================================================================
-- ACCOUNT_MEMBERS TABLE
-- Join table linking users to accounts with per-account roles
-- ============================================================================
create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  account_role text not null default 'author' check (account_role in ('author', 'admin', 'support')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

-- Indexes for membership lookups
create index if not exists idx_account_members_user on public.account_members(user_id);
create index if not exists idx_account_members_account on public.account_members(account_id);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- Immutable log of all important actions for security and compliance
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for audit queries
create index if not exists idx_audit_logs_account on public.audit_logs(account_id);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- ============================================================================
-- TRIGGER: Prevent mutations to audit_logs (immutable)
-- ============================================================================
create or replace function public.prevent_audit_mutation()
returns trigger 
language plpgsql
security definer
as $$
begin
  raise exception 'audit_logs table is immutable - updates and deletes are not allowed';
end;
$$;

-- Drop existing triggers if they exist (idempotent)
drop trigger if exists trg_audit_no_update on public.audit_logs;
drop trigger if exists trg_audit_no_delete on public.audit_logs;

-- Create triggers to enforce immutability
create trigger trg_audit_no_update 
  before update on public.audit_logs
  for each row execute function public.prevent_audit_mutation();

create trigger trg_audit_no_delete 
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_mutation();

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
create or replace function public.update_updated_at()
returns trigger 
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to users table
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.users to anon, authenticated;
grant all on public.accounts to anon, authenticated;
grant all on public.account_members to anon, authenticated;
grant all on public.audit_logs to anon, authenticated;

