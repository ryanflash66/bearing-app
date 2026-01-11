-- Migration: Fix Security Definer View Error
-- Set security_invoker = true to respect RLS policies of the invoker

-- Fix: user_current_usage (security_definer_view)
-- The view was originally created without security_invoker = true, meaning it ran with owner permissions.
-- This change ensures it runs with the permissions of the querying user (respecting RLS).

alter view public.user_current_usage set (security_invoker = true);
