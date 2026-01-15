-- Migration: Create service marketplace tables
-- Story 5.2: ISBN Purchase Workflow (Stripe Integration)
-- Date: 2026-01-14

-- Create enum for service types
CREATE TYPE service_type AS ENUM (
  'isbn',
  'cover_design',
  'editing',
  'author_website',
  'marketing',
  'social_media',
  'publishing_help',
  'printing'
);

-- Create enum for service request status
CREATE TYPE service_request_status AS ENUM (
  'pending',      -- Created but not yet paid
  'paid',         -- Payment received, awaiting fulfillment
  'in_progress',  -- Being worked on by admin/designer
  'completed',    -- Service delivered
  'cancelled',    -- Cancelled/refunded
  'failed'        -- Payment failed
);

-- Create service_requests table
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  status service_request_status NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create isbn_pool table for tracking available ISBNs
CREATE TABLE isbn_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn VARCHAR(13) NOT NULL UNIQUE,
  assigned_to_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_service_type ON service_requests(service_type);
CREATE INDEX idx_service_requests_stripe_session_id ON service_requests(stripe_session_id);
CREATE INDEX idx_isbn_pool_unassigned ON isbn_pool(id) WHERE assigned_to_request_id IS NULL;

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE isbn_pool ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_requests

-- Users can view their own service requests
CREATE POLICY "Users can view own service requests"
  ON service_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own service requests
CREATE POLICY "Users can create own service requests"
  ON service_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins and support agents can view all service requests
CREATE POLICY "Admins can view all service requests"
  ON service_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('super_admin', 'support_agent')
    )
  );

-- Admins can update any service request
CREATE POLICY "Admins can update service requests"
  ON service_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('super_admin', 'support_agent')
    )
  );

-- RLS Policies for isbn_pool (admin-only)

-- Only admins can view isbn_pool
CREATE POLICY "Admins can view isbn pool"
  ON isbn_pool
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('super_admin')
    )
  );

-- Only admins can insert into isbn_pool
CREATE POLICY "Admins can insert isbn pool"
  ON isbn_pool
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('super_admin')
    )
  );

-- Only admins can update isbn_pool
CREATE POLICY "Admins can update isbn pool"
  ON isbn_pool
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('super_admin')
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add trigger for service_requests updated_at
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get available ISBN count (for pool warning)
CREATE OR REPLACE FUNCTION get_available_isbn_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM isbn_pool WHERE assigned_to_request_id IS NULL;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_isbn_count() TO authenticated;
