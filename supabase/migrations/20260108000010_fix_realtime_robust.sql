-- Fix Realtime RLS: Fallback to Robust DB Lookup
-- The Custom Claims approach (Migration 09) requires user re-login and is fragile.
-- We revert to using the optimize `is_platform_support()` function.
-- This function is SECURITY DEFINER (bypasses users RLS) and uses the new INDEX (fast).

DROP POLICY IF EXISTS "Users can view messages" ON public.support_messages;

CREATE POLICY "Users can view messages" 
ON public.support_messages FOR SELECT 
TO public 
USING (
  ticket_owner_auth_id = auth.uid() 
  OR 
  public.is_platform_support()
);

-- Note: is_platform_support() is defined as:
-- SELECT EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('super_admin', 'support_agent'))
-- This uses our new idx_users_auth_id for performance.

-- Force schema reload
NOTIFY pgrst, 'reload schema';
