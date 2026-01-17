# The Bearing – Product Requirements Document (PRD)

**Product:** The Bearing  
**Owner:** Ryan Balungeli  
**Role:** PM Agent  
**Timeline:** 18 weeks to MVP  
**Target MVP Scale:** 10 active authors  
**Baseline Infrastructure Cost Target:** ~$50/month  

---

## 1. Overview

### 1.1 Product Vision

The Bearing is an AI-assisted self-publishing platform designed to help authors move from raw manuscript to publish-ready output with confidence, speed, and minimal friction.

The platform prioritizes:
- Author control over automation
- Predictable costs over unlimited AI usage
- Trust, privacy, and reliability over novelty

AI is an enhancement layer, not the product itself.

---

### 1.2 Core Principles

1. Writing never blocks due to AI
2. AI costs are bounded and enforceable
3. Usage scales linearly with revenue
4. Private storage by default
5. No silent overages, ever

---

## 2. Definitions

### 2.1 Active Author

An **active author** is any author who performs **at least one edit action** during a billing period.

This definition is used consistently for:
- Billing
- Usage limits
- Cost modeling
- Upsell enforcement

Inactive authors consume **zero AI allowance**.

---

## 3. System Context & Architecture

### 3.1 Architecture (Context)

**Frontend**
- Vercel (Next.js, React)
- Rich-text manuscript editor

**Backend**
- Supabase (Auth, Postgres, Realtime, RLS)
- Modal.com (Llama inference, async jobs)
- Gemini API (consistency checks)
- Cloudflare R2 (file storage)

**Design Constraint**
- Serverless-first
- Scale usage, not idle capacity

---

## 4. Product Goals

### 4.1 Author Outcomes

- Distraction-free writing experience
- Helpful AI without loss of author voice
- Early detection of consistency issues
- Exportable, publish-ready manuscripts
- Confidence in privacy and data safety

---

### 4.2 Technical Goals

- Editor interactions feel instantaneous
- AI never blocks core workflows
- Zero manuscript data loss
- Async execution for heavy AI tasks
- Linear cost scaling

---

### 4.3 Financial Goals

- ~$50/month infrastructure floor
- <$70/month at 10 authors
- <$300/month at 100 authors
- Heavy AI usage must correlate with higher revenue

---

## 5. Functional Requirements (FR)

### Auth & Profiles
- **FR-01** Email-based authentication with optional MFA (TOTP)
- **FR-02** Author profile management
- **FR-03** Account-level grouping of users
- **FR-04** Role-based access (RBAC) [REFINED]:
    - **Super Admin (Singleton):** Exclusive role management, full system access.
    - **Admin:** Operational oversight, can view manuscripts, cannot assign roles.
    - **Support Agent:** Ticket management only, strictly NO manuscript access.
    - **Author:** Standard user.

### Manuscript Management
- **FR-05** Create, upload, and delete manuscripts
- **FR-06** Rich-text editor with autosave
- **FR-07** Version history with restore
- **FR-08** Secure private manuscript storage
- **FR-09** Export manuscripts to PDF and DOCX

### AI – Llama Suggestions
- **FR-10** Context-limited real-time AI suggestions
- **FR-11** AI suggestions never auto-modify text
- **FR-12** Token tracking per suggestion

### AI – Gemini Consistency Engine
- **FR-13** Manual consistency check initiation
- **FR-14** Asynchronous execution
- **FR-15** Structured consistency reports

### Usage Tracking & Guardrails
- **FR-16** Track AI tokens per author per billing period
- **FR-17** Track Gemini checks per author per billing period
- **FR-18** Immutable usage records per billing cycle

### Upsell & Admin
- **FR-19** Detect sustained over-usage (two cycles)
- **FR-20** Trigger upsell / overage workflow
- **FR-21** In-app support messaging
- **FR-22** Admin dashboard (usage visibility)
- **FR-23** Admin override controls

---

## 6. Non-Functional Requirements (NFR)

### Performance & Reliability
- **NFR-01** Editor response <200ms P95
- **NFR-02** Llama suggestions <2s P95
- **NFR-03** Gemini checks <15s P95
- **NFR-04** Autosave ≤5s interval
- **NFR-05** 99.5% uptime (monthly)
- **NFR-06** Zero data loss tolerance

### Security
- **NFR-07** TLS 1.2+ everywhere
- **NFR-08** AES-256 encryption at rest
- **NFR-09** JWT-based auth
- **NFR-10** Strict Supabase RLS
- **NFR-11** Audit logs for AI runs, uploads, exports

### Cost & Usage Controls
- **NFR-12** Token estimation pre-execution
- **NFR-13** Token logging post-execution
- **NFR-14** Hard caps per request, author, account
- **NFR-15** Graceful failure on cap breach
- **NFR-16** <$70/month at 10 authors
- **NFR-17** <$300/month at 100 authors

---

## 7. Epics

### Epic 1 – Foundation & Auth  
Secure access, account structure, and data isolation.

### Epic 2 – Manuscript Editor & Llama AI  
Core writing experience with non-destructive AI assistance.

### Epic 3 – Consistency Engine  
Async, deep analysis with strict cost controls.

### Epic 4 – Support & Admin  
Visibility, enforcement, and operational control.

