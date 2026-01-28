-- Migration: Add active service request constraint for manuscript sync/lock
-- Story 8.20: Sync & State (Manuscript ↔ Service)
-- Date: 2026-01-28

-- =============================================================================
-- 1. PARTIAL UNIQUE INDEX: Only one active request per manuscript (AC 8.20.5)
-- =============================================================================
-- This prevents multiple active requests (pending/paid/in_progress) for the same manuscript.
-- Allows: One 'pending' + one 'completed' for the same manuscript
-- Prevents: Two 'pending' requests for the same manuscript

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_requests_manuscript_active
ON service_requests(manuscript_id)
WHERE status IN ('pending', 'paid', 'in_progress')
AND manuscript_id IS NOT NULL;

-- =============================================================================
-- 2. LOOKUP INDEX: Efficient querying of active requests by manuscript (AC 8.20.1)
-- =============================================================================
-- Optimizes: SELECT * FROM service_requests WHERE manuscript_id = ? AND status IN (...)

CREATE INDEX IF NOT EXISTS idx_service_requests_manuscript_status
ON service_requests(manuscript_id, status)
WHERE manuscript_id IS NOT NULL;

-- =============================================================================
-- 3. RLS POLICY: Allow users to cancel their own pending requests (AC 8.20.4)
-- =============================================================================
-- This enables users to cancel their own pending service requests directly.
-- Constraint: Can only set status to 'cancelled' AND only when current status is 'pending'

-- Drop existing policy if it exists to avoid conflicts on re-run
DROP POLICY IF EXISTS "Users can cancel own pending service requests" ON service_requests;

CREATE POLICY "Users can cancel own pending service requests"
ON service_requests
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'
);

-- =============================================================================
-- 4. BACKFILL: Migrate manuscript_id from metadata to column (optional safety)
-- =============================================================================
-- For any existing rows where manuscript_id column is NULL but metadata has it,
-- copy the value to the proper column. This ensures legacy requests are detected.
-- Note: Only backfill if the metadata value is a valid UUID format.

UPDATE service_requests
SET manuscript_id = (metadata->>'manuscript_id')::uuid
WHERE manuscript_id IS NULL
AND metadata->>'manuscript_id' IS NOT NULL
AND metadata->>'manuscript_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- DOCUMENTATION: Status values and their meaning for manuscript locking
-- =============================================================================
-- ACTIVE (editing locked): 'pending', 'paid', 'in_progress'
-- INACTIVE (editing allowed): 'completed', 'cancelled', 'failed'
--
-- The partial unique index ensures only ONE active request per manuscript at a time.
-- The RLS policy allows users to cancel only their own pending requests.
