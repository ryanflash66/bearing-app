-- Migration: Add AI Status to Account Members
-- Support for Story 4.2 Override Actions (Disable AI for user)

alter table public.account_members 
add column if not exists ai_status text not null default 'active' check (ai_status in ('active', 'disabled'));

-- Update RLS or other logic might be needed if AI enforcement is done in DB security policies,
-- but usually it's application level.
-- We will expose this status to the admin dashboard.
