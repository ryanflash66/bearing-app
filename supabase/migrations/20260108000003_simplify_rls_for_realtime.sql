-- Simplify RLS on notifications to use get_current_user_id() for better Realtime compatibility
drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;

create policy "Users can view own notifications"
on notifications for select
to public
using (user_id = get_current_user_id());

create policy "Users can update own notifications"
on notifications for update
to public
using (user_id = get_current_user_id());

-- Ensure support_messages policies are also optimal (re-asserting them to be sure)
-- Note: existing implementation uses get_current_user_id() which is good, but we verify they are enabled.
alter table notifications enable row level security;
alter table support_messages enable row level security;

-- Force a schema cache reload for the API
NOTIFY pgrst, 'reload schema';
