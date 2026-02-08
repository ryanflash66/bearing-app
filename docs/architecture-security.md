# Architecture: Security (Encryption, IAM, Audit Logs, Compliance)

**Scope:** Data encryption, identity & access management, audit logging, secrets management, abuse prevention.

**Owner:** Story 1.4 (Secure Storage & RLS), all epics for audit logging

---

## Overview

Security is built into every layer: encryption at rest and in transit, role-based access control at the database layer, immutable audit logs, and strict secrets management. There are no exceptions—security practices are not optional.

---

## Encryption

### TLS in Transit (HTTPS Everywhere)
- **Requirement:** All HTTP traffic redirected to HTTPS (TLS 1.2+)
- **Implementation:** Vercel auto-enforces HTTPS for frontend; backend behind AWS load balancer with TLS termination
- **Certificates:** Auto-provisioned by Vercel/AWS (LetsEncrypt)
- **Policy:** httpOnly cookies with Secure flag prevents JavaScript access (XSS protection)

### AES-256 at Rest
- **Database:** Supabase manages encryption at rest (default, cannot be disabled)
- **File Storage (R2):** Cloudflare R2 supports encrypted buckets (configure per deployment)
- **Secrets:** AWS Secrets Manager encrypts API keys, database credentials

### Implementation
```typescript
// NestJS environment configuration
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  private readonly iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');

  encrypt(plaintext: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(ciphertext: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }
}
```

**Note:** For MVP, rely on Supabase/R2 managed encryption. Application-level encryption only if handling PII beyond email (not required for MVP).

---

## Identity & Access Management (IAM)

### Global Roles (users.role)
```sql
-- Global platform roles (stored in users.role as app_role enum)
create type app_role as enum ('user', 'support_agent', 'admin', 'super_admin');
```

| Role | Cardinality | Permissions |
|------|-------------|-------------|
| **super_admin** | Exactly 1 (singleton, DB-enforced via unique partial index) | Full platform control, service-role Supabase client, global user management, maintenance bypass. Designated account only (`SUPER_ADMIN_EMAIL`). Cannot be assigned via UI. |
| **admin** | 0+ (assignable) | Admin dashboard access, support queue access, override usage limits, manage support tickets. Does NOT get service-role client. |
| **support_agent** | 0+ (assignable) | View/reply to support tickets, support queue access. |
| **user** | 0+ (default) | Create/edit own manuscripts, AI features, support messaging. |

**Key constraints:**
- `super_admin` is locked to a single designated account via `idx_singleton_super_admin` unique partial index and `assign_user_role` RPC guard.
- Only `user`, `support_agent`, and `admin` are assignable via the UI (`AssignableRole` type in `src/lib/super-admin.ts`).
- Global roles are independent of account-level roles (`account_members.account_role`).

### Account-Level Roles (account_members.account_role)
| Role | Scope | Permissions |
|------|-------|-------------|
| **owner** | Per-account | Full account control, billing, member management. |
| **admin** | Per-account | Edit manuscripts, manage account settings. |
| **editor** | Per-account | Edit manuscripts only. |
| **viewer** | Per-account | Read-only access to account content. |

### API Guards (Next.js App Router)
```typescript
// Role checks happen inline in API route handlers:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Fetch profile with role
const { data: profile } = await supabase
  .from("users")
  .select("id, role")
  .eq("auth_id", user.id)
  .single();

// Guard: admin-only route
if (!["super_admin", "admin"].includes(profile.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### RPC-First Pattern for Privileged Operations
To prevent RLS bypasses and ensures atomicity for complex operations (e.g., onboarding, membership changes), we enforce an **RPC-First** approach:

1.  **Restriction**: Direct `INSERT`/`UPDATE` permissions on sensitive tables (`users`, `accounts`, `account_members`) are restricted or strictly scoped via RLS.
2.  **Implementation**: Use `security definer` PostgreSQL functions (RPCs) for:
    -   Account creation (`create_default_account`)
    -   Membership changes (`invite_member`, `remove_member`)
    -   Profile claiming (`claim_profile`)
3.  **Rationale**:
    -   **Atomicity**: Ensures user + account + membership are created in a single transaction.
    -   **Validation**: Server-side logic verifies business rules (e.g., "one default account per user") that RLS cannot easily enforce.
    -   **Privilege Elevation**: Allows temporary elevation of privileges (via `security definer`) to perform actions the user cannot do directly (e.g., assigning themselves as admin of a new account).

**Example:**
```typescript
// Good: RPC handles complex logic atomically
const { data, error } = await supabase.rpc('create_default_account', {
  p_name: "My Account",
  p_owner_id: userId
});

