-- Refine Realtime Optimization
-- Address Code Review Feedback: Simplify RLS Policy and improve performance

-- 1. Optimize Support Messages Policy
-- Replace nested SELECT with single EXISTS join on auth_id
-- Prevents "more than one row returned" errors and reduces scans
DROP POLICY IF EXISTS "Users can view messages" ON public.support_messages;

CREATE POLICY "Users can view messages" 
ON public.support_messages FOR SELECT 
TO public 
USING (
  ticket_owner_auth_id = auth.uid() 
  OR 
  (EXISTS ( 
    SELECT 1 
    FROM public.users u
    WHERE u.auth_id = auth.uid() 
    AND u.role IN ('support_agent', 'super_admin')
  ))
);

-- Note: The destructive cleanup from the previous migration (06) has already run.
-- Future migrations should prefer soft-deletion or quarantine for "orphaned" production data.
 
-- Force schema reload to apply policy changes immediately
NOTIFY pgrst, 'reload schema';
