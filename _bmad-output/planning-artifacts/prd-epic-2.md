# Epic 2: Manuscript Editor & Llama AI

**Duration:** Weeks 8-11 (4 weeks)  
**Stories:** 2.1, 2.2, 2.3, 2.4, 2.5 (5 stories)  
**Total Effort:** 120 hours (Dev + QA + Review)

---

## Epic Goal

Build the core writing experience with autosave, version history, and lightweight Llama AI suggestions that never auto-modify text.

This epic ensures:
- Authors have distraction-free editor with instant responsiveness
- No data loss via autosave + versioning
- AI suggestions are optional and non-destructive
- Cost stays bounded via request scoping and caching

---

## Functional Requirements (Epic 2)

| FR | Requirement |
|----|----|
| **FR-05** | Create, upload, and delete manuscripts |
| **FR-06** | Rich-text editor with autosave (≤5s interval) |
| **FR-07** | Version history with restore capability |
| **FR-09** | Export manuscripts to PDF and DOCX |
| **FR-10** | Context-limited real-time AI suggestions |
| **FR-11** | AI suggestions never auto-modify text |
| **FR-12** | Token usage tracking per suggestion |

---

## Non-Functional Requirements (Epic 2)

| NFR | Requirement |
|-----|---|
| **NFR-01** | Editor response <200ms P95 |
| **NFR-02** | Llama suggestions <2s P95 |
| **NFR-04** | Autosave ≤5s interval |
| **NFR-06** | Zero data loss tolerance |
| **NFR-12** | Token estimation pre-execution |
| **NFR-13** | Token logging post-execution |
| **NFR-14** | Hard caps per request |

---

## User Stories

### Story 2.1 – Manuscript CRUD + Autosave

**Description**  
Authors can create, edit, and delete manuscripts with background autosave every 5 seconds. Network failures do not cause data loss.

**Acceptance Criteria**
- **AC 2.1.1:** Given edits in editor, when 5 seconds pass, then changes autosave to database
- **AC 2.1.2:** Given network disconnection, when reconnect occurs, then editor syncs and no data is lost
- **AC 2.1.3:** Given manuscript created, when autosave fires, then latest version is persisted
- **AC 2.1.4:** Given delete request, when author confirms, then manuscript is soft-deleted (recoverable for 30 days)
- **AC 2.1.5:** Given large manuscript (1M+ chars), when editing, then autosave completes within 5s

**Effort:** 30 hours  
**Dependencies:** 1.1 (Auth required), 1.4 (RLS ensures privacy)

**Cost Estimate (at 10 authors)**
- Supabase writes: ~1 write per author per 5s = 12 writes/min × 10 authors = 120/min = ~17K/month
- Supabase cost: $0 (included in base $25/month)
- Storage growth: ~10MB per author manuscript = 100MB total (negligible)
- **Monthly cost:** $0

---

### Story 2.2 – Version History

**Description**  
Authors can view a timeline of manuscript versions and restore to any previous version without losing current work (via branching or snapshot restoration).

**Acceptance Criteria**
- **AC 2.2.1:** Given edits, when viewing version history, then all versions appear with timestamps in reverse chronological order
- **AC 2.2.2:** Given selecting a version, when restoring, then manuscript content matches that version (current version saved as new version first)
- **AC 2.2.3:** Given 30+ versions, when viewing history, then pagination or virtual scroll shows all versions
- **AC 2.2.4:** Given restore request, when completed, then old version is preserved (no data loss)

**Effort:** 24 hours  
**Dependencies:** 2.1

**Cost Estimate (at 10 authors)**
- Storage: ~5 versions per author × 100KB average = 5MB per author = 50MB total (negligible)
- Supabase overhead: included
- **Monthly cost:** $0

---

### Story 2.3 – Real-Time Llama Suggestions

**Description**  
Authors can request AI suggestions on selected text or current paragraph. Suggestions are streamed in <2s, are non-destructive (suggest only, never auto-apply), and include confidence scores.

**Acceptance Criteria**
- **AC 2.3.1:** Given text selection, when clicking "suggest", then AI suggestion appears inline within 2s
- **AC 2.3.2:** Given suggestion displayed, when no "apply" button clicked, then text is unchanged (non-destructive)
- **AC 2.3.3:** Given token cap reached (3M/month per active author), when requesting suggestion, then graceful error: "You've used your monthly suggestions. Upgrade to continue."
- **AC 2.3.4:** Given suggestion, then confidence score displayed (0-100%) and low confidence (<50%) are marked as "beta"
- **AC 2.3.5:** Given response streamed, when arriving, then user sees partial output within 500ms (streaming UX)

**Effort:** 26 hours  
**Dependencies:** 2.1 (editor exists), 2.5 (metering exists for cost tracking)

