# The Bearing – System Brief & PRD (MVP)
**Focus:** AI usage guardrails, pricing hooks, and cost predictability  
**Owner:** Ryan Balungeli  
**Timeline:** 18 weeks to MVP  
**Baseline Cost Target:** ~$50/month infrastructure floor  
**Target MVP Scale:** 10 active authors  

---

## 1. Goals

### 1.1 Product Goals
The Bearing is an AI-powered self-publishing platform designed to help authors move from raw manuscript to publish-ready output with less friction, fewer errors, and higher confidence.

Primary outcomes for authors:
- Write and revise manuscripts in a fast, distraction-free editor
- Receive helpful AI suggestions without losing author voice
- Catch continuity, consistency, and logic issues before publishing
- Export manuscripts in publish-ready formats
- Trust that their work is private, secure, and never lost

The platform prioritizes **trust, predictability, and usability** over novelty.

---

### 1.2 Technical Goals
- **Performance**
  - Editor interactions feel instantaneous
  - AI suggestions appear within seconds and never block writing
  - Heavy AI operations run asynchronously

- **Reliability**
  - Zero manuscript data loss
  - Autosave and versioning are mandatory
  - AI failures degrade gracefully without breaking core workflows

- **Scalability**
  - Support growth from 10 → 100 → 1,000 authors without re-architecting
  - Scale AI costs linearly with usage, not with idle users

- **Security**
  - Strong authentication and row-level security
  - Private storage by default
  - Full auditability of sensitive actions

---

### 1.3 Financial Goals
- Maintain predictable, bounded AI costs
- Keep fixed infrastructure spend near $50/month for MVP
- Ensure heavy AI usage directly correlates with higher revenue
- Avoid silent cost leakage from power users

---

## 2. Definitions

### Active Author
An **active author** is defined as any author who performs **at least one edit action** during a billing period.

This definition is used consistently for:
- Billing
- Usage limits
- Cost modeling
- Upsell and overage enforcement

Inactive authors do not consume AI allowances.

---

## 3. Constraints & Assumptions

### 3.1 Constraints
- Solo developer (Ryan) using AI agents
- 18-week delivery timeline
- Serverless-first architecture:
  - Supabase (auth, database, realtime)
  - Modal.com (Llama inference and background jobs)
  - Gemini API (consistency checks)
  - Vercel (frontend)
  - Cloudflare R2 (file storage)
- $50/month baseline infrastructure cost

---

### 3.2 Usage Assumptions
- Authors upload 5–10 manuscripts
- Authors run 1–2 consistency checks per week
- Most authors stay well below hard usage limits
- A small percentage of power users drive most AI costs

---

## 4. Financial / Cost Model (AI Guardrails)

### 4.1 Main Paid Tier – Included Usage (Per Active Author / Month)

| Resource | Included Allowance |
|------|----------------|
| Gemini consistency checks | Up to **10 manual checks** |
| AI tokens (Gemini + Llama combined) | Up to **10 million tokens** |
| Editor usage (non-AI) | Unlimited |
| Manuscript storage | Fair use |

**Important:**  
AI tokens are counted **across all AI features combined**, including:
- Llama real-time suggestions
- Gemini consistency checks
- Any future AI-powered analysis

This prevents cost avoidance by shifting usage between features.

---

### 4.2 Guardrail Enforcement Logic

If the **average active author** on an account exceeds **either** of the following limits:

- More than **10 Gemini consistency checks per month**, OR
- More than **10M AI tokens per month**

for **two consecutive billing cycles**, the system must automatically trigger an upsell or overage workflow.

This behavior is mandatory and does not require manual admin intervention.

---

### 4.3 Rationale for Two Billing Cycles
- Prevents penalizing short-term spikes
- Identifies sustained, high-cost usage
- Reduces unnecessary churn while protecting margins

---

### 4.4 Upsell / Overage Workflow Requirements

When triggered, the system must present:

1. **In-app banner and/or modal**
   - Visible on dashboard and editor entry
   - Clearly states that included usage has been exceeded

2. **Clear explanation**
   - Simple, non-technical language
   - Explicitly states limits exist to keep AI costs predictable and sustainable

3. **Action paths**
   - Upgrade to a higher-usage tier (e.g., “Pro”)
   - Accept per-unit overage pricing (if enabled)

4. **Explicit consent**
   - No silent overage billing
   - User must actively accept upgrade or overage terms

Blocking behavior (soft or hard) must be configurable by admin.

---

## 5. MVP Scope

### 5.1 In Scope (MVP)

#### Core Product
- Author dashboard
- Manuscript editor with autosave and version history
- Export to at least PDF and DOCX

#### AI Features
- Real-time Llama suggestions (context-limited, non-destructive)
- Manual Gemini consistency checks (async, report-based)

#### Usage Tracking & Enforcement (Mandatory)
- Track AI tokens per author per billing period
- Track Gemini checks per author per billing period
- Aggregate usage per account and per active author
- Persist historical usage data (immutable per billing cycle)

#### Upsell / Overage System
- Automated detection of sustained over-usage
- In-app notifications and upgrade flows
- Configurable enforcement behavior

#### Admin
- Basic admin dashboard
- User management
- Usage visibility and audit tools

---

### 5.2 Out of Scope (v1.1+)
- Marketplace
- Blog publishing
- Cover generator
- Audiobooks
- Co-authoring / realtime collaboration
- Analytics dashboards
- User earnings and payouts
- Unlimited or “fair use” AI without caps

---

## 6. Admin & Reporting Requirements

### 6.1 Admin Dashboard – Required Views

#### Per Author
- Active status (true/false)
- AI tokens used (current and historical)
- Gemini checks used
- Average tokens per check
- Last AI activity timestamp

#### Per Account
- Number of active authors
- Total AI tokens consumed
- Total Gemini checks consumed
- Average usage per active author
- Upsell status (normal / warning / triggered)

---

### 6.2 Audit & Control
Admin must be able to:
- See exactly why an upsell was triggered
- Verify the two-cycle overage condition
- Manually override enforcement if required
- Export usage data (CSV sufficient for MVP)

---

## 7. Non-Functional Requirements

### Cost Predictability
- Every AI request must:
  - Estimate token usage before execution (best effort)
  - Log actual token usage after execution
- Hard caps enforced at:
  - Per request
  - Per author per billing period
  - Per account per billing period

If a cap is reached:
- Request fails gracefully
- User receives a clear explanation
- No partial or corrupted output is returned

---

### Security & Reliability
- TLS everywhere
- Private storage by default
- Strict row-level security
- Audit logging for AI runs, uploads, and exports
- 99.5% uptime target for MVP
- Zero data loss tolerance

---

## 8. Risks

| Risk | Likelihood | Impact |
|---|---|---|
| Modal cold-start latency | Medium | High |
| Gemini token cost explosion | Medium | Very High |
| Llama hallucinated suggestions | Medium | High |
| Data security breach | Low | Critical |
| Integration churn (NGANDIWEB) | Medium | Medium |
| Editor scope creep | High | High |

Cost guardrails and async AI execution are the primary mitigations.

---

## 9. Key Decisions

1. Usage limits are **system behavior**, not marketing copy
2. Tokens are the universal AI cost unit
3. No silent overages, ever
4. Active author definition is fixed and enforced
5. AI enhances the editor but never blocks core writing

---

## 10. Summary

The Bearing MVP succeeds if it:
- Feels safe, fast, and predictable for authors
- Keeps AI costs bounded and auditable
- Aligns heavy usage with higher revenue
- Avoids scope creep and infrastructure complexity

AI guardrails are not optional.  
They are foundational to the product’s survival.

---