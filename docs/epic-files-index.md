# Sharded Epic Files: Index & Summary

**Created for The Bearing – BMAD v6 Implementation**

---

## Files Created

| File | Epic | Duration | Stories | Effort | Cost at 10 Authors |
|------|------|----------|---------|--------|-------------------|
| `prd-epic-1.md` | Foundation & Auth | Weeks 5-8 | 1.1-1.4 (4) | 82h | $0 |
| `prd-epic-2.md` | Editor & Llama AI | Weeks 8-11 | 2.1-2.4 (4) | 100h | $0.10 |
| `prd-epic-3.md` | Consistency Engine | Weeks 11-14 | 3.1-3.3 (3) | 66h | $1.35 |
| `prd-epic-4.md` | Support & Admin | Weeks 14-16 | 4.1-4.3 (3) | 54h | $0 |
| **TOTAL** | — | 18 weeks | 13 stories | **302h** | **$1.45/month** |

---

## How to Use These Files

### For Story Generation (Architect Phase)
Each epic file is sized to fit in one LLM context window (~2000-3000 tokens). When generating detailed user stories, load the relevant epic file into your chat:

```
Chat: "The Bearing - BMAD Story Generation (Epic 1)"
Instructions: "Generate 4 detailed implementation stories for Epic 1"
Context: [Paste entire prd-epic-1.md]
```

### For Development (Build Phase)
When starting an epic, developers load the sharded file to understand:
- All FRs and NFRs for that epic
- All acceptance criteria for each story
- Cost estimates and scaling implications
- Dependencies between stories

### For Cost Tracking (Ongoing)
Update cost estimates as stories are implemented. Each epic file shows costs at 10, 100, and 1000 authors for planning future scale.

---

## Key Design Decisions

### 1. Sharding Strategy
Each epic is self-contained but cross-epic dependencies are documented:
- Epic 1 (Auth) → foundational, no dependencies
- Epic 2 (Editor) → depends on Epic 1 + starts Epic 3 dependency chain
- Epic 3 (Consistency) → depends on Epic 2, feeds into Epic 4
- Epic 4 (Support) → depends on Epics 1, 3 for data

### 2. Cost Breakdown
**At MVP (10 authors):** $1.45/month
- Epic 1: $0 (auth infrastructure)
- Epic 2: $0.10 (Llama with 60% cache)
- Epic 3: $1.35 (Gemini with 90% cache)
- Epic 4: $0 (support + admin)

**Total MVP infrastructure cost:** ~$50 baseline + $1.45 AI = **~$51.45/month** ✓ (within $70 target)

### 3. Token Guardrails
**Per active author per month (Standard Tier):**
- 10 manual consistency checks
- 10M AI tokens (Gemini + Llama combined)
- Upsell/overage triggered if exceeded for 2 consecutive months

---

## Implementation Timeline

```
Week 5-8:   Epic 1 (Foundation & Auth)
  → Weeks 5-6: Stories 1.1, 1.2 in parallel
  → Week 7: Stories 1.3, 1.4
  → Week 8: Integration test + Epic 2 kickoff

Week 8-11:  Epic 2 (Manuscript Editor & Llama AI)
  → Weeks 8-9: Stories 2.1, 2.2
  → Weeks 9-10: Story 2.3 (Llama)
  → Week 10: Story 2.4 (Export)
  → Week 11: Integration test + Epic 3 kickoff

Week 11-14: Epic 3 (Consistency Engine)
  → Weeks 11-12: Stories 3.1, 3.2 in parallel
  → Weeks 12-13: Story 3.3 (Metering)
  → Week 14: Integration test + Epic 4 kickoff

Week 14-16: Epic 4 (Support & Admin)
  → Week 14: Story 4.3 (Support) in parallel with 4.1
  → Weeks 14-15: Story 4.1 (Upsell)
  → Weeks 15-16: Story 4.2 (Admin Dashboard)
  → Week 16: Integration test

Week 17-18: Stabilization & Deployment
  → Integration tests, security audit, performance validation
  → Canary rollout (10% → 100%)
  → MVP live 🚀
```

