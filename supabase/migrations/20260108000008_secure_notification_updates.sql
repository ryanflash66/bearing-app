-- Fix: Secure Notifications Update Policy
-- Addresses security finding: Prevent ownership transfer via UPDATE

-- Drop the insecure policy (that only had USING)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Recreate with WITH CHECK to prevent changing auth_user_id to another user
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
TO public 
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Force schema reload
NOTIFY pgrst, 'reload schema';
