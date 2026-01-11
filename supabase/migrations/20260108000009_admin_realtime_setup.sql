-- Admin Realtime Optimization: Custom Claims
-- Goal: Enable "Zero-Lookup" RLS for Admins by syncing role to JWT
-- This removes the need for joins/indexes during Realtime RLS evaluation

-- 1. Create Sync Function
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Update the auth.users metadata with the role
  -- We use coalesce to preserve existing metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.auth_id;
  
  RETURN NEW;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_user_role_update ON public.users;
CREATE TRIGGER on_user_role_update
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_auth();

-- 3. Backfill Existing Roles
-- Update auth.users for every user in public.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT auth_id, role FROM public.users WHERE auth_id IS NOT NULL LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', r.role)
    WHERE id = r.auth_id;
  END LOOP;
END;
$$;

-- 4. Update RLS Policy to use JWT Claim
DROP POLICY IF EXISTS "Users can view messages" ON public.support_messages;

CREATE POLICY "Users can view messages" 
ON public.support_messages FOR SELECT 
TO public 
USING (
  ticket_owner_auth_id = auth.uid() 
  OR 
  -- Zero-Lookup Check: Read from JWT
  -- Requires user to re-login to get updated token
  (auth.jwt() -> 'app_metadata' ->> 'role' IN ('support_agent', 'super_admin'))
);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
