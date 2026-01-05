# Story H.2: Security & RLS Hardening

## Description
Conduct a systematic verification of data isolation and privileged operations to ensure strict multi-tenant security. This story focuses on "Cross-Account Leak" prevention and standardizing the "RPC-First" pattern for sensitive state changes, eliminating potential RLS bypasses or misconfigurations.

## Acceptance Criteria

### AC H.2.1: Cross-Account Isolation
- **Given** User A and User B are in different accounts (workspaces)
- **When** User A attempts to query `manuscripts`, `audit_logs`, `consistency_checks`, or `suggestions` belonging to User B
- **Then** the query returns 0 results
- **And** no error is thrown (RLS silently filters).

### AC H.2.2: AI Artifact Isolation
- **Given** an AI artifacts table (`suggestions`, `consistency_checks`)
- **When** User A tries to view artifacts for a manuscript they do not own
- **Then** access is denied via RLS policy `manuscript_id` checks.

### AC H.2.3: RPC-First Standardization
- **Given** a sensitive operation (e.g., creating an account, changing membership status)
- **When** the client application triggers this action
- **Then** it must call a PostgreSQL function (RPC) or Server Action
- **And** direct client-side `insert/update` permissions on `accounts` and `profile_account_members` should be restricted.

## Implementation Tasks

- [x] Create `tests/integration/security-cross-account.test.ts` to verify isolation. (Implemented as `scripts/verify-rls.ts`)
  - [x] Test Manuscript leakage.
  - [x] Test AI Suggestion leakage.
  - [x] Test Audit Log leakage.
- [x] Audit and fix RLS policies for `consistency_checks` table. (Verified)
- [x] Audit and fix RLS policies for `suggestions` table. (Verified)
- [x] Verify `manuscripts` RLS properly cascades access to child tables. (Verified via tests)
- [x] Document the "RPC-First" pattern in `docs/architecture-security.md`.

## Technical Notes
- **Critical Tables**: `manuscripts`, `chapters`, `suggestions`, `consistency_checks`, `audit_logs`.
- **Testing Strategy**: Create two test users in separate accounts. Attempt to fetch User B's resources using User A's client.
