# Story 1.2: Author Dashboard Skeleton

## Description

As an authenticated author, I land on a dashboard shell that confirms my identity and account context, shows a consistent navigation layout, and provides placeholder sections for manuscripts, settings, and usage. The system must protect the route behind auth middleware, load minimal profile metadata, handle missing profile rows safely, and degrade gracefully on API failures.

## Acceptance Criteria (Gherkin Format)

### AC 1.2.1

- **Given:** I am not authenticated
- **When:** I navigate to `/dashboard`
- **Then:** I am redirected to `/login` with a return URL, and no private data is rendered

### AC 1.2.2

- **Given:** I am authenticated with a valid session cookie
- **When:** I navigate to `/dashboard`
- **Then:** I see the dashboard layout with nav, header, and placeholder cards, and my display name or email is shown in the header

### AC 1.2.3

- **Given:** My users profile row does not exist yet (fresh signup edge case)
- **When:** `/dashboard` loads
- **Then:** The system auto-creates the minimal profile row server-side (`auth_id`, `email`) or prompts a lightweight profile completion, without crashing

### AC 1.2.4

- **Given:** Supabase is slow or returns a transient error
- **When:** `/dashboard` loads
- **Then:** I see a non-blocking error banner and retry option, and the rest of the shell still renders

### AC 1.2.5

- **Given:** My session is expired or refresh fails
- **When:** I refresh the page on `/dashboard`
- **Then:** I am redirected to `/login` and session cookies are cleared, with a clear "session expired" message

## Dependencies

- **Story 1.1:** Must complete first
- **Infrastructure requirement:** Next.js middleware support for protected routes and server components or API routes
- **Infrastructure requirement:** Supabase client configured for server-side usage with safe key separation

## Implementation Tasks (for Dev Agent)

- [ ] Create `/dashboard` route with shared layout:
    - Header (account name, user display)
    - Sidebar nav: Dashboard, Manuscripts (placeholder), Settings, Admin (hidden unless admin)
- [ ] Implement auth guard:
    - Next.js middleware checks Supabase session
    - Redirect unauthenticated users to login
- [ ] Implement minimal data fetch:
    - Fetch current user and profile row (`users` table) by `auth_id`
    - Handle missing profile by creating it or showing profile completion CTA
- [ ] Add error handling states:
    - Loading skeleton
    - Retry banner on fetch errors
- [ ] Add basic telemetry hooks:
    - `page_view` dashboard
    - `api_error` dashboard_profile_fetch_failed
- [ ] Tests:
    - Route protection test
    - Missing profile creation flow test
    - Expired session redirect test

## Cost Estimate

- **AI inference:** 0 tokens, $0 per 100 authors
- **Storage:** $0 (no new storage beyond profile row already planned)
- **Compute:** ~$0 (standard page render and one profile query)
- **Total:** ~$0/month at 10 authors, ~$0/month at 100

## Latency SLA

- **P95 target:** 1.0s for dashboard first meaningful render
- **Rationale:** Dashboard can tolerate slightly higher latency due to layout + profile fetch, but should still feel snappy

## Success Criteria (QA Gate)

- [ ] All ACs verified (manual + automated tests)
- [ ] Tests pass (unit, integration)
- [ ] Cost within estimate (± 10%)
- [ ] Latency meets SLA
- [ ] No security issues

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours