-- Migration: Fix Function Search Path Mutable Warnings
-- Sets strict search_path = public for security critical functions (especially SECURITY DEFINER ones)

-- 1. prevent_audit_mutation()
ALTER FUNCTION public.prevent_audit_mutation() SET search_path = public;

-- 2. update_updated_at()
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- 3. prevent_usage_mutation()
ALTER FUNCTION public.prevent_usage_mutation() SET search_path = public;

-- 4. update_manuscript_word_count()
ALTER FUNCTION public.update_manuscript_word_count() SET search_path = public;

-- 5. set_manuscript_word_count()
ALTER FUNCTION public.set_manuscript_word_count() SET search_path = public;

-- 6. calculate_word_count(text)
ALTER FUNCTION public.calculate_word_count(text) SET search_path = public;

-- 7. prevent_version_mutation()
ALTER FUNCTION public.prevent_version_mutation() SET search_path = public;

-- 8. process_billing_cycle(uuid)
ALTER FUNCTION public.process_billing_cycle(uuid) SET search_path = public;
