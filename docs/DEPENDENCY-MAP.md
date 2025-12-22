# Story Dependencies for The Bearing

## Dependency Chain

### Epic 1: Foundation & Auth  
(Can partially run in parallel. Must complete before Epic 2 ships.)

Story 1.1: Email + MFA Authentication  
↓ (required by)  
Story 1.2: Author Dashboard Skeleton (dashboard must be protected by auth)  
↓ (required by)  
Story 1.3: Database Schema + RLS Policies (all data access depends on this)  
↓ (required by)  
Story 1.4: Basic Admin Panel (needs auth + roles + RLS)

---

### Epic 2: Editor & Llama AI  
(Starts after Story 1.3 is complete.)

Story 2.1: Manuscript CRUD + Autosave  
↓ (required by)  
Story 2.2: Version History & Restore  
↓ (required by)  
Story 2.3: Real-Time Llama AI Suggestions  
↓ (required by)  
Story 2.4: Manuscript Export (PDF & DOCX)

---

### Epic 3: Consistency Engine  
(Can start once the editor exists.)

Story 3.1: Manual Gemini Consistency Check  
↓ (required by)  
Story 3.2: Structured Consistency Reports  

Story 3.3: AI Usage Metering & Hard Caps  
(required by Llama + Gemini + Epic 4 monetization)

---

### Epic 4: Support & Admin  
(Can partially run in parallel with Epic 3.)

Story 4.1: Usage Guardrails & Upsell Workflow  
(requires Story 3.3)

Story 4.2: Admin Dashboard & Overrides  
(requires Story 3.3 + Story 4.1)

Story 4.3: In-App Support Messaging  
(requires Story 1.1 + Story 1.2)

---

## Which Stories Can Run in Parallel

### Weeks 5–6: Epic 1 Foundation

- Story 1.1 (Auth): dependency-free
- Story 1.3 (DB Schema + RLS): can start in parallel with 1.1
- Story 1.2 (Dashboard): waits for 1.1
- Story 1.4 (Admin): waits for 1.1 + 1.3

**Parallelization**
- 1.1 + 1.3 together
- Then 1.2
- Then 1.4

---

### Weeks 7–8: Epic 1 Finish + Epic 2 Start

- Story 1.4 (Admin): completes Epic 1
- Story 2.1 (Manuscript CRUD + Autosave): starts immediately after 1.3

**Parallel**
- 1.4 + 2.1

---

### Weeks 9–10: Epic 2 Core Flow

- Story 2.2 (Version History): waits for 2.1
- Story 2.3 (Llama Suggestions): waits for 2.1 (editor exists)
- Story 2.4 (Export): waits for 2.2

**Order**
- 2.1 → 2.2
- 2.3 can overlap late 2.2
- 2.4 last

---

### Weeks 11–14: Epics 3 & 4 in Parallel

- Story 3.1 (Gemini Consistency): starts after 2.1
- Story 3.2 (Reports): waits for 3.1
- Story 3.3 (AI Usage Metering): can start earlier but must finish before launch
- Story 4.3 (Support Messaging): starts after 1.2
- Story 4.1 (Upsell): waits for 3.3
- Story 4.2 (Admin Overrides): waits for 4.1 + 3.3

**Parallel**
- 3.1 + 4.3
- 3.3 overlaps with 2.3 + 3.1

---

## Blocking & Critical Path

### Critical Path (true blocker chain)

Story 1.1  
→ Story 1.2  
→ Story 1.3  
→ Story 2.1  
→ Story 2.3  
→ Story 3.3  
→ Story 4.1  

**If any of these slip, launch slips.**

---

### Non-Critical / Slack Stories

These can slip without blocking MVP launch:

- Story 1.4 (Basic Admin Panel)
- Story 2.4 (Export)
- Story 3.2 (Structured Reports)
- Story 4.3 (Support Messaging)

---
