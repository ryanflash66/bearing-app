# Story 1.1: Email + MFA Authentication

## Description

As a new or returning author, I can sign up and log in with email and password, verify my email, optionally enable MFA via TOTP, and maintain a secure session using Supabase Auth JWTs stored in `httpOnly` cookies. The system validates inputs, sends verification and password reset emails, enforces lockout and rate limits on repeated failures, and records key auth events to audit logs.

## Acceptance Criteria (Gherkin Format)

### AC 1.1.1

- **Given:** I am on the signup page and I enter a valid email and password that meets policy
- **When:** I submit signup
- **Then:** A Supabase Auth user is created and a verification email is sent, and I see a "check your email" confirmation

### AC 1.1.2

- **Given:** I received a verification email and the token is unexpired
- **When:** I click the verification link
- **Then:** My email becomes verified in Supabase and I am redirected to either MFA setup (optional) or login, with a clear success message

### AC 1.1.3

- **Given:** My email is verified and MFA is not enabled
- **When:** I log in with correct email and password
- **Then:** I receive an authenticated session with JWT stored in `httpOnly` secure cookies (`SameSite=Strict`), and I am redirected to the author dashboard

### AC 1.1.4

- **Given:** MFA is enabled on my account
- **When:** I log in with correct email and password
- **Then:** I am prompted for a 6 digit TOTP code, and only after a valid code within the allowed window I receive an authenticated session and dashboard access

### AC 1.1.5

- **Given:** I enter an invalid email format or a weak password
- **When:** I submit signup or password change
- **Then:** The UI shows validation errors, no user is created or updated, and no verification email is sent

### AC 1.1.6

- **Given:** I fail MFA entry more than 5 times
- **When:** I attempt the 6th MFA code within the lock window
- **Then:** The account is locked for 15 minutes, I cannot authenticate during lockout, and an audit log entry is created for the lock event

### AC 1.1.7

- **Given:** I click "Forgot password" and enter an email address (existing or non-existing)
- **When:** I submit the reset request
- **Then:** The UI always shows a generic confirmation, and if the email exists Supabase sends a reset link that expires in 1 hour

### AC 1.1.8

- **Given:** My network drops mid-login or Supabase Auth returns an error
- **When:** The login call fails
- **Then:** I see a retryable error state, no partial session cookie is set, and the system does not expose internal error details

## Dependencies

- **Infrastructure requirement:** Supabase project configured with Email Auth enabled, email templates set, redirect URLs allowed
- **Infrastructure requirement:** HTTPS enforced end to end; cookies set as `Secure` and `SameSite=Strict`

## Implementation Tasks (for Dev Agent)

- [ ] Implement Next.js auth pages: signup, login, verify landing, forgot password, reset password, MFA setup, MFA challenge
- [ ] Configure Supabase Auth settings: email verification required, reset token expiry, allowed redirect URLs, MFA enabled
- [ ] Add server middleware to enforce session presence on protected routes and to refresh sessions when needed
- [ ] Implement lockout and rate limiting:
    - Per account lockout after 5 failed MFA attempts for 15 minutes
    - Per IP login throttling (5 attempts per 5 minutes)
- [ ] Add audit logging for auth events (signup, email verified, login success, login failure, mfa enabled, mfa failure, lockout, logout)
- [ ] Write tests:
    - Unit tests for validators and cookie settings
    - Integration tests for signup -> verify -> login flows
    - MFA happy path + clock skew and failure path + lockout

## Cost Estimate

- **AI inference:** 0 tokens, $0 per 100 authors
- **Storage:** ~$0.01 to $0.10 per month (audit logs only, typically under a few MB)
- **Compute:** ~$0 (handled by Supabase + existing backend), marginal overhead negligible
- **Total:** ~$0/month at 10 authors, ~$0/month at 100

## Latency SLA

- **P95 target:** 0.6s for login submit -> response (excluding email delivery)
- **Rationale:** Auth should feel instant; Supabase Auth is managed and should stay subsecond for typical requests

## Success Criteria (QA Gate)

- [ ] All ACs verified (manual + automated tests)
- [ ] Tests pass (unit, integration)
- [ ] Cost within estimate (± 10%)
- [ ] Latency meets SLA
- [ ] No security issues

## Effort Estimate

- **Dev hours:** 20 hours
- **QA hours:** 8 hours
- **Total:** 28 hours