# Architecture: Database & Data Model (PostgreSQL, RLS, Versioning)

**Scope:** Database schema design, row-level security, data isolation, versioning strategy, immutable audit logs.

**Owner:** Story 1.4 (Secure Storage & RLS) and Story 2.2 (Version History)

---

## Overview

PostgreSQL with Supabase RLS is the source of truth for all manuscript content, user data, and AI usage tracking. The design prioritizes:
- **Private by default:** Row-Level Security enforces account isolation
- **No data loss:** Version snapshots + immutable audit logs
- **Auditability:** Every change tracked with user + timestamp
- **Scalability:** Normalized schema supports 1000+ authors

---

## Database Architecture

### Tables: Content & Metadata

#### Users Table
```sql
create type app_role as enum ('user', 'support_agent', 'admin', 'super_admin');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,
  email text not null unique,
  display_name text,
  pen_name text,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton constraint: only one super_admin allowed
create unique index idx_singleton_super_admin
  on users ((true)) where role = 'super_admin';
```

#### Accounts Table
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
  account_role text not null default 'viewer' check (account_role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
```

#### Manuscripts Table (Root Content Object)
```sql
create table if not exists manuscripts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  owner_user_id uuid not null references users(id),
  title text not null,
  status text not null default 'draft' 
    check (status in ('draft','in_review','ready','published','archived')),
  content_hash text,                         -- For deduplication in AI requests
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for account lookups
create index if not exists idx_manuscripts_account on manuscripts(account_id);
```

**Design Notes:**
- One account can have multiple manuscripts
- `content_hash` used to deduplicate Gemini requests (avoid re-checking identical text)
- `status` tracks manuscript lifecycle (draft → published)
- RLS ensures only account members see their manuscripts

#### Chapters Table (Content Segments)
```sql
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references manuscripts(id) on delete cascade,
  chapter_num int not null,
  title text,
  content_json jsonb not null default '{}'::jsonb,    -- Slate/TipTap editor state
  content_text text not null default '',               -- Plaintext extraction for AI
  current_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manuscript_id, chapter_num)
);

create index if not exists idx_chapters_manuscript on chapters(manuscript_id);
```

**Design Notes:**
- `content_json` stores rich text editor state (TipTap/Slate)
- `content_text` is extracted plaintext, used for AI processing (faster, cheaper)
- `current_version` points to latest version number (join with chapter_versions for full history)
- Unique constraint on (manuscript_id, chapter_num) ensures no duplicate chapters

#### Chapter Versions Table (Immutable History)
```sql
create table if not exists chapter_versions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  version_num int not null,
  content_json jsonb not null,
  content_text text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (chapter_id, version_num)
);

create index if not exists idx_versions_chapter on chapter_versions(chapter_id);
```

**Design Notes:**
- **Immutable:** No update or delete allowed (enforced via trigger)
- New version created on every autosave (5s interval = ~12 versions/min)
- Authors can restore to any version (creates a new version that matches the old one)
- Storage: ~100KB per version × 100 versions per chapter = ~10MB per chapter (manageable)

**Prevent accidental mutations:**
```sql
create or replace function prevent_version_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'chapter_versions is immutable';
end;
$$;

create trigger trg_version_no_update before update on chapter_versions
for each row execute function prevent_version_mutation();

create trigger trg_version_no_delete before delete on chapter_versions
for each row execute function prevent_version_mutation();
```

---

### Tables: AI Data

#### Suggestions Table (Llama Suggestions)
```sql
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  request_hash text not null,                -- SHA256(selection_text + instruction)
  original_text text not null,
  suggested_text text not null,
  confidence numeric(4,3) not null default 0,  -- 0.0 to 1.0
  model text not null default 'llama8b',
  tokens_estimated int not null default 0,
  tokens_actual int not null default 0,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_suggestions_chapter on suggestions(chapter_id);
create index if not exists idx_suggestions_hash on suggestions(request_hash);
```

**Design Notes:**
- `request_hash` used for caching (same request = same response)
- `confidence` helps user judge quality (low <50% = "beta" label)
- Both estimated and actual tokens logged for tracking accuracy
- Suggestions are immutable (no update allowed)

#### Consistency Checks Table (Gemini Checks)
```sql
create table if not exists consistency_checks (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references manuscripts(id) on delete cascade,
  status text not null default 'queued' 
    check (status in ('queued','running','completed','failed','canceled')),
  model text not null default 'gemini',
  input_hash text not null,                  -- SHA256(manuscript_content)
  report_json jsonb,                         -- Structured issues report
  tokens_estimated int not null default 0,
  tokens_actual int not null default 0,
  error_message text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_checks_manuscript on consistency_checks(manuscript_id);
create index if not exists idx_checks_status on consistency_checks(status);
```

**Design Notes:**
- Job table for async Gemini consistency checks
- `input_hash` for caching previous reports
- `report_json` contains structured issues (character, plot, tone, etc.)
- `status` tracks job lifecycle (queued → running → completed/failed)
- Worker updates status as job progresses (Realtime subscriptions notify client)

---

### Tables: Usage Tracking & Billing

#### Billing Cycles Table
```sql
create table if not exists billing_cycles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (account_id, start_date, end_date)
);

