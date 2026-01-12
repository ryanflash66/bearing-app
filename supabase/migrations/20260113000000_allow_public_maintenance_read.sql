-- Add policy to allow anyone (authenticated or anon) to read the maintenance_mode setting.
-- This is required for the client-side global banner to function for non-super-admins.

CREATE POLICY "Public can read maintenance mode"
ON public.system_settings
FOR SELECT
TO public
USING (key = 'maintenance_mode');
