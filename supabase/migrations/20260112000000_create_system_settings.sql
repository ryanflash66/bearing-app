-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin access
-- Allows super_admins to perform ALL operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Super Admins can manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Deny access to everyone else (implicit by RLS enabled and no other policies)