// Bad: Client-side orchestration (vulnerable to partial failure and RLS complexity)
await supabase.from('accounts').insert(...);
await supabase.from('account_members').insert(...);
```

### Row-Level Security (RLS) in Postgres
```sql
-- Defense in depth: API guards + RLS policies

-- Manuscripts: authors can only view their own account's manuscripts
create policy "Authors can view own account manuscripts"
  on manuscripts for select
  using (
    account_id in (
      select account_id from account_members 
      where user_id = auth.uid()::uuid
    )
  );

-- Admins can view all manuscripts in their account
create policy "Admins can view all in account"
  on manuscripts for select
  using (
    exists (
      select 1 from account_members am
      where am.account_id = manuscripts.account_id
        and am.user_id = auth.uid()::uuid
        and am.account_role = 'admin'
    )
  );

-- AI usage events: immutable append-only
create policy "Users can view own usage"
  on ai_usage_events for select
  using (
    user_id = auth.uid()::uuid
    or exists (
      select 1 from account_members am
      where am.account_id = ai_usage_events.account_id
        and am.user_id = auth.uid()::uuid
        and am.account_role = 'admin'
    )
  );

-- Block all updates/deletes on usage
create policy "No one can modify usage events"
  on ai_usage_events for update
  using (false);
```

---

## Audit Logging (Immutable)

### Audit Log Schema
```sql
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Immutability: block updates and deletes
create or replace function prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is immutable after insert';
end;
$$;

create trigger trg_audit_no_update before update on audit_logs
for each row execute function prevent_audit_mutation();

create trigger trg_audit_no_delete before delete on audit_logs
for each row execute function prevent_audit_mutation();
```

### Events to Log
```
-- Auth events
- 'user_signup'
- 'user_login'
- 'user_logout'
- 'mfa_enabled'
- 'mfa_disabled'
- 'password_reset'

-- Manuscript events
- 'manuscript_created'
- 'manuscript_published'
- 'manuscript_deleted'

-- AI events
- 'llama_suggestion_requested'
- 'gemini_check_initiated'

-- Admin events
- 'usage_limit_override'
- 'user_disabled'
- 'user_enabled'
- 'support_ticket_closed'

-- Support events
- 'support_message_sent'
- 'support_message_replied'
```

### Logging Implementation
```typescript
// audit.service.ts
@Injectable()
export class AuditService {
  constructor(private supabase: SupabaseClient) {}

  async log(
    accountId: string,
    userId: string | null,
    action: string,
    entityType: string | null = null,
    entityId: string | null = null,
    metadata: Record<string, unknown> = {}
  ) {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        account_id: accountId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });

    if (error) {
      // Log to monitoring (Sentry)
      console.error('Audit log failed:', error);
    }
  }

  // Usage example
  async logOverride(userId: string, manuscriptId: string, reason: string) {
    await this.log(
      accountId,
      userId,
      'usage_limit_override',
      'manuscript',
      manuscriptId,
      { reason, overriddenAt: new Date() }
    );
  }
}
```

### Retention & Backup
- **Retention:** Infinite (immutable table)
- **Backup:** Monthly snapshots to R2 (append-only backup)
- **Retention policy:** No deletion; comply with data minimization by design (only log necessary actions)

---

## Secrets Management

### Local Development (.env.local)
```
# Database
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# AI
MODAL_LLAMA_URL=https://api.modal.com/...
MODAL_API_TOKEN=...
GEMINI_API_KEY=...

# Encryption (generate via: openssl rand -hex 32)
ENCRYPTION_KEY=...
ENCRYPTION_IV=...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# External
SENDGRID_API_KEY=...
SENTRY_DSN=...
```

### Production (AWS Secrets Manager)
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name bearing/prod/db \
  --secret-string '{
    "SUPABASE_URL": "...",
    "SUPABASE_SERVICE_ROLE_KEY": "..."
  }'

# ECS/Lambda automatically inject at runtime
```

