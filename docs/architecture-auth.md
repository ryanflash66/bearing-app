# Architecture: Authentication & Identity (Supabase Auth, JWT, MFA)

**Scope:** User authentication, session management, multi-factor authentication, role-based access control.

**Owner:** Story 1.1 (Email + MFA Authentication) and Story 1.3 (Account & Role Management)

---

## Overview

Authentication is the foundation of data isolation. The Bearing uses **Supabase Auth** for OAuth-ready, managed authentication with JWT tokens stored in httpOnly cookies. MFA is optional via TOTP (Time-Based One-Time Password). Role-based access control (RBAC) is enforced at the database layer using RLS.

---

## Auth Stack

### Supabase Auth (Managed)
- **Email/Password:** Native Supabase email auth with verification flow
- **JWT:** Signed by Supabase, verified by backend + RLS in Postgres
- **MFA:** TOTP via Supabase Auth (no SMS dependency for MVP)
- **OAuth:** Pre-configured, not used in MVP but ready for v1.1

### Storage
- **Tokens:** httpOnly secure cookies (SameSite=Strict)
- **Session:** Stateless JWT (no server-side session table needed)
- **Refresh:** Long-lived refresh token for persistent login (24h+ expiry)

---

## User Model (PostgreSQL)

```sql
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,              -- Supabase auth user ID
  email text not null unique,
  display_name text,
  pen_name text,                             -- Author's writing name
  role text not null default 'author' 
    check (role in ('author','admin','support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for lookups
create index if not exists idx_users_auth_id on users(auth_id);
create index if not exists idx_users_email on users(email);
```

**Design Notes:**
- `auth_id` links to Supabase auth.users(id), never exposed to client
- `role` is application role (author, admin, support) used for RLS and API guards
- `pen_name` allows pseudonymous publishing while keeping identity private
- RLS protects profile updates (authors can only update own profile)

---

## Account & Multi-Tenancy Model

```sql
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  account_role text not null default 'author' 
    check (account_role in ('author','admin','support')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

-- RLS: users can see accounts they are members of
create policy "Users can view their own accounts"
  on accounts for select
  using (
    auth.uid()::uuid in (
      select user_id from account_members where account_id = accounts.id
    )
  );

create policy "Only account owner can update account"
  on accounts for update
  using (owner_user_id = auth.uid()::uuid);
```

**Design Notes:**
- Single user can be member of multiple accounts (future feature)
- MVP: one user, one account, but structure supports expansion
- `account_role` allows per-account role assignment (author, admin, support)
- RLS enforces membership checks on all account-scoped queries

---

## JWT & Session Management

### JWT Structure
```json
{
  "iss": "https://supabase-project.auth.supabase.co",
  "sub": "user-uuid",
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567800,
  "email": "author@example.com",
  "user_metadata": {
    "display_name": "Jane Doe",
    "role": "author"
  }
}
```

### Cookie Settings (httpOnly Secure)
```typescript
// Set by Supabase Auth automatically
// But ensure these on the backend:
const cookieOptions = {
  httpOnly: true,           // No JS access (XSS protection)
  secure: true,             // HTTPS only
  sameSite: 'strict',       // CSRF protection
  maxAge: 24 * 60 * 60,     // 24 hours
  path: '/'
};
```

### Session Flow
1. **Signup:** User signs up with email + password
   - Supabase sends verification email with link
   - User clicks link, email marked verified
   - Prompted to enable MFA (optional)
   - After MFA setup, auto-login or redirect to login

2. **Login:** User enters email + password
   - Supabase validates credentials
   - If MFA enabled: prompt for TOTP code
   - On success: JWT issued, stored in httpOnly cookie
   - User redirected to dashboard

3. **Session Persistence:** Browser automatically includes cookie on each request
   - Middleware verifies JWT signature
   - If expired: refresh token used to get new JWT (silent refresh)
   - If refresh also expired: redirect to login

4. **Logout:** User clicks logout
   - JWT cleared from cookie
   - Refresh token revoked (optional, for security)
   - Redirect to landing page

---

