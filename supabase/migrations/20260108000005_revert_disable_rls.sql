-- Revert Debug Migration: Re-enable RLS
-- Security Restoration

alter table notifications enable row level security;
alter table support_messages enable row level security;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
