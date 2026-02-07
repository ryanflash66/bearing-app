# QA Action Items: Stories 8.11 & 8.12 (Browser QA Feb 6 2026)

**Source:** Browser QA testing.pdf (Stories 8.9–8.15)  
**Release verdict:** ❌ Not Ready  
**Stories in scope:** 8.11 (ISBN Registration Flow), 8.12 (Service Submission Forms), plus 8.9 (fullscreen) and cross-story duplicate prevention.

---

## High priority (blocking release)

### ISS-1: ISBN modal fails to load manuscripts in Marketplace context  
**Test cases:** 8.11.1, 8.11.2  
**Severity:** High

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **1.1** Fix manuscript loading when opening Buy ISBN from **Marketplace**. Modal must call the correct API with authenticated user context so manuscripts are fetched. | DEV | Root cause: "Could not find your account" / Failed to load manuscripts despite user having 14 manuscripts. |
| **1.2** Ensure ISBN Registration modal in Marketplace shows a **manuscript dropdown** (not empty state) when manuscripts exist. | DEV | Currently shows "No manuscripts found" and disabled CTA. |
| **1.3** Verify CTA is only disabled when there are genuinely no manuscripts (or required fields missing). | DEV | 8.11.4 already passes in Services context; apply same logic in Marketplace. |

**Definition of done:** From Marketplace, clicking Buy ISBN opens the modal, loads the user’s manuscripts, shows the dropdown, and allows proceeding when category + author are set.

---

### ISS-2: Service modals in Marketplace lack manuscript dropdown  
**Test case:** 8.12.1  
**Severity:** High

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **2.1** Add a **manuscript dropdown** to all service request modals when opened from **Marketplace** (user must select which manuscript the request applies to). | DEV | Currently only a generic "Request Details" textarea is shown. |
| **2.2** Ensure dropdown is populated with the same manuscript list used in manuscript-scoped flows (consistent with 8.11 fix). | DEV | Reuse/same API as ISBN modal where applicable. |

**Definition of done:** From Marketplace, any "Request Service" opens a modal that includes manuscript selection plus request details.

---

### ISS-3: Service-specific fields missing on request forms  
**Test case:** 8.12.2  
**Severity:** High

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **3.1** **Author Website** request form: add service-specific fields (e.g. genre/vibe, budget range, target platforms) in addition to Request Details. | DEV | Per story 8.12 spec; currently only generic textarea. |
| **3.2** **Marketing Package** request form: add service-specific fields per spec. | DEV | Same. |
| **3.3** **Social Media Launch Kit** request form: add service-specific fields per spec. | DEV | Same. |
| **3.4** Ensure fields appear in both **manuscript** and **marketplace** context when opening the same service type. | DEV | 8.12.2 notes manuscript or marketplace. |

**Definition of done:** Each service type shows its specified fields; forms are not generic-only.

---

## Medium priority (required for correctness)

### ISS-4: Duplicate service requests not prevented  
**Test case:** 8.12.5  
**Severity:** Medium

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **4.1** After a service request exists for a manuscript, that manuscript’s **Services page** must not offer a new "Request Service" for the same service type; show **View Order** (or disabled state) instead. | DEV | Currently Editing/Proofreading still shows "Request Service" and allows duplicate submission. |
| **4.2** Apply duplicate-prevention logic consistently for all service types (Editing, Author Website, Marketing, Social Media, etc.). | DEV | Cross-story failure: duplicate prevention across ISBN and services. |

**Definition of done:** Submitting once disables or replaces the request CTA with View Order for that manuscript + service type.

---

### ISS-5: ISBN modal author/category prefill from manuscript metadata  
**Test case:** 8.11.3  
**Severity:** Medium

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **5.1** When opening ISBN modal from a manuscript with **metadata**: prefill **author name** from manuscript metadata (fallback to user display name when missing). | DEV | Currently category sometimes prefills but author name never. |
| **5.2** When manuscript has **BISAC** metadata: prefill **category** consistently. | DEV | Some manuscripts prefilled category, others not; standardize. |
| **5.3** When manuscript has no metadata: ensure fallbacks (e.g. display name) are applied so author field is never blank when available. | DEV | "Manuscripts without metadata had neither author nor category prefilled" – fix fallbacks. |

**Definition of done:** Author and BISAC category prefill reliably from manuscript metadata or display name.

---

## Low priority (UX polish)

### ISS-6: Fullscreen – no visible Exit button  
**Test case:** 8.9.2  
**Severity:** Low

| Action | Owner | AC / Notes |
|--------|--------|-------------|
| **6.1** Add a visible **Exit** button to the fullscreen floating bar (in addition to Esc / Ctrl+\ hint). | DEV | Autosave and theme toggle already present; only Exit is missing. |

**Definition of done:** Floating bar shows a clickable Exit control.

---

## Verification & status

| Action | Re-test with |
|--------|----------------|
| All High (ISS-1, ISS-2, ISS-3) | 8.11.1, 8.11.2, 8.12.1, 8.12.2 |
| ISS-4 | 8.12.5, Cross-story duplicate prevention |
| ISS-5 | 8.11.3 |
| ISS-6 | 8.9.2 |

**Sprint status suggested updates (after fixes):**

- **8.11** – Currently `done`; consider `in-progress` or `review` until ISS-1 and ISS-5 are closed and re-tested.
- **8.12** – Currently `backlog`; move to `in-progress` when work starts; set to `done` only after ISS-2, ISS-3, ISS-4 pass QA.
- **8.9** – Optional: close ISS-6 before or after release depending on priority.

---

## Summary checklist for DEV

- [ ] **ISS-1** Fix Marketplace ISBN modal: load manuscripts, show dropdown, enable flow.
- [ ] **ISS-2** Add manuscript dropdown to Marketplace service modals.
- [ ] **ISS-3** Add service-specific fields to Author Website, Marketing Package, Social Media Launch Kit forms.
- [ ] **ISS-4** Duplicate prevention: show View Order / disable Request Service when request exists.
- [ ] **ISS-5** ISBN prefill: author name + BISAC category from manuscript metadata/display name.
- [ ] **ISS-6** Fullscreen: add visible Exit button to floating bar.

Once High (ISS-1, ISS-2, ISS-3) and Medium (ISS-4, ISS-5) are implemented and re-tested, run Browser QA again and update release verdict.
