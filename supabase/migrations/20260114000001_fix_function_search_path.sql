-- Migration: Fix function search_path security issue
-- Story 5.2 Code Review: Address Supabase security advisor warning
-- Date: 2026-01-14

-- Fix update_updated_at_column function to have immutable search_path
-- This prevents search_path injection attacks
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
