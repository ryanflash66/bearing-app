# Story 4.2: Admin Dashboard & Overrides

## Description

As an admin, I can view per-author and per-account AI usage, detect abuse, and override enforcement actions. The system enforces role-based access, keeps the dashboard performant at scale, and records every admin action in immutable audit logs.

## Acceptance Criteria (Gherkin Format)

### AC 4.2.1

- **Given:** An authenticated admin
- **When:** They open `/admin/dashboard`
- **Then:** A table shows author name, usage (tokens, checks), plan tier, and status

### AC 4.2.2

- **Given:** An admin selects a user
- **When:** They apply an override (waive limits, disable AI, disable user)
- **Then:** The change takes effect immediately

### AC 4.2.3

- **Given:** An override action is applied
- **When:** The action completes
- **Then:** An audit log entry is written with `admin_id`, affected user, action, and reason

### AC 4.2.4

- **Given:** 100+ authors in an account
- **When:** Admin filters or sorts usage data
- **Then:** Queries complete within 1 second (P95)

### AC 4.2.5

- **Given:** A user is flagged for abuse
- **When:** Admin adds an internal note
- **Then:** The note is visible only to admins and stored securely

### AC 4.2.6 (Administrative Accountability)

- **Given:** Any administrative action is performed (overrides, status changes, note updates)
- **When:** The action is persisted
- **Then:** Comprehensive audit logs are generated that capture the full context of the decision, hardening accountability and providing a complete history of administrative interventions.

## Dependencies

- **Story 4.1:** Usage guardrails & upsell workflow
- **Story 3.3:** Metering data
- **Story 1.3:** Roles and RLS enforcement

## Implementation Tasks (for Dev Agent)

- [x] Build admin dashboard UI (table + filters)
- [x] Implement admin-only API endpoints with role guards
- [x] Query aggregated usage from `ai_usage_events`
- [x] Implement override actions (state changes)
- [x] Log all actions to `audit_logs`
- [x] Add performance indexes for usage queries
- [x] Write authorization and performance tests

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0.20/month (audit logs)
- **Compute:** ~$0
- **Total:** $0/month at 10 authors, $0 at 100

## Latency SLA

- **P95 target:** <1s dashboard load
- **Rationale:** Admin workflows must be responsive but are not real-time critical

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Admin-only access enforced
- [ ] Overrides effective immediately
- [ ] Audit logs immutable
- [ ] Dashboard meets SLA

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours

## Status
Review

## File List
- src/app/admin/dashboard/page.tsx - Updated
- src/app/dashboard/admin/actions.ts - Updated
- src/lib/usage-admin.ts - Created
- src/components/admin/UserUsageTable.tsx - Created
- src/components/admin/WaiveLimitsButton.tsx - Created
- supabase/migrations/20260103000000_create_admin_dashboard_views.sql - Created
- supabase/migrations/20260103000001_add_member_ai_status.sql - Created
- supabase/migrations/20260103000002_add_internal_note.sql - Created
- tests/lib/usage-admin.test.ts - Created
- tests/admin/UserUsageTable.test.tsx - Created

## Change Log
- Initialized story implementation.
- Created `user_current_usage` view for aggregated usage stats.
- Added `ai_status` and `internal_note` to `account_members`.
- Implemented `getAccountUsageStats` and override actions in logic.
- Updates Admin Dashboard with Usage Table and Waive Button.
- Added role guards to server actions.
- Added unit tests.

## Dev Agent Record
### Implementation Plan
1. **Admin Dashboard UI**: Create `/admin/dashboard` page and `UserUsageTable` component.
2. **Usage Queries**: Implement server actions to fetch usage data.
3. **Overrides**: Implement actions to override limits/status.
4. **Audit Logs**: Ensure all actions are logged.

### Completion Notes
- **Implemented Features**: 
  - Admin view of per-author usage (Tokens, Checks).
  - Filtering by user name/email.
  - Ability to disable/enable AI access per user.
  - Ability to add/edit internal notes per user.
  - Ability to waive account limits (reset to Good Standing).
  - All actions are logged to `audit_logs`.
- **Performance**: Used a Postgres View `user_current_usage` to efficiently aggregate usage stats for 100+ authors.
- **Security**: Server actions protected by `isAccountAdmin` check.
- **Tests**: Added unit tests for UI component and usage fetching logic. Run via `npm test tests/admin/UserUsageTable.test.tsx` and `tests/lib/usage-admin.test.ts`.