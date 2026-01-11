-- Migration: Add priority to support_tickets
-- Story 4.2

-- Create enum for priority
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Add column to tickets
ALTER TABLE public.support_tickets 
ADD COLUMN priority public.ticket_priority NOT NULL DEFAULT 'medium';

-- Index
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