---

## 8. User Stories (BMAD-Compliant)

**Total Stories:** 13

---

### Epic 1 – Foundation & Auth

#### Story 1.1 – Email + MFA Authentication
**Description**  
Authors can sign up using email, log in securely, and optionally enable MFA.

**Acceptance Criteria**
- Given new user, when signing up, then account is created and email sent  
- Given MFA enabled, when logging in, then TOTP is required  

**Effort:** 18h  
**Dependencies:** None  

---

#### Story 1.2 – Author Profiles
**Description**  
Authors manage profile and pen name metadata.

**Acceptance Criteria**
- Given authenticated author, when updating profile, then changes persist  
- Given export, when pen name exists, then it is used  

**Effort:** 18h  
**Dependencies:** 1.1  

---

#### Story 1.3 – Account & Role Management
**Description**  
Accounts support admin and author roles with enforced permissions.

**Acceptance Criteria**
- Given admin, when viewing users, then roles are visible  
- Given author, when accessing admin routes, then access is denied  

**Effort:** 22h  
**Dependencies:** 1.1  

---

#### Story 1.4 – Secure Storage & RLS
**Description**  
All manuscript data is private by default using row-level security.

**Acceptance Criteria**
- Given different accounts, when querying data, then no leakage occurs  
- Given owner, when accessing manuscript, then access is allowed  

**Effort:** 24h  
**Dependencies:** 1.1, 1.3  

---

### Epic 2 – Manuscript Editor & Llama AI

#### Story 2.1 – Manuscript CRUD + Autosave
**Description**  
Authors can create and edit manuscripts with autosave.

**Acceptance Criteria**
- Given edits, when typing, then autosave occurs within 5s  
- Given reconnect, then no data loss occurs  

**Effort:** 30h  
**Dependencies:** 1.1, 1.4  

---

#### Story 2.2 – Version History
**Description**  
Authors can view and restore previous manuscript versions.

**Acceptance Criteria**
- Given edits, when viewing history, then versions appear chronologically  
- Given restore, then manuscript matches version  

**Effort:** 24h  
**Dependencies:** 2.1  

---

#### Story 2.3 – Real-Time Llama Suggestions
**Description**  
Context-limited AI suggestions that never auto-edit text.

**Acceptance Criteria**
- Given selection, when requesting suggestion, then AI output is shown  
- Given token cap reached, then request fails gracefully  

**Effort:** 26h  
**Dependencies:** 2.1, 3.3  

---

#### Story 2.4 – Manuscript Export (PDF/DOCX)
**Description**  
Authors export manuscripts to PDF and DOCX.

**Acceptance Criteria**
- Given export request, when completed, then file downloads  
- Given latest version, then export uses it  

**Effort:** 20h  
**Dependencies:** 2.1, 2.2  

---

### Epic 3 – Consistency Engine

#### Story 3.1 – Manual Gemini Consistency Check
**Description**  
Authors manually trigger async consistency checks.

**Acceptance Criteria**
- Given manuscript, when triggered, then async job starts  
- Given completion, then results are stored  

**Effort:** 24h  
**Dependencies:** 2.1  

---

#### Story 3.2 – Structured Consistency Reports
**Description**  
Checks return categorized, structured reports.

**Acceptance Criteria**
- Given results, when viewed, then issues are grouped  
- Given no issues, then clear empty state shown  

**Effort:** 22h  
**Dependencies:** 3.1  

---

#### Story 3.3 – AI Usage Metering
**Description**  
All AI usage is logged per author and billing cycle.

**Acceptance Criteria**
- Given AI call, then estimated and actual tokens logged  
- Given billing end, then records are immutable  

**Effort:** 20h  
**Dependencies:** 2.3, 3.1  

---

### Epic 4 – Support & Admin

#### Story 4.1 – Usage Guardrails & Upsell Workflow
**Description**  
Sustained over-usage triggers in-app upgrade flow.

**Acceptance Criteria**
- Given two cycles over limit, then upsell triggers  
- Given no consent, then enforcement applies  

**Effort:** 22h  
**Dependencies:** 3.3  

---

#### Story 4.2 – Admin Dashboard & Overrides
**Description**  
Admins inspect usage and override enforcement.

**Acceptance Criteria**
- Given admin, when viewing dashboard, then usage visible  
- Given override, then state updates immediately  

**Effort:** 20h  
**Dependencies:** 4.1  

---

#### Story 4.3 – Support Messaging
**Description**  
In-app support messaging between authors and admins.

**Acceptance Criteria**
- Given author message, then admin can view it  
- Given admin reply, then author sees response  

**Effort:** 12h  
**Dependencies:** 1.1  

---

## 9. Planning Success Criteria Checklist

- ✔ 23 Functional Requirements  
- ✔ 17 Non-Functional Requirements  
- ✔ 4 Epics  
- ✔ 13 User Stories (12–16 target)  
- ✔ All stories have ACs, effort, dependencies  

---

## 10. Summary

The Bearing MVP succeeds if it:
- Feels safe, fast, and predictable
- Keeps AI costs bounded and auditable
- Aligns heavy usage with revenue
- Avoids scope creep and infra bloat

AI guardrails are foundational system behavior.

They are not optional.