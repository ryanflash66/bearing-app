-- Migration: Add Member Status (Active/Suspended)
-- AC 4.2.2: Disable user override

alter table public.account_members 
add column if not exists member_status text not null default 'active' check (member_status in ('active', 'suspended'));
