# QA Action Items: Stories 8.11 & 8.12

**Source:** Browser QA testing (Stories 8.9–8.15)  
**Initial report:** Feb 6 2026 — ❌ Not Ready  
**Retest report:** Feb 7 2026 — see `docs/Browser QA Testing.docx`  

---

## Retest results (Feb 7 2026) — summary

| Test Case | Original | Retest | Notes |
|-----------|----------|--------|-------|
| 8.11.1 | ❌ Fail | ✅ Pass | ISBN modal loads manuscripts; form usable. Brief "No manuscripts found" flash before load (minor). |
| 8.11.2 | ❌ Fail | ✅ Pass | Manuscript dropdown in Marketplace ISBN modal lists all manuscripts. |
| 8.11.3 | ⚠️ Partial | ✅ Pass | Fixed in PR #77. BISAC category prefills; author name prefills from metadata with display-name fallback. |
| 8.12.1 | ❌ Fail | ✅ Pass | Marketplace service modals include manuscript dropdown; manuscript-scoped shows read-only field. |
| 8.12.2 | ❌ Fail | ✅ Pass | Service-specific fields implemented (Author Website, Marketing Package, Social Media Launch Kit). |
| 8.12.5 | ❌ Fail | ✅ Pass | Duplicate prevention: View Order shown instead of Request Service when request exists. |
| Cross-story: ISBN duplicate prevention | ❌ Fail | ⚠️ Not verified | Stripe checkout not completable in test env; ISBN duplicate prevention untested. |
| ISS-6 (8.9.2 fullscreen Exit button) | — | — | Not re-tested. |

**Resolved:** ISS-1, ISS-2, ISS-3, ISS-4, ISS-5  
**Still open:** ISS-6 (optional, low priority)

---

## Resolved items

### ISS-5: ISBN modal author/category prefill (fixed in PR #77)
**Test case:** 8.11.3  
**Severity:** Medium

| Action | Notes |
|--------|-------|
| **5.1** Prefill **author name** when opening ISBN modal from a manuscript with metadata; use **fallback to user display name** when metadata is missing. | Fixed: author name prefills from manuscript metadata or user display name. |
| **5.2** Ensure BISAC category prefill is consistent (already works for some manuscripts). | Some manuscripts prefilled, others did not; standardize. |

**Definition of done:** Author name prefills from manuscript metadata or user display name; category prefills from BISAC when present.

---

### Optional polish (non-blocking)

| Item | Notes |
|------|-------|
| **ISBN modal flash** | Brief "No manuscripts found" warning before manuscripts load; form becomes usable after. Consider suppressing or delaying empty-state until load completes. |
| **ISS-6: Fullscreen Exit button** | Add visible Exit button to floating bar (8.9.2). Low priority; not re-tested. |

---

## Resolved items (reference only)

- **ISS-1** ✅ ISBN modal loads manuscripts in Marketplace; dropdown shows.
- **ISS-2** ✅ Manuscript dropdown added to Marketplace service modals.
- **ISS-3** ✅ Service-specific fields implemented for Author Website, Marketing Package, Social Media Launch Kit.
- **ISS-4** ✅ Duplicate prevention: View Order shown when request exists.

---

## Checklist for DEV handoff

- [x] **ISS-1** Fix Marketplace ISBN modal — **Done**
- [x] **ISS-2** Add manuscript dropdown to Marketplace service modals — **Done**
- [x] **ISS-3** Service-specific fields — **Done**
- [x] **ISS-4** Duplicate prevention — **Done**
- [x] **ISS-5** ISBN prefill: author name + display-name fallback — **Done**
- [x] *Optional:* Suppress "No manuscripts found" flash in ISBN modal — **Done**
- [ ] *Optional:* ISS-6 — fullscreen Exit button

**Re-test after ISS-5:** Run 8.11.3 to confirm author prefill and display-name fallback.
