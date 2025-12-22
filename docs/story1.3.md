# Story 1.3: Database Schema + RLS Policies

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

- [ ] Implement SQL migrations for:
    - `users` (`id`, `auth_id`, `email`, `display_name`, `pen_name`, `role`, `timestamps`) per architecture
    - `accounts` (`id`, `name`, `owner_user_id`, `created_at`)
    - `account_members` (`account_id`, `user_id`, `account_role`, `created_at`)
    - `audit_logs` (`id`, `account_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`)
- [ ] Enable RLS on all tables and implement policies:
    - Users can read and update their own `users` row
    - Users can select `accounts` where they are members
    - Members can select `account_members` for their accounts (or restrict to admins if preferred)
    - Only account owner or admins can update account and manage membership
    - Audit logs visible to admins and support within same account; authors see only their own events (optional but recommended)
- [ ] Add helper SQL functions if needed:
    - `is_account_member(account_id, auth_uid)`
    - `is_account_admin(account_id, auth_uid)`
- [ ] Add seed scripts for local dev:
    - Create test users, accounts, memberships
- [ ] Create RLS regression tests:
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

- [ ] All ACs verified (manual + automated tests)
- [ ] Tests pass (unit, integration)
- [ ] Cost within estimate (± 10%)
- [ ] Latency meets SLA
- [ ] No security issues

## Effort Estimate

- **Dev hours:** 18 hours
- **QA hours:** 8 hours
- **Total:** 26 hours