# Story 4.5: Super Admin Dashboard

## Description

As a Super Admin, I want a high-level view of system health and override controls, so that I can manage the business and handle emergencies. This includes global metrics and the "break glass" controls for user accounts.

## Acceptance Criteria (Gherkin Format)

### AC 4.5.1: Global Metrics

- **Given:** The super admin dashboard
- **When:** Loaded
- **Then:** Key metrics are displayed: Total Token Burn (Cost Proxy), Active Users, Revenue Estimate (if available), Open Ticket Count

### AC 4.5.2: User Overrides ("Break Glass")

- **Given:** A specific user selected in the admin view
- **When:** Super admin clicks "Override / Manage"
- **Then:** Options available: Reset Usage Limits, Toggle Plan/Tier, Ban/Unban

### AC 4.5.3: Maintenance Mode

- **Given:** A critical system maintenance need
- **When:** Super Admin toggles "Maintenance Mode"
- **Then:** A system-wide flag is set that pauses new job submissions (Consistency Checks, large exports) gracefully

## Dependencies

- **Story 4.1:** Authorization (Super Admin Role)
- **Story 2.5 / 3.3:** Usage Data sources

## Implementation Tasks (for Dev Agent)

- [x] Build Page: `/admin/super` (Dashboard). -> Implemented as `/dashboard/admin/super`
- [x] Implement Metrics Aggregation queries (ensure they are performant, maybe cached). -> `lib/super-admin.ts`
- [x] Create "User Management" modal/page for Overrides. -> Links to existing `/dashboard/admin/members`
- [ ] Implementation maintenance mode state (Config/DB flag) and middleware check. -> **DEFERRED to Story 4.5.1**

## Status
Done

## File List
- src/app/dashboard/admin/super/page.tsx
- src/lib/super-admin.ts

## Deferred Items
- **AC 4.5.3 (Maintenance Mode)**: Requires middleware integration and system-wide flag. Planned for Story 4.5.1.

## Cost Estimate

- **Storage:** None
- **Compute:** Aggregation queries can be heavy; index appropriately.
- **Total:** Minimal

## Latency SLA

- **P95 target:** <2s
- **Rationale:** internal analytical tool

## Success Criteria (QA Gate)

- [x] Metrics load accurately
- [x] Overrides successfully change DB state (via existing admin/members)
- [x] Only Super Admin can access

## Senior Developer Review (AI)
**Date:** 2026-01-05  
**Reviewer:** Amelia (Code Review Agent)  
**Decision:** ✅ APPROVED

**Issues Found & Fixed:**
- H1: Added `revenueEstimate` field to GlobalMetrics (returns null per AC 4.5.1 "if available")
- M3: Replaced magic number cost estimate with named constant
- L2: Verified `/dashboard/admin/audit` route exists