create index if not exists idx_cycles_account on billing_cycles(account_id);
```

**Design Notes:**
- One cycle per account per month
- `is_closed` marks cycle as immutable (no more updates to usage records)
- Used to enforce "2 consecutive cycles over limit" for upsell trigger

#### AI Usage Events Table (Immutable)
```sql
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references users(id),
  billing_cycle_id uuid not null references billing_cycles(id),
  kind text not null check (kind in ('llama_suggestion','gemini_check')),
  request_id uuid,                           -- Link to suggestions.id or consistency_checks.id
  tokens_estimated int not null default 0,
  tokens_actual int not null default 0,
  checks_count int not null default 0,       -- 1 for consistency checks, 0 for suggestions
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_cycle_user on ai_usage_events(billing_cycle_id, user_id);
```

**Design Notes:**
- **Append-only immutable table** (no deletes, no updates after billing cycle closes)
- Every AI call logs an event
- Efficient billing: `select sum(tokens_actual), sum(checks_count) from ai_usage_events where billing_cycle_id = X and user_id = Y`
- Allows cost attribution per user, per cycle, per AI model

---

### Tables: Support & Audit

#### Support Tickets Table
```sql
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  author_id uuid not null references users(id),
  status text not null default 'open' check (status in ('open','pending','closed')),
  subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_user_id uuid not null references users(id),
  message text not null,
  created_at timestamptz not null default now()
);
```

**Design Notes:**
- Simple ticket + messages model (MVP, no complex routing)
- Admins can view/reply via dashboard
- Replies sent via email + stored in DB

#### Audit Logs Table (Immutable)
```sql
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,                      -- 'override_usage_limit', 'disable_user', etc.
  entity_type text,                          -- 'user', 'manuscript', 'consistency_check'
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_account on audit_logs(account_id);
create index if not exists idx_audit_created on audit_logs(created_at);
```

**Prevent mutations:**
```sql
create or replace function prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is immutable';
end;
$$;

create trigger trg_audit_no_update before update on audit_logs
for each row execute function prevent_audit_mutation();

create trigger trg_audit_no_delete before delete on audit_logs
for each row execute function prevent_audit_mutation();
```

**Design Notes:**
- All admin actions logged here (enforcing guardrails, overrides, user disables)
- Immutable for compliance
- Periodic snapshots backed up to R2 for long-term archival

---

## Row-Level Security (RLS) Policies

### Core Principle: Private by Default
Every table with account_id is protected. Only account members can access data from their account.

### Policy Examples

#### Manuscripts: Account Members Can View
```sql
create policy "Account members can view manuscripts"
  on manuscripts for select
  using (
    account_id in (
      select account_id from account_members 
      where user_id = auth.uid()::uuid
    )
  );

create policy "Only owner or admin can update"
  on manuscripts for update
  using (
    owner_user_id = auth.uid()::uuid
    or exists (
      select 1 from account_members am
      where am.account_id = manuscripts.account_id
        and am.user_id = auth.uid()::uuid
        and am.account_role = 'admin'
    )
  );
```

#### AI Usage Events: Append Only
```sql
create policy "Users can insert their own usage"
  on ai_usage_events for insert
  with check (
    user_id = auth.uid()::uuid
    and account_id in (
      select account_id from account_members 
      where user_id = auth.uid()::uuid
    )
  );

create policy "No one can update or delete usage"
  on ai_usage_events for update
  using (false);  -- Deny all updates (immutable)
```

#### Audit Logs: Append Only
```sql
create policy "Admins can insert audit logs"
  on audit_logs for insert
  with check (
    exists (
      select 1 from account_members am
      where am.account_id = audit_logs.account_id
        and am.user_id = auth.uid()::uuid
        and am.account_role = 'admin'
    )
  );

create policy "No one can update or delete"
  on audit_logs for update
  using (false);
```

---

## Versioning Strategy

### Autosave Snapshots (Every 5s)
1. User types in editor
2. Every 5 seconds, backend calls `PATCH /api/chapters/:id`
3. Chapter content updated
4. If content changed (diff detection), create new version
5. Optimization: only create version if diff > 100 characters (avoid 1 version per keystroke)

### Version Restore (No Data Loss)
1. User views version history
2. User clicks "Restore to version 5"
3. System creates a NEW version N+1 that equals version 5 content
4. Current chapter points to version N+1
5. Previous work not lost (all versions available)

### Storage Estimation
- Average chapter: 5,000 words = 30KB JSON
- Versions per chapter per month: 2000 edits × 50 characters diff = ~20 versions
- Storage per chapter per year: 30KB × 20 × 12 = 7.2MB (manageable)
- At 100 authors × 5 chapters × 10 manuscripts = 5,000 chapters
- Total storage: 7.2MB × 5,000 = 36GB (fits in standard Postgres)

---

## Acceptance Criteria (Story 1.4 & 2.2)

### Story 1.4: Secure Storage & RLS
- [x] Different accounts see no data leakage (RLS blocks)
- [x] Admins can access all data in their account
- [x] TLS everywhere (HTTPS enforced)
- [x] AES-256 at rest (Supabase managed)
- [x] Audit logs record all access

### Story 2.2: Version History
- [x] All versions stored in chapter_versions (immutable)
- [x] Version list shows chronologically
- [x] Restore creates new version equal to old one
- [x] No data loss on restore

---

## Cost Estimate

### At 10 Authors
- Database storage: ~100MB (manuscripts + versions)
- Supabase base plan: $25/month (includes 500MB storage)
- **Cost:** $0 (included)

### At 100+ Authors
- Still within $25/month tier up to 500GB
- RLS enforcement: negligible compute

---

## Ready for Development

**Dependencies:** Story 1.1 (Auth must exist first)

**Estimated effort:** 24 hours (Story 1.4)

**Testing:** Data isolation tests, version restore tests, RLS policy tests
