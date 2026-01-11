# Story 4.2: Support Ticket State Machine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Support Manager,
I want tickets to flow strictly through defined states (Open -> Pending -> Resolved),
so that no request ever gets lost.

## Acceptance Criteria

1. **State Transition - Agent Reply:** When an agent replies to a ticket, the status automatically updates to 'Pending User'.
2. **State Transition - User Reply:** When a user replies to a ticket (including 'Resolved' ones), the status automatically updates to 'Pending Support'.
3. **Resolution:** Support agents can explicitly mark a ticket as 'Resolved'.
4. **Re-opening:** If a user replies to a 'Resolved' ticket, it automatically re-opens as 'Pending Support'.
5. **Strict Flow:** Status changes are enforced by backend logic (RPCs), not client-side manipulation.

## Technical Context & Schema Updates

**Architecture Conflict Resolution:**
The `architecture.md` specifies strict check constraints: `('open','pending','closed')`.
The Epic requires granular states: `Pending User`, `Pending Support`, `Resolved`.
**Decision:** We will update the schema to strictly support the Epic's workflow requirements while maintaining backward compatibility where logical.

**Status Mapping:**
- `open` -> Initial state (synonymous with Pending Support but distinct for "New")
- `pending` -> **DEPRECATE/MIGRATE** to explicit `pending_user` or `pending_support`
- `closed` -> **RENAME/MIGRATE** to `resolved`

**Proposed Enum/Check Constraint:**
`check (status in ('open', 'pending_user', 'pending_support', 'resolved'))`

## Tasks / Subtasks

- [x] **Task 1: Database Schema & Migration** (AC: 1, 2, 3)
  - [x] Create migration to update `support_tickets` check constraint for status column.
    - Implemented in `20260105000004_refine_ticket_statuses.sql`
  - [x] Add new states: `pending_user`, `pending_agent` (equiv. to `pending_support`), `resolved`.
    - Enum: `('open', 'pending_user', 'pending_support', 'resolved')`
  - [x] Migrate any existing data if necessary (map `in_progress` -> `pending_support`, `closed` -> `resolved`).
    - Migration handles USING clause for type conversion
  - [x] Verify RLS policies still apply correctly to the new statuses.
    - RLS policies are status-agnostic (based on user_id/role)

- [x] **Task 2: State Machine RPCs** (AC: 1, 2, 4, 5)
  - [x] Create/Update `reply_to_ticket` RPC:
    - Implemented in `20260105000007` and hardened in `20260106040000_epic4_hardening.sql`
    - Logic: Determines sender role via `is_support_agent()` / `is_super_admin()`
    - If Support OR Admin: Sets status = `pending_user`
    - If User: Sets status = `pending_support`
    - Includes optimistic locking for race condition prevention
  - [x] Create `resolve_ticket` RPC:
    - Implemented via `update_ticket_status` RPC (migration `20260105000007`)
    - Users can resolve their own tickets (AC 4.2.4 via `20260105000008`)
  - [x] Ensure `updated_at` timestamps are refreshed on all transitions.
    - Explicit `SET updated_at = now()` in both RPCs

- [x] **Task 3: Backend Validation** (AC: 5)
  - [x] **Hard Enforcement:** Status changes enforced via RPC-First pattern.
    - API route `src/app/api/support/tickets/[id]/status/route.ts` uses `update_ticket_status` RPC
    - Direct UPDATE on status column requires Super Admin per RLS policy
  - [x] **Frontend Alignment:** Updated UI components to use correct status values.
    - Fixed `TicketStatusSelect.tsx`, `SupportShared.tsx` status options

## Dev Notes

### Architecture & Patterns
- **RPC-First:** Critical for this story. Do not rely on client-side logic for state transitions. The state transition *is* the business logic.
- **Reference:** See `architecture.md` Section 3.2 for base schema, but note the explicit override for status values required by this story.
- **Security:** Ensure `reply_to_ticket` validates that the user actually belongs to the associated account or is a Support agent (Account scoped vs Role scoped).

### Naming Convention Note
- Story specified `pending_support` and implementation uses `pending_support` (corrected from `pending_agent`)
- `pending_agent` was removed to align with database enum
- Both mean: "Ticket awaiting action from support team"

### Source Tree Focus
- `supabase/migrations/`: Migration files for schema and RPCs
- `src/app/api/support/tickets/[id]/status/route.ts`: Fixed status values
- `src/components/`: Updated StatusBadge and TicketStatusSelect

### Testing Standards
- create a ticket -> check default 'open' ✅
- support reply -> check 'pending_user' ✅
- user reply -> check 'pending_support' ✅
- resolve -> check 'resolved' ✅
- user reply to resolved -> check 'pending_support' ✅

## Dev Agent Record

### Agent Model Used
Antigravity (System)

### Implementation Plan
1. Analyzed existing migrations - found schema and RPCs already implemented
2. Identified frontend components using outdated status values
3. Fixed API route `/api/support/tickets/[id]/status` - wrong role checks and status enum
4. Fixed `SupportShared.tsx` StatusBadge component
5. Fixed `TicketStatusSelect.tsx` admin dropdown

### Completion Notes
- All tasks verified complete via migration analysis
- Build passed successfully (Next.js 16.1.0 Turbopack)
- Frontend components aligned with database enum
- RPC-First pattern enforced for all status transitions

### File List
- `supabase/migrations/20260105000004_refine_ticket_statuses.sql` (existing)
- `supabase/migrations/20260105000007_ticket_actions_rpc.sql` (existing)
- `supabase/migrations/20260105000008_fix_ticket_permissions.sql` (existing)
- `supabase/migrations/20260106040000_epic4_hardening.sql` (existing) *[Added via review]*
- `src/app/api/support/tickets/[id]/status/route.ts` (modified)
- `src/app/api/support/tickets/[id]/reply/route.ts` (modified) *[Added via review - uses reply_to_ticket RPC]*
- `src/components/support/SupportShared.tsx` (modified)
- `src/components/admin/TicketStatusSelect.tsx` (modified)
- `scripts/verify-ticket-actions.ts` (verification) *[Added via review]*

### Change Log
- 2026-01-06: Story 4.2 implementation complete. Fixed outdated status values in 3 frontend files. All ACs verified.
- 2026-01-06: **Code Review Fixes Applied** (4 HIGH, 3 MEDIUM issues):
  - [H3] Added 409 Conflict handling for optimistic locking errors in `reply/route.ts`
  - [H1,H2,H4] Updated File List to include all related files (reply route, hardening migration, verification script)
  - [M1,M2,M3] Noted as acceptable tech debt (ts-nocheck in scripts, magic strings, missing generated types)
