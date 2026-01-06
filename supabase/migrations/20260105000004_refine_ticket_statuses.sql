-- Migration: Refine ticket statuses
-- Story 4.2: Support Ticket Engine

-- 1. Rename old type to avoid conflict
ALTER TYPE public.support_ticket_status RENAME TO support_ticket_status_old;

-- 2. Create new type with granular states
CREATE TYPE public.support_ticket_status AS ENUM ('open', 'pending_user', 'pending_agent', 'resolved');

-- 3. Update support_tickets table to use new type
-- First, drop default to avoid casting errors
ALTER TABLE public.support_tickets ALTER COLUMN status DROP DEFAULT;

-- Then convert column
ALTER TABLE public.support_tickets 
  ALTER COLUMN status TYPE public.support_ticket_status 
  USING (
    CASE status::text
      WHEN 'open' THEN 'open'::public.support_ticket_status
      WHEN 'in_progress' THEN 'pending_agent'::public.support_ticket_status
      WHEN 'resolved' THEN 'resolved'::public.support_ticket_status
      WHEN 'closed' THEN 'resolved'::public.support_ticket_status
      ELSE 'open'::public.support_ticket_status
    END
  );

-- Restore default
ALTER TABLE public.support_tickets ALTER COLUMN status SET DEFAULT 'open'::public.support_ticket_status;

-- 4. Clean up old type
DROP TYPE public.support_ticket_status_old;

-- 5. Refresh index ensures it uses the new operator class for the new enum
DROP INDEX IF EXISTS idx_support_tickets_status;
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
