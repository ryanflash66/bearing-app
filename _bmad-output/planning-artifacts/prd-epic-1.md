# Epic 1: Foundation & Auth

**Duration:** Weeks 5-8 (4 weeks)  
**Stories:** 1.1, 1.2, 1.3, 1.4 (4 stories)  
**Total Effort:** 82 hours (Dev + QA + Review)

---

## Epic Goal

Establish secure access, account structures, and foundational data isolation using Supabase Auth and Row-Level Security (RLS).

This epic ensures:
- Authors can sign up and authenticate securely
- Admin roles are enforced
- All manuscript data is private by default
- Foundation ready for subsequent epics

---

## Functional Requirements (Epic 1)

| FR | Requirement |
|----|----|
| **FR-01** | Email-based authentication with optional MFA (TOTP) |
| **FR-02** | Author profile management (name, pen name, preferences) |
| **FR-03** | Account-level grouping of users |
| **FR-04** | Role-based access control (Author, Admin) |
| **FR-08** | Secure private manuscript storage |

---

## Non-Functional Requirements (Epic 1)

| NFR | Requirement |
|-----|---|
| **NFR-07** | TLS 1.2+ for all network traffic |
| **NFR-08** | AES-256 encryption at rest |
| **NFR-09** | JWT-based authentication |
| **NFR-10** | Strict Supabase Row-Level Security (RLS) |
| **NFR-11** | Audit logs for key events |

---

## User Stories

### Story 1.1 – Email + MFA Authentication

**Description**  
Authors can sign up using email, log in securely, and optionally enable MFA using TOTP (Time-Based One-Time Password).

**Acceptance Criteria**
- **AC 1.1.1:** Given a new user, when signing up with valid email/password, then account is created and verification email is sent
- **AC 1.1.2:** Given email received, when clicking verify link, then email status changes to verified and user is prompted for MFA setup
- **AC 1.1.3:** Given MFA enabled, when logging in, then TOTP code entry is required before access granted
- **AC 1.1.4:** Given failed MFA attempt, when exceeding 5 attempts, then account is temporarily locked (15 minutes)
- **AC 1.1.5:** Given password reset request, when valid email entered, then reset link sent with 1-hour expiry

**Effort:** 18 hours  
**Dependencies:** None (foundation story)

**Cost Estimate (at 10 authors)**
- Supabase Auth: $0 (included in base plan)
- JWT tokens: negligible
- **Monthly cost:** $0

---

### Story 1.2 – Author Profiles

**Description**  
Authors can manage their profile information (name, pen name, bio, preferences) persisted in PostgreSQL.

**Acceptance Criteria**
- **AC 1.2.1:** Given authenticated author, when updating profile, then changes persist to database immediately
- **AC 1.2.2:** Given pen name set, when exporting manuscript, then pen name appears in exports (not real name)
- **AC 1.2.3:** Given multiple pen names, when viewing profile, then author can select active pen name
- **AC 1.2.4:** Given profile data, when different author queries, then no leakage via API

**Effort:** 18 hours  
**Dependencies:** 1.1

**Cost Estimate (at 10 authors)**
- Storage: ~100KB per author = ~1MB total (negligible)
- **Monthly cost:** $0

---

### Story 1.3 – Account & Role Management

**Description**  
Accounts support multiple roles (Author, Admin) with enforced permissions and access control.

**Acceptance Criteria**
- **AC 1.3.1:** Given admin user, when accessing admin dashboard, then role is verified via JWT
- **AC 1.3.2:** Given author user, when attempting admin routes, then 403 Forbidden returned
- **AC 1.3.3:** Given role assignment, when saved to database, then RLS policies enforce visibility
- **AC 1.3.4:** Given audit log, when admin action occurs, then event recorded with timestamp + user ID

**Effort:** 22 hours  
**Dependencies:** 1.1

**Cost Estimate (at 10 authors)**
- Storage: negligible (role metadata only)
- Audit logs: ~1KB per action × 10 actions/day = 100KB/month (negligible)
- **Monthly cost:** $0

---

### Story 1.4 – Secure Storage & RLS (Row-Level Security)

**Description**  
All manuscript and user data is private by default using Supabase RLS policies. Authors can only access their own data; admins can access all data but only for authorized actions.

**Acceptance Criteria**
- **AC 1.4.1:** Given author A with manuscript, when author B queries database, then no rows returned (RLS blocks)
- **AC 1.4.2:** Given admin user, when querying any author's data, then RLS policy allows (admin bypass with audit)
- **AC 1.4.3:** Given manuscript stored, when encryption enabled, then storage encrypted at rest (AES-256)
- **AC 1.4.4:** Given API call, when transmitted over network, then TLS 1.2+ enforced (no HTTP)
- **AC 1.4.5:** Given data breach risk, when audit logs checked, then all access recorded

**Effort:** 24 hours  
**Dependencies:** 1.1, 1.3

**Cost Estimate (at 10 authors)**
- Supabase RLS enforcement: included
- Encryption overhead: negligible
- Audit storage: ~2KB per action × 20 actions/day = 600KB/month (negligible)
- **Monthly cost:** $0

---

## Cost Summary (Epic 1)

### At 10 Authors
| Component | Cost |
|-----------|------|
| Supabase Auth | $0 (included) |
| Supabase RLS | $0 (included) |
| Storage | ~$0 |
| **Total** | **$0/month** |

### At 100 Authors
| Component | Cost |
|-----------|------|
| Supabase Auth | $0 (included) |
| Supabase RLS | $0 (included) |
| Storage | ~$0 |
| **Total** | **$0/month** |

### At 1000 Authors
| Component | Cost |
|-----------|------|
| Supabase Auth | $0 (included) |
| Supabase RLS | $0 (included) |
| Storage | ~$0 |
| Supabase upgrade (if needed) | $50-100 |
| **Total** | **$50-100/month** |

---

## Implementation Notes

### Tech Stack
- **Auth:** Supabase Auth (JWT, OAuth-ready)
- **Database:** PostgreSQL (Supabase-hosted)
- **Security:** Row-Level Security (RLS policies in PostgreSQL)
- **Encryption:** TLS in transit, AES-256 at rest (Supabase managed)

### Key Design Decisions
1. **JWT in httpOnly cookies** – secure against XSS
2. **TOTP for MFA** – no SMS dependency
3. **Supabase RLS** – no custom auth layer
4. **Role-based access** – simple enum (author, admin)

### Success Criteria (QA Gate)
- ✓ All 5 ACs (1.1-1.4) verified with tests
- ✓ npm audit clean (no vulnerabilities)
- ✓ RLS policies tested (no data leakage)
- ✓ Load test: 100 concurrent auth requests < 500ms
- ✓ Cost within estimate ($0)

---

## Ready for Development

This epic is **dependency-free** and can begin in Week 5 immediately after Phase 2 (Setup) completes.

All 4 stories should be generated and implemented sequentially:
1. **Story 1.1 (Auth)** → foundation
2. **Story 1.2 (Profiles)** → depends on 1.1
3. **Story 1.3 (Roles)** → depends on 1.1
4. **Story 1.4 (RLS)** → depends on 1.1 + 1.3

**Expected completion:** Week 8
