# Story 1.4: Basic Admin Panel

## Description

As an admin, I can access a minimal admin panel to view account members, inspect basic usage and audit events, and manage roles, while non-admins are denied at both the UI route and the database layer. The system verifies admin role from membership, enforces RLS policies for all reads and writes, and logs every admin action for traceability.

## Acceptance Criteria (Gherkin Format)

### AC 1.4.1

- **Given:** I am an authenticated author (non-admin)
- **When:** I navigate to `/admin`
- **Then:** I receive a 403-style denial page or redirect to `/dashboard`, and no admin data is fetched or rendered

### AC 1.4.2

- **Given:** I am an authenticated admin for my account
- **When:** I navigate to `/admin`
- **Then:** I can see an admin layout with these sections: Members, Roles, Audit Logs, and Basic Settings (placeholders allowed)

### AC 1.4.3

- **Given:** I am an admin viewing Members
- **When:** I request the members list
- **Then:** I see only members in my account, with role, email, display name, and `created_at`, and pagination works for 100+ users

### AC 1.4.4

- **Given:** I am an admin changing a member role from author to admin
- **When:** I submit the role change
- **Then:** The role updates in `account_members`, the user gains admin access immediately, and an audit log entry is recorded

### AC 1.4.5

- **Given:** I attempt to remove the last remaining admin or the account owner (safety edge case)
- **When:** I submit a demotion or removal
- **Then:** The system blocks the action with a clear error, and the database remains unchanged

### AC 1.4.6

- **Given:** The request to fetch audit logs fails (network error or permission issue)
- **When:** The Admin panel loads Audit Logs
- **Then:** I see an error state with retry, and the rest of the admin shell remains usable

## Dependencies

- **Story 1.1:** Must complete first
- **Story 1.3:** Must complete first
- **Infrastructure requirement:** Role guard middleware on server routes and admin-only API endpoints

## Implementation Tasks (for Dev Agent)

- [ ] Create `/admin` route and layout, hidden from non-admin nav
- [ ] Implement admin guard:
    - Server checks membership role account_role = 'admin'
    - Block access at middleware and API layers
- [ ] Implement Members page:
    - List members by `account_id` with pagination
    - Search by email or name (optional but easy win)
- [ ] Implement Role management actions:
    - Promote/demote members
    - Guardrails: cannot demote last admin; cannot remove owner
- [ ] Implement Audit Logs page:
    - Fetch latest N events with filters (action type, date range)
    - Add audit log writes for every admin action, including failures where appropriate
- [ ] Tests:
    - Non-admin blocked at route and API
    - Admin can list members
    - Role change updates access
    - Last-admin guardrail enforced

## Cost Estimate

- **AI inference:** 0 tokens, $0 per 100 authors
- **Storage:** ~$0.10 to $1.00 per month (audit logs, depends on admin activity)
- **Compute:** ~$0 (basic list queries)
- **Total:** ~$0/month at 10 authors, ~$0 to $1/month at 100

## Latency SLA

- **P95 target:** 1.2s for `/admin` initial load, 0.4s for members list fetch
- **Rationale:** Admin pages are less frequent but must still feel responsive; queries should be indexed and paginated

## Success Criteria (QA Gate)

- [ ] All ACs verified (manual + automated tests)
- [ ] Tests pass (unit, integration)
- [ ] Cost within estimate (± 10%)
- [ ] Latency meets SLA
- [ ] No security issues

## Effort Estimate

- **Dev hours:** 16 hours
- **QA hours:** 6 hours
- **Total:** 22 hours