## MFA (TOTP) Implementation

### TOTP Setup Flow
1. User enables MFA in settings
2. System generates TOTP secret (RFC 4226)
3. QR code displayed (user scans with authenticator app)
4. User enters 6-digit code to verify secret is working
5. System generates backup codes (10×, print-friendly)
6. TOTP enabled on account

### TOTP Login Flow
1. User enters email + password
2. On success, prompt: "Enter 6-digit code from authenticator"
3. User enters code, validated against TOTP secret (±30s window)
4. On success: issue JWT
5. Failed attempts (>5) → lock account for 15 minutes

### Database Tracking
```sql
-- Supabase Auth handles TOTP secrets internally
-- No need to store in application schema

-- But log MFA events for audit
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  user_id uuid references users(id),
  action text not null,  -- 'mfa_enabled', 'mfa_disabled', 'login_mfa_failure', etc.
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

---

## Password Reset

### Reset Flow
1. User clicks "Forgot password" on login page
2. Enters email
3. Supabase sends reset email with link (token valid 1 hour)
4. User clicks link, enters new password
5. Password updated, user redirected to login

### Token Expiry
- Reset tokens: 1 hour
- Verification tokens (signup): 24 hours
- All handled by Supabase Auth

---

## Role-Based Access Control (RBAC)

### Global Platform Roles (`users.role` — `public.app_role` enum)

| Role           | Count   | Purpose |
|----------------|---------|---------|
| **super_admin** | Exactly 1 | Single designated account (`dark7eaper@bearing.app`). Not assignable via UI or RPC; enforced by unique partial index `idx_singleton_super_admin`. Full system override (bypasses RLS via service-role client). |
| **admin**      | 0+      | Platform-level admins assignable by super admin. Access to admin dashboard, moderation, support queue, and service request oversight. |
| **support_agent** | 0+   | Support staff assignable by super admin. Can manage support tickets and view service statuses. |
| **user**       | 0+      | Default role for all author accounts. Standard manuscript and AI feature access. |

**Key constraints:**
- `super_admin` is locked to `SUPER_ADMIN_EMAIL` env var (fallback: `dark7eaper@bearing.app`).
- The `assign_user_role` RPC blocks `super_admin` assignment at the DB level.
- `updateGlobalUserRole` (backend) rejects `super_admin` assignment and prevents demotion of the designated account.
- The Super Admin UI only exposes `user`, `support_agent`, and `admin` as assignable roles.
- Config: `SUPER_ADMIN_EMAIL` in `.env` / `.env.example`.

### Account-Level Roles (`account_members.account_role`)

| Role       | Purpose |
|------------|---------|
| **author** | Default. Can create/edit manuscripts, use AI features within account scope. |
| **admin**  | Account administrator. Can manage members, view usage, access account admin dashboard. |
| **support**| Account-level support (future use). |

**Note:** Global roles and account roles are independent. A user with global role `admin` does not automatically have account-level `admin` access — those are managed separately via `account_members`.

### API Guards (NestJS Example)
```typescript
// Require role on API endpoints
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
@Get('/api/admin/users')
async listUsers() {
  // Only admins can access
}

// Check role from JWT
@UseGuards(AuthGuard)
@Get('/api/profile')
async getProfile(@CurrentUser() user: User) {
  // Any authenticated user
}
```

### RLS Policies (Postgres)
```sql
-- Manuscripts: only account members can view
create policy "Account members can view manuscripts"
  on manuscripts for select
  using (
    account_id in (
      select account_id from account_members 
      where user_id = auth.uid()::uuid
    )
  );

-- Admin overrides: admins see all in their account
create policy "Admins can view all in account"
  on manuscripts for select
  using (
    exists (
      select 1 from account_members 
      where account_id = manuscripts.account_id 
        and user_id = auth.uid()::uuid 
        and account_role = 'admin'
    )
  );
