-- Migration: Fix recover_stale_jobs function search_path security issue
-- Address Supabase security advisor warning
-- Date: 2026-01-14

-- Fix recover_stale_jobs function to have immutable search_path
-- This prevents search_path injection attacks
CREATE OR REPLACE FUNCTION public.recover_stale_jobs(
  timeout_minutes int default 30
)
RETURNS TABLE (
  failed_count bigint,
  job_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_ids uuid[];
  count_val bigint;
BEGIN
  -- Identify stale jobs
  -- Logic: status='running' AND created_at < now() - interval 'X minutes'

  WITH stalled AS (
    UPDATE public.consistency_checks
    SET
      status = 'failed',
      error_message = 'Job timed out or system restarted (resilience recovery)',
      completed_at = now()
    WHERE
      status = 'running'
      AND created_at < now() - (timeout_minutes || ' minutes')::interval
    RETURNING id
  )
  SELECT
    count(*),
    array_agg(id)
  INTO
    count_val,
    failed_ids
  FROM stalled;

  -- Ensure we return 0/empty array if no rows found
  IF count_val IS NULL THEN
    count_val := 0;
    failed_ids := array[]::uuid[];
  END IF;

  RETURN QUERY SELECT count_val, failed_ids;
END;
$$;
