# Epic 3: Consistency Engine

**Duration:** Weeks 11-14 (4 weeks)  
**Stories:** 3.1, 3.2 (2 stories)  
**Total Effort:** 46 hours (Dev + QA + Review)

---

## Epic Goal

Build async, deep manuscript analysis using Gemini API with strict cost controls via chunking, caching, and request limiting.

This epic ensures:
- Authors can identify character/plot/tone inconsistencies
- Heavy AI work (Gemini) runs async, never blocking the editor
- Every token is logged and bounded
- Cost is predictable and enforceable

---

## Functional Requirements (Epic 3)

| FR | Requirement |
|----|----|
| **FR-13** | Manual consistency check initiation (author-triggered) |
| **FR-14** | Asynchronous execution via Modal jobs |
| **FR-15** | Structured consistency reports (issues grouped by type) |
| **FR-16** | Track AI tokens per author per billing period |
| **FR-17** | Track Gemini checks per author per billing period |
| **FR-18** | Immutable usage records per billing cycle |

---

## Non-Functional Requirements (Epic 3)

| NFR | Requirement |
|-----|---|
| **NFR-03** | Gemini checks <15s P95 (async, not blocking) |
| **NFR-12** | Token estimation pre-execution |
| **NFR-13** | Token logging post-execution |
| **NFR-14** | Hard caps per request, author, account |
| **NFR-15** | Graceful failure when caps reached |
| **NFR-16** | <$70/month at 10 authors |
| **NFR-17** | <$300/month at 100 authors |
| **NFR-18** | Establish a real-world P95 baseline of <15s for Gemini checks post-deployment |

---

## User Stories

### Story 3.1 – Manual Gemini Consistency Check

**Description**  
Authors manually trigger a full-manuscript consistency analysis via Gemini API. The check runs asynchronously (non-blocking), and results are stored for later review.

**Acceptance Criteria**
- **AC 3.1.1:** Given manuscript loaded, when author clicks "Check Consistency", then async job starts immediately and user sees "checking..." status
- **AC 3.1.2:** Given async job completion, then structured report is stored and available for viewing
- **AC 3.1.3:** Given check in progress, when author edits text, then editor is not blocked (async is true async)
- **AC 3.1.4:** Given large manuscript (1M+ chars), when check initiated, then automatic chunking occurs (500k token chunks max per API call)
- **AC 3.1.5:** Given network failure during check, then job can be retried manually without loss

**Effort:** 24 hours  
**Dependencies:** 2.1 (editor exists to check)

**Cost Estimate (at 10 authors)**
- Gemini input tokens: ~500k per check × 2 checks/month per author = 10M tokens/month at 10 authors
- Gemini input cost: 10M × $0.075/1M = $0.75
- Gemini output tokens: ~200k per check = 2M/month × $0.30/1M = $0.60
- **With 90% implicit caching:** $0.75 + $0.60 = $1.35 per month (or ~$0.13 per author)
- **Monthly cost:** ~$1.35

**Note:** Caching provided by Google Cloud (manuscript cached after first check within ~24h window).

---

### Story 3.2 – Structured Consistency Reports

**Description**  
Consistency check results are organized into structured reports with issues grouped by category (character inconsistencies, plot gaps, tone shifts, etc.). UI shows clear navigation to problematic sections.

**Acceptance Criteria**
- **AC 3.2.1:** Given consistency check results, when report is viewed, then issues are grouped by type (character, plot, tone, logic)
- **AC 3.2.2:** Given issue in report, when clicked, then manuscript jumps to relevant section
- **AC 3.2.3:** Given no issues found, then clear empty state: "No issues detected ✓"
- **AC 3.2.4:** Given report with 50+ issues, when viewing, then list is paginated or virtualized (performant)
- **AC 3.2.5:** Given report, when exporting, then user can download as JSON or PDF summary

**Effort:** 22 hours  
**Dependencies:** 3.1

**Cost Estimate (at 10 authors)**
- Report generation: included in Gemini call (above)
- Storage: ~50KB per report × 2 reports/month = 1MB/month (negligible)
- **Monthly cost:** $0

---

---

## Cost Summary (Epic 3)

### At 10 Authors
| Component | Cost |
|-----------|------|
| Gemini API (consistency checks) | $1.35 |
| Modal async job orchestration | $0 (included) |
| Storage (reports) | $0 |
| **Total** | **$1.35/month** |

### At 100 Authors
| Component | Cost |
|-----------|------|
| Gemini API × 100 authors | $13.50 |
| Modal async orchestration | $0 |
| Storage (reports) | $0 |
| **Total** | **$13.50/month** |

### At 1000 Authors
| Component | Cost |
|-----------|------|
| Gemini API × 1000 authors | $135 |
| Modal async orchestration | $5 |
| Storage (reports) | $2 |
| **Total** | **$142/month** |

---

## Implementation Notes

### Tech Stack
- **Gemini Integration:** Google Cloud REST API (or Vertex AI SDK)
- **Async Jobs:** Modal.com (scheduled function, status polling)
- **Report Storage:** PostgreSQL (structured JSON)
- **Caching:** Google Cloud implicit caching (90% hit rate on repeated manuscripts)
- **Chunking:** Split >500k token manuscripts into segments, analyze separately, merge results

### Cost Optimization
1. **Implicit Google caching:** Repeated checks of same manuscript = 90% cost reduction
2. **Chunking strategy:** 500k token limit per API call avoids token explosion
3. **Batch processing:** Queue multiple checks, run during off-peak if possible
4. **Selective analysis:** Only analyze changed sections on re-check (advanced optimization for v1.1)

### Success Criteria (QA Gate)
- ✓ All 11 ACs (3.1-3.3) verified
- ✓ Async check completes <15s (P95)
- ✓ Large manuscripts chunked correctly
- ✓ Reports structured and navigable
- ✓ Metering accurate (estimated vs. actual match within 5%)
- ✓ Cost within estimate (~$1.35 at 10 authors)
- ✓ No token overages
- ✓ Hard caps enforced
- ✓ Immutable billing records passed audit
- ✓ Real-world P95 baseline (<15s) established post-deployment

### Critical Path
**Story 2.5 (Metering)** is a BLOCKER for **Story 2.3 (Llama suggestions)** to fully ship. Recommend completing 2.5 early in Epic 2.

---

## Integration with Epic 4

**Story 4.1 (Upsell Workflow)** consumes data from **Story 2.5 (Metering)**.

- 2.5 must complete before 4.1 can fully implement the usage-based trigger
- 4.1 can mock 2.5 API for early development.

---

## Ready for Development

This epic can begin in **Week 11** (after Epic 2 completes integration testing).

**Expected completion:** Week 14

**Gate before moving to Epic 4:** All 3 stories merged, metering verified accurate, cost validated within estimates.
