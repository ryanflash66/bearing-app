-- Migration: Secure Role Assignment RPC
-- Story 4.1: Admin Role Architecture
-- Objective: Encapsulate role changes in a secure function callable only by the Super Admin.

-- 1. Create the RPC function
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  new_role public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executor_id uuid;
  is_super boolean;
  old_role public.app_role;
BEGIN
  -- Get ID of the user executing the function
  executor_id := auth.uid();

  -- Verify Executing User is Super Admin
  -- We query the users table directly to ensure we have the latest truth
  SELECT (role = 'super_admin'::public.app_role) INTO is_super
  FROM public.users
  WHERE auth_id = executor_id;

  IF is_super IS NOT TRUE THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admin can assign roles.' USING ERRCODE = '42501';
  END IF;

  -- Prevent assigning 'super_admin' role via this function 
  -- (Super admin transfer involves DB migration or careful process to maintain singleton, 
  -- but for safety we block it here to prevent accidental dual-super-admin attempts 
  -- which would fail DB constraint anyway, but this is a cleaner error).
  IF new_role = 'super_admin'::public.app_role THEN
    RAISE EXCEPTION 'Operation Not Allowed: Cannot assign super_admin role via RPC.' USING ERRCODE = '42501';
  END IF;

  -- Get old role for audit logging
  SELECT role INTO old_role FROM public.users WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- Perform the Update
  UPDATE public.users 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  -- Log to Audit Logs
  -- We assume the Super Admin belongs to *some* account, but audit_logs requires account_id.
  -- For system-level actions, we might need a system account or nullable account_id.
  -- Checking audit_logs definition: account_id is NOT NULL.
  -- We will fetch the target user's primary account owner's account or similar.
  -- Ideally, the Super Admin should perform this context-free, but our schema requires an account context.
  -- Strategy: Log it under the TARGET USER's primary account context if possible, 
  -- or a "System" account if we had one.
  -- For now, we'll try to find an account where the target_user is a member.
  
  IF NOT EXISTS (SELECT 1 FROM public.account_members WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'Audit Log Failed: Target user % has no account membership', target_user_id;
  END IF;
  
  INSERT INTO public.audit_logs (
    account_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  SELECT 
    am.account_id,
    (SELECT id FROM public.users WHERE auth_id = executor_id), -- The actor (Super Admin) app-level ID
    'assign_role',
    'user',
    target_user_id,
    jsonb_build_object(
      'old_role', old_role,
      'new_role', new_role,
      'executor_auth_id', executor_id
    )
  FROM public.account_members am
  WHERE am.user_id = target_user_id
  ORDER BY am.account_id ASC
  LIMIT 1;
  -- Note: If target user has no account, audit log insert might fail due to NOT NULL constraint.
  -- This is an acceptable edge case constraint for now: Users must belong to an account.

  RETURN TRUE;
END;
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
