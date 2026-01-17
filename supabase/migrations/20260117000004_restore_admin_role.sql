-- Migration: Restore 'admin' role to Enum
-- Story 4.1: Admin Role Architecture
-- Objective: Add 'admin' back to app_role enum to support the 4-tier hierarchy.

-- Postgres allows adding values to enums.
-- We use IF NOT EXISTS logic implicitly by catching duplicates if necessary, 
-- but 'ALTER TYPE ... ADD VALUE IF NOT EXISTS' is supported in newer Postgres (v12+).
-- Supabase likely uses Postgres 15+.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin' AFTER 'user';
