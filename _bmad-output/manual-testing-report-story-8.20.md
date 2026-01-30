# Manual Testing Report - Story 8.20: Sync & State (Manuscript ↔ Service)

**Tester:** Ryanf (QA User)
**Date:** 2026-01-28
**Environment:** Production (Vercel)
**Commit:** b10744a

---

## 📋 Summary
Manual verification of the end-to-end sync between manuscript state and service requests. Testing focused on UI locking, banner display, and cancellation flows.

**Overall Result:** ✅ **PASS** (with skipped Admin scenarios covered by automated tests)

---

## 🧪 Test Execution Results

### Scenario 1: Create Request & Verify Locking
*Target: Verify that creating a service request locks the manuscript and updates the UI.*
- **Action:** Created "Cover Design" request from the new manuscript-specific Services page.
- **Check:** Manuscript List showed "Service Active" badge. ✅
- **Check:** Editor showed yellow "Editing Locked" banner. ✅
- **Check:** Editor body and title were read-only. ✅
- **Result:** **PASS**

### Scenario 2: Cancel Request & Verify Unlocking
*Target: Verify that cancelling a pending request immediately restores edit access.*
- **Action:** Clicked "Cancel Request" in the banner and confirmed in modal.
- **Check:** Banner disappeared. ✅
- **Check:** Editor body and title became editable immediately. ✅
- **Check:** Manuscript List badge removed. ✅
- **Result:** **PASS**

### Scenario 3: Duplicate Prevention
*Target: Verify system prevents multiple active requests.*
- **Action:** Attempted to request "Cover Design" again while a request was already pending.
- **Check:** System displayed error: "This manuscript already has an active Cover Design request". ✅
- **Result:** **PASS**

### Scenario 4: Admin Status Updates
*Target: Verify UI response to status changes (In Progress -> Completed).*
- **Result:** **SKIPPED** (No admin access during manual run). 
- *Note: Backend logic for status transitions is covered by automated suite `tests/lib/service-requests.test.ts`.*

---

## 📝 Observations
- The integration of the "Services" link directly in the editor header provides a smooth workflow for authors.
- The transition from locked to unlocked state after cancellation is immediate and doesn't require a manual page refresh (handled by `router.refresh()`).
- Error messages for duplicate requests are clear and specific to the service type.

---
**Gate Decision Recommendation:** **PASS**
*P0 Logic (Locking/Integrity) verified by both Automated and Manual testing.*
