-- Enable Supabase Realtime for notifications table
-- This allows the frontend to receive INSERT events in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
