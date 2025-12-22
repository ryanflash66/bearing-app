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

## Dependencies

- **Story 4.1:** Usage guardrails & upsell workflow
- **Story 3.3:** Metering data
- **Story 1.3:** Roles and RLS enforcement

## Implementation Tasks (for Dev Agent)

- [ ] Build admin dashboard UI (table + filters)
- [ ] Implement admin-only API endpoints with role guards
- [ ] Query aggregated usage from `ai_usage_events`
- [ ] Implement override actions (state changes)
- [ ] Log all actions to `audit_logs`
- [ ] Add performance indexes for usage queries
- [ ] Write authorization and performance tests

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