### Never
- ❌ Commit secrets to Git
- ❌ Log secrets in errors or traces
- ❌ Expose service role keys to the browser
- ❌ Hardcode API keys in code
- ❌ Use the same key across environments

---

## Abuse Prevention

### Rate Limiting
```typescript
// API guard: rate limit per IP
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per 60s per IP
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

@UseGuards(ThrottlerGuard)
@Post('/api/auth/login')
async login(@Body() dto: LoginDto) {
  // Max 100 login attempts per minute per IP
}
```

### Suggestion Cooldown
```typescript
// Don't allow more than 1 suggestion per 5 seconds per chapter
async suggest(selectionText: string, chapterId: string) {
  const lastSuggestionTime = this.cache.get(`suggestion:${chapterId}`);
  if (lastSuggestionTime && Date.now() - lastSuggestionTime < 5000) {
    throw new Error('Suggestion rate limited. Wait 5 seconds.');
  }

  // ... call AI ...

  this.cache.set(`suggestion:${chapterId}`, Date.now());
}
```

### Quota Enforcement
```typescript
// Hard caps per user per month
if (currentUsage.tokensUsed + estimatedTokens > 10_000_000) {
  throw new QuotaExceededError(
    `Monthly token limit exceeded. Used: ${currentUsage.tokensUsed}, Limit: 10,000,000`
  );
}
```

### CSRF Protection
```typescript
// NestJS CSRF guard
@Module({
  providers: [CsrfGuard],
})
export class SecurityModule {}

// On forms: include CSRF token
// POST form.hidden input with csrf token
// Middleware validates token before processing

// In SPA: attach CSRF token to POST headers
const response = await fetch('/api/manuscripts', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

---

## Input Validation & Sanitization

### NestJS DTOs
```typescript
// DTO for manuscript creation
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateManuscriptDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// In controller
@Post('/api/manuscripts')
async create(@Body(new ValidationPipe()) dto: CreateManuscriptDto) {
  // DTO automatically validated
}
```

### HTML Escaping
```typescript
// Never trust user input in HTML/JSON responses
import { escape } from 'lodash';

const sanitizedTitle = escape(userInput.title);
// Converts < to &lt;, > to &gt;, etc.
```

### JSON Strict Mode
```typescript
// AI models must return valid JSON
try {
  const response = JSON.parse(aiOutput);
  // Validate schema
  if (!response.suggestion || typeof response.suggestion !== 'string') {
    throw new Error('Invalid suggestion response');
  }
} catch {
  throw new Error('AI response not valid JSON');
}
```

---

## Penetration Testing Checklist

Before production launch:
- [ ] SQL injection attempts blocked (parameterized queries)
- [ ] XSS attempts blocked (httpOnly cookies, HTML escaping)
- [ ] CSRF attempts blocked (CSRF tokens)
- [ ] Authentication bypass attempts fail
- [ ] Authorization bypass attempts fail (RLS tested)
- [ ] Rate limiting enforced
- [ ] Secrets not exposed in errors or logs
- [ ] TLS certificate valid
- [ ] Audit logs complete and immutable

---

## Compliance & Data Privacy

### Data Minimization
- Only collect: email, display name, pen name
- Never collect: IP logs (beyond auth), device fingerprints, cookies beyond session
- No third-party analytics tracking users

### GDPR Ready (Future)
- RLS ensures data isolation
- Audit logs allow deletion requests
- No data shared with third parties (except Supabase, Modal, Gemini—disclose in ToS)

### DPA (Data Processing Agreement)
- Supabase: has DPA signed
- Modal: has DPA signed
- Gemini: has DPA via Google Cloud standard terms

---

## Cost Estimate

### At 10 Authors
- Encryption: $0 (Supabase/R2 managed)
- Audit logs: negligible storage (~1KB per action × 20 actions/day = 600KB/month)
- Secrets management: AWS Secrets Manager = $0.40/secret/month × 3 = $1.20
- **Total:** $1.20/month

### At 100+ Authors
- Still negligible (Postgres at 500GB storage limit before extra cost)
- Audit logs: 600KB/month × 100 = 60MB/month (still negligible)

---

## Ready for Development

**Estimated effort:** Integrated into all epics (auth, database, admin)

**Testing:** Automated security tests, penetration testing, RLS isolation tests

**Compliance checklist:** OWASP Top 10, GDPR readiness, data minimization
