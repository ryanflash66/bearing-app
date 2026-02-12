-- Story 5.6.1: Vertex AI Context Caching tables and functions
-- Task 2.4: Create vertex_ai_caches table
-- Task 4.1: Add metadata JSONB to ai_usage_events
-- Task 2.1: Advisory lock functions for concurrency

-- ─── vertex_ai_caches table ─────────────────────────────────────────────────
-- Stores Vertex AI CachedContent resource references linked to manuscripts.
-- RLS enabled per Dev Notes: Cache Isolation.

CREATE TABLE IF NOT EXISTS public.vertex_ai_caches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_id TEXT NOT NULL,                        -- Vertex AI resource name
  manuscript_id UUID NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  input_hash TEXT NOT NULL,                      -- SHA-256 of normalized manuscript content
  token_count INTEGER NOT NULL DEFAULT 0,        -- Tokens in cached content
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL                -- When the Vertex cache expires
);

-- Indexes for performant queries
CREATE INDEX IF NOT EXISTS idx_vertex_ai_caches_manuscript ON public.vertex_ai_caches(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_vertex_ai_caches_account ON public.vertex_ai_caches(account_id);
CREATE INDEX IF NOT EXISTS idx_vertex_ai_caches_expires ON public.vertex_ai_caches(expires_at);
CREATE INDEX IF NOT EXISTS idx_vertex_ai_caches_hash ON public.vertex_ai_caches(manuscript_id, input_hash);

-- Enable RLS (Dev Notes: Cache Isolation)
ALTER TABLE public.vertex_ai_caches ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only see caches for their own account
CREATE POLICY "Users can view own caches"
  ON public.vertex_ai_caches FOR SELECT
  USING (account_id = (SELECT account_id FROM public.users WHERE auth_id = auth.uid()));

-- Service role can manage all caches (for cleanup cron, admin)
CREATE POLICY "Service role manages all caches"
  ON public.vertex_ai_caches FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Add metadata JSONB to ai_usage_events ──────────────────────────────────
-- Task 4.1: Safe IF NOT EXISTS to avoid locks on existing deployments
-- AC 5.6.1.5: Store cache_creation_tokens vs cache_hit_tokens

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_events'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.ai_usage_events ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

-- ─── Advisory Lock Functions for Cache Concurrency ──────────────────────────
-- Task 2.1: Prevent race conditions on simultaneous cache creation.
-- Uses pg_advisory_xact_lock_shared with a hash of the lock key.
-- M2: SECURITY INVOKER - these are called via service_role client only.

CREATE OR REPLACE FUNCTION public.try_advisory_lock(lock_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- Convert text key to a stable bigint hash for pg_try_advisory_lock
  lock_id := ('x' || left(md5(lock_key), 15))::bit(60)::bigint;
  RETURN pg_try_advisory_lock(lock_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_advisory_lock(lock_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  lock_id := ('x' || left(md5(lock_key), 15))::bit(60)::bigint;
  RETURN pg_advisory_unlock(lock_id);
END;
$$;
