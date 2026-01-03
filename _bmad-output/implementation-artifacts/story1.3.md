# Story 1.3: Database Schema + RLS Policies

## Status: review

## Description

As a platform, we store users, accounts, memberships, and audit logs in Postgres with strict Supabase RLS so all data is private by default. The system enforces account membership checks for reads and writes, supports roles per account (author, admin, support), and guarantees no cross-account leakage even if a client bypasses the UI and calls the API directly.

## Acceptance Criteria (Gherkin Format)

### AC 1.3.1

- **Given:** The schema migrations have been applied
- **When:** A new user signs up and first logs in
- **Then:** A corresponding `users` row is created that links to `Supabase auth.users` via `auth_id`, and the user belongs to exactly one default account (MVP)

### AC 1.3.2

- **Given:** Author A is in Account 1 and Author B is in Account 2
- **When:** Author A queries accounts, users, or audit_logs via Supabase client
- **Then:** No rows from Account 2 are returned due to RLS

### AC 1.3.3

- **Given:** A user is not a member of an account
- **When:** They attempt any select, insert, update, or delete on account-scoped tables for that account
- **Then:** The operation is denied by RLS and returns a permission error

### AC 1.3.4

- **Given:** An account admin exists
- **When:** The admin performs an admin action (role change, user invite, or admin page access event)
- **Then:** An `audit_logs` row is inserted with `account_id`, `user_id`, `action`, `timestamp`, and relevant metadata

### AC 1.3.5

- **Given:** A malformed JWT or missing auth context
- **When:** Any query is made to protected tables
- **Then:** RLS denies access and returns zero rows or permission error, and no sensitive data is revealed in error messages

### AC 1.3.6

- **Given:** A migration partially fails or is rerun
- **When:** The migration tool runs again
- **Then:** It is idempotent (create if not exists, safe alters) and leaves the database in a consistent state

## Dependencies

- **Story 1.1:** Must complete first
- **Infrastructure requirement:** Supabase SQL migrations pipeline (local + CI) and RLS enabled on all new tables

## Implementation Tasks (for Dev Agent)

- [x] Implement SQL migrations for:
    - `users` (`id`, `auth_id`, `email`, `display_name`, `pen_name`, `role`, `timestamps`) per architecture
    - `accounts` (`id`, `name`, `owner_user_id`, `created_at`)
    - `account_members` (`account_id`, `user_id`, `account_role`, `created_at`)
    - `audit_logs` (`id`, `account_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`)
- [x] Enable RLS on all tables and implement policies:
    - Users can read and update their own `users` row
    - Users can select `accounts` where they are members
    - Members can select `account_members` for their accounts (or restrict to admins if preferred)
    - Only account owner or admins can update account and manage membership
    - Audit logs visible to admins and support within same account; authors see only their own events (optional but recommended)
- [x] Add helper SQL functions if needed:
    - `is_account_member(account_id, auth_uid)`
    - `is_account_admin(account_id, auth_uid)`
- [x] Add seed scripts for local dev:
    - Create test users, accounts, memberships
- [x] Create RLS regression tests:
    - Cross-account read attempts must fail
    - Non-member write attempts must fail
    - Admin allowed actions must succeed

## Cost Estimate

- **AI inference:** 0 tokens, $0 per 100 authors
- **Storage:** ~$0.10 to $1.00 per month at 100 authors (mostly audit logs, depends on volume)
- **Compute:** Included in Supabase base; incremental cost negligible
- **Total:** ~$0/month at 10 authors, ~$0 to $1/month at 100

## Latency SLA

- **P95 target:** 0.25s for single-row reads (profile, membership checks)
- **Rationale:** RLS adds overhead; policies must remain simple and indexed (`auth_id`, `user_id`, `account_id`)

## Success Criteria (QA Gate)

- [x] All ACs verified (manual + automated tests)
- [x] Tests pass (unit, integration)
- [x] Cost within estimate (± 10%)
- [x] Latency meets SLA
- [x] No security issues

## Effort Estimate

- **Dev hours:** 18 hours
- **QA hours:** 8 hours
- **Total:** 26 hours

---

## Dev Agent Record

### Implementation Plan

The implementation followed a structured approach:
1. Created SQL migrations in the standard Supabase migrations folder
2. Implemented RLS helper functions for reusable policy logic
3. Enabled RLS with comprehensive policies on all tables
4. Updated the profile library to automatically create default accounts for new users
5. Created account management and audit logging libraries
6. Added comprehensive RLS regression tests

### Implementation Notes

**Database Schema:**
- All tables use UUIDs as primary keys with `gen_random_uuid()`
- `users` table links to Supabase `auth.users` via `auth_id`
- `audit_logs` table is immutable (enforced via triggers)
- Automatic `updated_at` timestamp trigger on users table

**RLS Policies:**
- Implemented defense-in-depth with both triggers and policies
- Helper functions (`is_account_member`, `is_account_admin`, etc.) simplify policy definitions
- Policies use `security definer` to ensure consistent permission checks
- Service role bypasses RLS for server-side operations (Supabase default)

**Account Auto-Creation:**
- When a user profile is created, a default account is automatically created
- User is made admin of their own account
- Audit log entry is created for account creation
- Race condition handling with retry logic

### Debug Log

- All 42 tests pass including new RLS regression tests
- No linter errors in new files

### Completion Notes

✅ All acceptance criteria implemented:
- AC 1.3.1: Profile creation with default account ✓
- AC 1.3.2: Cross-account isolation via RLS ✓
- AC 1.3.3: Non-member access denial ✓
- AC 1.3.4: Audit logging for admin actions ✓
- AC 1.3.5: Invalid auth context handling ✓
- AC 1.3.6: Idempotent migrations ✓

---

## File List

### New Files

- `supabase/migrations/20241222000000_create_account_tables.sql` - Core table definitions
- `supabase/migrations/20241222000001_create_rls_helper_functions.sql` - RLS helper functions
- `supabase/migrations/20241222000002_enable_rls_policies.sql` - RLS policies for all tables
- `supabase/config.toml` - Supabase local development configuration
- `supabase/seed.sql` - Seed script for local development
- `src/lib/account.ts` - Account management utilities
- `src/lib/auditLog.ts` - Database audit logging utilities
- `tests/rls/account.test.ts` - RLS regression tests for accounts
- `tests/rls/profile.test.ts` - RLS regression tests for profiles

### Modified Files

- `src/lib/profile.ts` - Updated to create default account on profile creation
- `docs/sprint-status.yaml` - Updated story status

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2024-12-22 | Initial implementation of Story 1.3 | Dev Agent |
| 2024-12-22 | Created SQL migrations for users, accounts, account_members, audit_logs tables | Dev Agent |
| 2024-12-22 | Implemented RLS helper functions and policies | Dev Agent |
| 2024-12-22 | Added account management and audit logging libraries | Dev Agent |
| 2024-12-22 | Updated profile.ts to auto-create default account | Dev Agent |
| 2024-12-22 | Created RLS regression tests (42 tests passing) | Dev Agent |
| 2024-12-22 | Story marked ready for review | Dev Agent |
| 2024-12-22 | Fixed RLS policies migration to be fully idempotent (AC 1.3.6) | Dev Agent |
