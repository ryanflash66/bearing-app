# Story 4.4: Support Agent Dashboard

## Description

As a Support Agent, I want a dedicated dashboard with a queue and user context snapshot, so that I can resolve issues efficiently without asking basic questions. This workspace aggregates all open issues and provides the data needed to solve them.

## Acceptance Criteria (Gherkin Format)

### AC 4.4.1: User Snapshot Side-Panel

- **Given:** An agent viewing a specific ticket
- **When:** The page loads
- **Then:** A side panel displays key user context: Subscription Tier, Usage Limit Status, Last Error Log (if available)

### AC 4.4.2: Queue Management & Stale Detection

- **Given:** The main ticket queue view
- **When:** Loaded
- **Then:** Tickets are sorted by priority/age
- **And:** 'Stale' tickets (e.g., pending agent > 48h) are visually highlighted (Red indicator/border)

### AC 4.4.3: PII Masking

- **Given:** Sensitive user data in the snapshot (Email, Billing)
- **When:** Displayed to the Agent
- **Then:** PII is masked or hidden by default (e.g., `j***@gmail.com`), unless a specific "Reveal" action is taken (if architected), or simply kept minimized. *Refining per Principle: Strict Privacy.* PII should be minimized.

### AC 4.4.4: Agent Actions

- **Given:** A ticket
- **When:** Agent enters a reply and clicks "Send & Resolve" (or just Send)
- **Then:** The message is sent and status updated atomically (RPC call)

## Dependencies

- **Story 4.1:** Roles (Agent Access)
- **Story 4.2:** Ticket Engine

## Implementation Tasks (for Dev Agent)

- [x] Build Page: `/admin/support` (Agent Queue) with filtering/sorting. -> Implemented as `/dashboard/admin/support`
- [x] Build Page: `/admin/support/[id]` (Agent Ticket View). -> Implemented as `/dashboard/admin/support/[id]`
- [x] Implement "User Snapshot" component (fetching data from profile/usage tables). -> `UserSnapshotPanel.tsx`
- [x] Implement "Stale" logic in the UI or backend query. -> 48h threshold with red highlight
- [x] Ensure Role Guards protect these routes (Admin/Support only). -> Via `admin/layout.tsx`

## Status
Done

## File List
- src/app/dashboard/admin/support/page.tsx
- src/app/dashboard/admin/support/[id]/page.tsx
- src/components/admin/UserSnapshotPanel.tsx
- src/lib/user-snapshot.ts
- src/app/api/support/tickets/route.ts (RPC refactor - AC 4.4.4)
- src/app/api/support/tickets/[id]/reply/route.ts (RPC refactor - AC 4.4.4)

## Cost Estimate

- **Storage:** None
- **Compute:** Complex queries (joins on user/usage)
- **Total:** Minimal

## Latency SLA

- **P95 target:** <1s for dashboard load
- **Rationale:** Internal tool, data density is higher

## Success Criteria (QA Gate)

- [x] Agent can see queue
- [x] Agent can see user context
- [x] Reply updates status correctly
- [x] Non-agents cannot access these pages

## Senior Developer Review (AI)
**Date:** 2026-01-05  
**Reviewer:** Amelia (Code Review Agent)  
**Decision:** ✅ APPROVED

**Issues Found & Fixed:**
- H1: Revenue estimate field added to GlobalMetrics (AC 4.5.1 concern)
- H3: File List updated to include RPC refactor files
- H4: Removed unused `priorityOrder` variable (dead code)
- M3: Replaced magic number with `COST_PER_1K_TOKENS` constant
- L1: Removed duplicate `formatDate` function, now uses shared import
- L3: Added JSDoc to `isStaleTicket()` function
- H2: Added security note about PII handling in `getUserSnapshot`
