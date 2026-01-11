-- Migration: Add Internal Note to Account Members
-- AC 4.2.5: Admin internal notes

alter table public.account_members add column if not exists internal_note text;
