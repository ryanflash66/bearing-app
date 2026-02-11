-- Migration: add cover_url for AI cover generator workflow
-- Story 5.9

alter table public.manuscripts
add column if not exists cover_url text;

comment on column public.manuscripts.cover_url is 'Canonical selected cover URL from AI Cover Lab';