**Cost Estimate (at 10 authors)**
- Llama inference: 2000 requests/month × 500 tokens avg = 1M tokens/month
- Modal cost with 60% cache: 400K tokens = $0.008 (negligible)
- Caching overhead: negligible
- **Monthly cost:** ~$0.01 per author = $0.10 total

**Note:** Cost is per-author and scales linearly. At 100 authors with same usage: ~$1/month.

---

### Story 2.4 – Manuscript Export (PDF/DOCX)

**Description**  
Authors can export their manuscript to PDF or DOCX format, using the current or specific version. Exports are structurally correct but visually simple (no complex layout engine).

**Acceptance Criteria**
- **AC 2.4.1:** Given manuscript, when clicking export PDF, then file downloads with title + chapters
- **AC 2.4.2:** Given export, when content reviewed, then no formatting is lost (bold, italic, lists preserved)
- **AC 2.4.3:** Given DOCX export, when opened in Word, then all text is readable and basic formatting visible
- **AC 2.4.4:** Given large manuscript (500K chars), when exporting, then process completes within 10s
- **AC 2.4.5:** Given export requested, when format selected, then latest version is used (or user can select version)

**Effort:** 20 hours  
**Dependencies:** 2.1 (editor), 2.2 (version history)

**Cost Estimate (at 10 authors)**
- Export generation: 1 export per author per month average = 10/month
- Compute (PDF/DOCX lib): negligible
- Storage (temp files): auto-cleanup, negligible
- **Monthly cost:** $0

---

### Story 2.5 – AI Usage Metering

**Description**  
Every AI request (Llama + Gemini) logs token usage with both estimated and actual values. Records are immutable per billing cycle and enforce hard caps per user/account.

**Acceptance Criteria**
- **AC 2.5.1:** Given AI call initiated, when estimated token cost exceeds cap, then request is rejected with clear message.
- **AC 2.5.2:** Given AI call completed, then actual tokens are logged to immutable record.
- **AC 2.5.3:** Given billing cycle end, then usage records are marked immutable.
- **AC 2.5.4:** Given usage tracked, then monthly usage report is generated and visible in dashboard.

**Effort:** 20 hours  
**Dependencies:** 1.1, 1.4

**Cost Estimate (at 10 authors)**
- Metering logic: negligible compute
- Storage: 500KB/month (negligible)
- **Monthly cost:** $0

---

## Cost Summary (Epic 2)

### At 10 Authors
| Component | Cost |
|-----------|------|
| Supabase (writes, storage) | $0 (included) |
| Modal.com (Llama with cache) | $0.10 |
| PDF/DOCX generation | $0 |
| **Total** | **$0.10/month** |

### At 100 Authors
| Component | Cost |
|-----------|------|
| Supabase (writes, storage) | $0 (included) |
| Modal.com (Llama × 100 authors) | $1.00 |
| PDF/DOCX generation | $0 |
| **Total** | **$1.00/month** |

### At 1000 Authors
| Component | Cost |
|-----------|------|
| Supabase (writes, storage, upgrade) | $50 |
| Modal.com (Llama × 1000 authors) | $10 |
| PDF/DOCX generation | $0 |
| **Total** | **$60/month** |

---

## Implementation Notes

### Tech Stack
- **Editor:** React + Slate or ProseMirror (configurable)
- **Autosave:** WebSocket via Supabase Realtime or polling
- **Versioning:** PostgreSQL event logging (copy-on-write snapshots)
- **Llama Integration:** Modal.com Llama 8B endpoint
- **Caching:** Session-level (5-min TTL), deduplicate identical requests
- **Export:** PDFKit (PDF) + python-docx (DOCX) or similar

### Cost Optimization
1. **Llama caching:** 60% cache hit rate (session-based, 5-min window)
2. **Request deduplication:** Hash user text, reuse suggestion if identical
3. **Streaming:** Return partial output within 500ms (UX feels faster)
4. **Batching:** Batch multiple small requests if possible

### Success Criteria (QA Gate)
- ✓ All 16 ACs (2.1-2.4) verified
- ✓ Autosave fires within 5s (P95)
- ✓ Suggestion response <2s (P95)
- ✓ Export completes within 10s
- ✓ Zero data loss in network outage test
- ✓ Cost within estimate (~$0.10 at 10 authors)
- ✓ Cache hit rate >50% for suggestions

---

## Dependency Notes

**Story 2.1** is the foundation for all subsequent stories in this epic.

**Story 2.5 (Metering)** is required by **Story 2.3 (Llama)** and **Story 3.1 (Gemini)**.

---

## Ready for Development

This epic begins in Week 8 (after Epic 1 completes integration testing).

**Expected completion:** Week 11

**Gate before moving to Epic 3:** All 4 stories merged, integration tested, cost validated.