```

---

## Secret Management

### Local Development (.env.local)
```
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (NEVER expose in browser)
```

### Production (AWS Secrets Manager)
```json
{
  "SUPABASE_URL": "https://project.supabase.co",
  "SUPABASE_ANON_KEY": "...",
  "SUPABASE_SERVICE_ROLE_KEY": "..."
}
```

### NestJS Env Validation
```typescript
import { IsString } from 'class-validator';

export class AuthConfig {
  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;
}
```

---

## Acceptance Criteria (Story 1.1 & 1.3)

### Story 1.1: Email + MFA Authentication
- [x] Email signup with validation
- [x] Verification email sent and verified
- [x] Password reset flow
- [x] MFA setup (TOTP, QR code, backup codes)
- [x] MFA login with code validation
- [x] Account lockout on failed attempts (5+ failures, 15 min lockout)
- [x] JWT issued and stored in httpOnly cookie
- [x] Session auto-refresh on page reload
- [x] Logout revokes token

### Story 1.3: Account & Role Management
- [x] Admin role verified on API access
- [x] Author role denied admin routes
- [x] RLS policies enforced in Postgres
- [x] Audit logs record all role changes
- [x] No data leakage between accounts

---

## Maintenance Mode & Admin Bypass (Story 8.4)

### Overview

When maintenance mode is enabled, write operations (POST, PUT, DELETE, PATCH) are blocked for regular users via middleware. However, admins need to bypass this to perform their duties.

### Bypass Mechanisms

1. **Super Admin Role Bypass (`isSuperAdmin`):**
   - Users with `role = 'super_admin'` in the `users` table bypass maintenance mode
   - The middleware checks `isSuperAdmin(supabase)` before blocking
   - Requires RLS policy allowing users to read their own `users` row

2. **Path-Based Bypass (Defense-in-Depth):**
   - Admin routes (`/dashboard/admin/*`) bypass maintenance mode regardless of role
   - Added as defense-in-depth in case `isSuperAdmin` check fails (timing, RLS issues)
   - Middleware allowlist includes:
     - `/api/auth/*` - Auth operations
     - `/auth/*` - Auth callbacks
     - `/api/webhooks/*` - External webhook handlers
     - `/api/internal/*` - Internal APIs
     - `/dashboard/admin/*` - Admin routes (Story 8.4)

### Maintenance UI

- **Regular Users:** See informational amber banner in `DashboardLayout` when maintenance is enabled
- **Super Admins:** See `MaintenanceCallout` component (informational only, not blocking)
- **Admin Dashboard:** Provides `MaintenanceToggle` to enable/disable maintenance mode

### Implementation Notes

- Middleware: `src/utils/supabase/middleware.ts`
- `isSuperAdmin`: `src/lib/super-admin.ts`
- Maintenance toggle: `src/components/admin/MaintenanceToggle.tsx`
- Tests: `tests/utils/middleware.test.ts`

---

## Security Checklist

- [x] **JWT in httpOnly cookies:** XSS safe
- [x] **SameSite=Strict:** CSRF protected
- [x] **HTTPS enforced:** TLS everywhere
- [x] **MFA optional:** Secure but not mandatory for MVP
- [x] **Rate limiting:** 5 login attempts per 5 min per IP
- [x] **TOTP ±30s window:** Handles clock skew
- [x] **RLS on all tables:** Defense in depth
- [x] **Audit logs:** All auth events recorded
- [x] **No hardcoded secrets:** Use env vars + Secrets Manager
- [x] **Refresh token rotation:** Supabase handles automatically
- [x] **Maintenance mode bypass:** Admins can access system during maintenance (Story 8.4)

---

## Cost Estimate

### At 10 Authors
- Supabase Auth: $0 (included in base $25/month)
- Token validation: negligible
- RLS enforcement: negligible
- **Monthly cost:** $0

### At 100+ Authors
- Still $0 (Supabase pricing tiers handle 100s of users)
- No incremental cost for MFA or role management

---

## Ready for Development

**Dependencies:** None (foundation epic)

**Estimated effort:** 18 hours (Story 1.1)

**Integration:** All subsequent stories depend on this auth system for session management and RLS enforcement.

**Testing:** Automated tests for signup flow, MFA setup, RLS data isolation, password reset.
