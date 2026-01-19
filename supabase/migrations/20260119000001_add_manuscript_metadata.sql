-- Migration: Add Metadata to Manuscripts
-- Story 7.3: Publication Metadata Management
-- Adds a JSONB column to store publishing details (ISBN, Copyright, BISAC, etc.)

alter table public.manuscripts
add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.manuscripts.metadata is 'Stores publication details: isbn13, copyright_holder, bisac_codes[], keywords[], etc.';