---

## Dependency Notes

### Critical Path (Must complete in order):
```
1.1 (Auth) → 1.2, 1.3, 1.4 → 2.1 → 2.2 → 2.3 → 3.1 → 3.3 → 4.1
```

### Parallel Opportunities:
- **Week 5-6:** 1.1 + 1.3 in parallel (auth + DB schema)
- **Week 11-12:** 3.1 + 3.2 in parallel (check + report)
- **Week 14:** 4.3 + 4.1 in parallel (support is independent)

---

## Success Criteria per Epic

### Epic 1 ✓
- [ ] All 4 stories merged
- [ ] RLS policies tested (no data leakage)
- [ ] Auth flow end-to-end (signup → verify → MFA → login)

### Epic 2 ✓
- [ ] All 4 stories merged
- [ ] Autosave fires within 5s (P95)
- [ ] Llama suggestions < 2s (P95)
- [ ] Zero data loss in network failure test
- [ ] Cache hit rate > 50% for suggestions

### Epic 3 ✓
- [ ] All 3 stories merged
- [ ] Gemini checks < 15s (P95)
- [ ] Large manuscripts chunked correctly
- [ ] Metering accurate (estimated vs. actual < 5% variance)
- [ ] Hard caps enforced

### Epic 4 ✓
- [ ] All 3 stories merged
- [ ] Upsell triggers correctly on day 1 of Month 2
- [ ] Admin dashboard loads < 1s
- [ ] Audit logs complete
- [ ] Support emails delivered

---

## Next Steps

1. **For Architect Phase:**
   - Load each epic file into IDE chats for architecture subsystem design
   - Create subsystem-specific docs (architecture.auth.md, architecture.ai.md, etc.)

2. **For Story Manager Phase:**
   - Use each epic file as context for story generation
   - Generate detailed acceptance criteria, implementation tasks, cost tracking

3. **For Development Phase:**
   - Load relevant epic file when starting each epic
   - Reference dependency map when planning parallelization
   - Track actual cost vs. estimate in story files

4. **For QA Phase:**
   - Use epic ACs as test cases
   - Validate integration tests per epic
   - Verify cost tracking is accurate

---

## Cost Tracking Template (to update as stories ship)

```markdown
# The Bearing: Actual vs. Estimated Cost Tracking

## Epic 1: Foundation & Auth
| Story | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| 1.1 (Auth) | $0 | $0 | ✓ Merged |
| 1.2 (Profiles) | $0 | $0 | ✓ Merged |
| 1.3 (Roles) | $0 | $0 | ✓ Merged |
| 1.4 (RLS) | $0 | $0 | ✓ Merged |
| **Epic 1 Total** | **$0** | **$0** | **✓** |

## Epic 2: Editor & Llama AI
| Story | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| 2.1 (Upload) | $0 | $0 | ✓ Merged |
| 2.2 (Version) | $0 | $0 | ✓ Merged |
| 2.3 (Llama) | $0.10 | TBD | In QA |
| 2.4 (Export) | $0 | TBD | Pending |
| **Epic 2 Total** | **$0.10** | **TBD** | **In Progress** |

[Continue for Epics 3 & 4]

## Summary
- **Estimated MVP cost:** $1.45/month
- **Actual to date:** $0.00/month
- **Remaining to track:** $1.45/month (Epics 3 & 4)
```

---

## Files Ready for Download

All 4 sharded epic files are ready for download from `docs/`:
- `prd-epic-1.md` (2400 tokens)
- `prd-epic-2.md` (2800 tokens)
- `prd-epic-3.md` (2900 tokens)
- `prd-epic-4.md` (2600 tokens)

Each file is optimized to fit in a single LLM context window for story generation and architecture work.

---

**Next Action:** Proceed to Step 2.3 (Architect Phase) with Epic 1 architecture design using prd-epic-1.md as context.
