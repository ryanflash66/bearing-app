-- TEMPORARY DEBUGGING MIGRATION
-- Disable RLS to check if Realtime events flow without policy restrictions

alter table notifications disable row level security;
alter table support_messages disable row level security;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
