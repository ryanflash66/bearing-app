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

- [ ] Build Page: `/admin/super` (Dashboard).
- [ ] Implement Metrics Aggregation queries (ensure they are performant, maybe cached).
- [ ] Create "User Management" modal/page for Overrides.
- [ ] Implementation maintenance mode state (Config/DB flag) and middleware check (optional extension).

## Cost Estimate

- **Storage:** None
- **Compute:** Aggregation queries can be heavy; index appropriately.
- **Total:** Minimal

## Latency SLA

- **P95 target:** <2s
- **Rationale:** internal analytical tool

## Success Criteria (QA Gate)

- [ ] Metrics load accurately
- [ ] Overrides successfully change DB state
- [ ] Only Super Admin can access
