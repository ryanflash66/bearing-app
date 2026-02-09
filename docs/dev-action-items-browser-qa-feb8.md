# Dev Action Items: Browser QA Retest (Feb 8 2026)

**Priority:** Medium (blocking 8.11 AC)  
**Source:** Browser QA Testing.docx — Second Retest  
**Stories:** 8.11, 8.12  
**For:** DEV agent implementation

---

## QA summary

| Test Case | Original | Retest | Notes |
|-----------|----------|--------|-------|
| 8.11.1 | ❌ Fail | ✅ Pass | ISBN modal loads manuscripts; form usable. Minor flash of "No manuscripts found" before load. |
| 8.11.2 | ❌ Fail | ✅ Pass | Manuscript dropdown in Marketplace ISBN modal lists all manuscripts. |
| 8.11.3 | ⚠️ Partial | ❌ **Fail** | **Open.** Author Name never prefills; BISAC category may auto-fill but author remains blank. Violates AC. |
| 8.12.1 | ❌ Fail | ✅ Pass | Marketplace service modals include manuscript dropdown; manuscript-scoped shows read-only field. |
| 8.12.2 | ❌ Fail | ✅ Pass | Service-specific fields implemented (Author Website, Marketing Package, Social Media Launch Kit). |
| 8.12.5 | ❌ Fail | ✅ Pass | Duplicate prevention: View Order shown when request exists. |
| Cross-story: ISBN duplicate prevention | ❌ Fail | ⚠️ Not verified | Stripe checkout blocked in test env; cannot verify ISBN duplicate prevention. |

**Resolved:** ISS-1, ISS-2, ISS-3, ISS-4  
**Open:** ISS-5 (8.11.3 — author prefill)

---

## Action items for DEV

### ISS-5: ISBN registration form — prefill Author Name (8.11.3)

**Problem:** The ISBN registration form does not pre-populate the **Author Name** field for any manuscript, including those with metadata. BISAC category may auto-fill, but the author name remains blank. This violates the acceptance criteria requiring the author's full name to appear automatically when the form opens.

---

#### 5.1 Prefill author name from manuscript metadata

- When opening the ISBN modal from a manuscript with **metadata**, prefill the **Author Name** field from manuscript metadata (e.g. `metadata.author` or equivalent).
- Ensure the field is populated as soon as the manuscript is selected (dropdown change) or when opening from a manuscript-scoped Services page.

**Definition of done:** Selecting a manuscript with author metadata populates the Author Name field in the ISBN form.

---

#### 5.2 Fallback to user display name when metadata is missing

- When manuscript has no author metadata, prefill **Author Name** with the **user's display name** (e.g. `profiles.display_name` or `user.user_metadata`).
- Apply this fallback when:
  - Opening from a manuscript without metadata.
  - Selecting a manuscript from the dropdown that has no author in metadata.

**Definition of done:** Author Name is never blank when the user has a display name; fallback to display name is applied when manuscript metadata lacks author.

---

#### 5.3 Ensure consistency across contexts

- Apply prefill logic when opening the ISBN modal from:
  - **Marketplace** (manuscript selected from dropdown).
  - **Manuscript Services page** (manuscript context known).
- BISAC category prefill should remain consistent; some manuscripts prefilled, others did not — standardize so both author and category prefill reliably when data exists.

**Definition of done:** Author and BISAC category prefill correctly in both Marketplace and manuscript-scoped contexts.

---

## Re-test after fix

- **8.11.3:** Open ISBN modal from manuscript with metadata → Author Name prefilled.  
- **8.11.3:** Open ISBN modal from manuscript without metadata → Author Name prefilled from display name.  
- **8.11.3:** Open ISBN modal from Marketplace, select manuscript → Author Name prefilled per manuscript or fallback.

---

## Optional polish (non-blocking)

| Item | Notes |
|------|-------|
| **ISBN modal flash** | Brief "No manuscripts found" warning before manuscripts load; form becomes usable after. Consider suppressing or delaying empty-state until load completes. |

---

## Key file references

| Area | Likely file(s) |
|------|----------------|
| ISBN registration modal | Search for ISBN modal / registration form components (e.g. `IsbnRegistrationModal`, `BuyIsbnModal`, or similar) |
| Manuscript metadata | `manuscripts` table, `metadata` JSONB; author may be in `metadata.author` or related |
| User display name | `profiles.display_name` or Supabase Auth `user.user_metadata` |

---

*End of action items. DEV can implement 5.1 → 5.2 → 5.3 and re-test against 8.11.3.*
