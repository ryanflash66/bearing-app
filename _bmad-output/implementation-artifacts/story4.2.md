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

- [x] All ACs verified
- [x] Admin-only access enforced
- [x] Overrides effective immediately
- [x] Audit logs immutable
- [x] Dashboard meets SLA

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours

## Status
Done

## File List
- src/app/dashboard/admin/page.tsx
- src/app/dashboard/admin/actions.ts
- src/lib/usage-admin.ts
- src/components/admin/UserUsageTable.tsx
- src/components/admin/WaiveLimitsButton.tsx
- supabase/migrations/20260103000000_create_admin_dashboard_views.sql
- supabase/migrations/20260103000001_add_member_ai_status.sql
- supabase/migrations/20260103000002_add_internal_note.sql
- supabase/migrations/20260103000003_add_member_status.sql
- tests/admin/UserUsageTable.test.tsx
- tests/lib/usage-admin.test.ts