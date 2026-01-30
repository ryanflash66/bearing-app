# Manual Testing Report - Bearing App

**Date:** January 29, 2026
**Tester:** QA Automation
**Environment:** https://bearing-app.vercel.app
**User:** Ry.Balungeli (User)

---

## 🔒 Story 8.5: Two-Factor Authentication (Security)

| Test Case | Steps Performed | Expected Result | Actual Result | Status |
|-----------|-----------------|-----------------|---------------|--------|
| Dashboard - 2FA Card Removed | Navigated to Dashboard | "Enable 2FA" card should be removed | Only a status indicator "Two-Factor Authentication is enabled" present (no enable card/button) | **PASS** |
| Settings → Security Tab Navigation | Navigated to Settings via sidebar | Security Tab with 2FA section should be visible | **No Security Tab exists** - Only "Profile" and "Preferences" sections visible | **FAIL** |
| Enable 2FA Flow | Click "Enable 2FA" in Settings | QR code should appear | Cannot test - Security section missing | **BLOCKED** |
| Incorrect Code Rejection | Enter wrong code | System should reject | Cannot test - Security section missing | **BLOCKED** |
| Correct Code Acceptance | Enter correct code | System accepts, state shows "Enabled" | Cannot test - Security section missing | **BLOCKED** |
| Persistence | Refresh page after enabling | 2FA should still show "Enabled" | Cannot test - Security section missing | **BLOCKED** |
| Disable Logic | Click "Disable" | Status updates immediately | Cannot test - Security section missing | **BLOCKED** |

### Defect #1 (Critical)

**Title:** Security/Two-Factor Authentication section missing from Settings page
**Severity:** Critical
**Steps to Reproduce:**
1. Navigate to Dashboard → Settings (sidebar)
2. Observe the Settings page content

**Expected:** A "Security Tab" with "Two-Factor Authentication" management controls
**Actual:** Settings page only contains "Profile" and "Preferences" sections. Direct navigation to `/dashboard/settings/security` returns 404 error.

---

## 📚 Story 8.20: Manuscript Service Sync

| Test Case | Steps Performed | Expected Result | Actual Result | Status |
|-----------|-----------------|-----------------|---------------|--------|
| Editor Editable (No Active Request) | Opened manuscript, typed "Test typing" | Text should be added | Text was added successfully, word count increased from 20→22 | **PASS** |
| Locking Mechanism - Banner | Created service request (Cover Design already active) | Banner appears: "Editing locked while [Service] request is active" | Banner "Editing Locked - Pending" with message "Cover Design request is active" displayed | **PASS** |
| Locking Mechanism - Read Only | Attempted to type "TESTING LOCKED" in editor | Editor should be read-only, no text added | Text was NOT added, editor confirmed read-only | **PASS** |
| Cancellation Flow - Modal | Clicked "Cancel Request" on banner | Confirmation modal should appear | Modal appeared with "Cancel Service Request?" confirmation, warning about unlocking | **PASS** |
| Cancellation Flow - Unlock | Confirmed cancellation | Banner vanishes, editor becomes editable immediately | Banner disappeared, typed "UNLOCKED NOW!" successfully, word count increased to 24 | **PASS** |
| Duplicate Prevention | Clicked "Request Service" on manuscript with active request | Friendly error message (e.g., "Request already active") | Message displayed: "This manuscript already has an active Cover Design request" | **PASS** |

**Story 8.20 Result:** ✅ **ALL TESTS PASSED**

---

## 🚀 Story 8.6: Publishing Flow

| Test Case | Steps Performed | Expected Result | Actual Result | Status |
|-----------|-----------------|-----------------|---------------|--------|
| Access Publishing Popup | Clicked "Publishing" button in toolbar | Publishing REQUEST popup opens with "Send Request" button | A "Publishing Details" **metadata editing form** opened with "Save Changes" button (not a service request form) | **FAIL** |
| Empty Form Validation | Attempt to submit empty form | "Send Request" button should be Disabled | Form has "Save Changes" button which is enabled regardless of field state | **FAIL** |
| Data Entry - BISAC Category | Select a category | Category selection available | BISAC Categories dropdown present with multiple options | **PASS** |
| Data Entry - Keywords | Add at least one keyword | Keyword entry available | SEO Keywords field present with "Type tag and press Enter..." placeholder | **PASS** |
| Data Entry - Acknowledgement | Add acknowledgement text | Acknowledgement field available | Acknowledgements field present | **PASS** |
| Submission & Service Lock | Click Submit | Modal closes, editor shows "Service Locked" banner | Cannot test - form is metadata editor, not service request submission | **BLOCKED** |
| Metadata Persistence | Refresh page, check Metadata panel | Acknowledgement text should be saved | Cannot verify complete flow - form is for editing, not requesting | **PARTIAL** |

### Defect #2 (Major)

**Title:** "Publishing" button opens metadata editor instead of Publishing Request popup
**Severity:** Major
**Steps to Reproduce:**
1. Open any manuscript in the Editor
2. Click "Publishing" button in toolbar

**Expected:** A dedicated "Publishing Request" popup with "Send Request" button that creates a service lock
**Actual:** Opens "Publishing Details" form for editing metadata (ISBN, categories, keywords, acknowledgements) with "Save Changes" button

**Note:** The test specification describes a service REQUEST workflow (similar to other services), but the current implementation is a metadata editing form. The Publishing service request may need to be accessed via Services page ("Publishing Assistance").

---

## 🛒 Story 8.10: Marketplace & Subscriptions

| Test Case | Steps Performed | Expected Result | Actual Result | Status |
|-----------|-----------------|-----------------|---------------|--------|
| Subscription Banner Visibility | Navigated to Marketplace | Subscription Header visible | **No subscription banner present** | **FAIL** |
| Subscription CTA | Click "Upgrade" CTA | Leads somewhere meaningful (Settings or "Coming Soon") | No CTA to test - banner missing | **BLOCKED** |
| Service Grid - ISBN | Check service cards | ISBN card exists | ✓ "ISBN Registration" card present with "Buy ISBN" button | **PASS** |
| Service Grid - Author Website | Check service cards | Author Website card exists | ✓ "Author Website" card present | **PASS** |
| Service Grid - Marketing | Check service cards | Marketing card exists | ✓ "Marketing Package" card present | **PASS** |
| Service Grid - Publishing | Check service cards | Publishing card exists | ✓ "Publishing Assistance" card present | **PASS** |
| Author Website - Modal | Click "Request Service" | Generic service request modal opens | **Nothing happens** - button appears non-functional | **FAIL** |
| Publishing - Navigation | Click "Request Service" on Publishing card | Directs to Manuscript Editor | **Nothing happens** - button appears non-functional | **FAIL** |

### Defect #3 (Major)

**Title:** Subscription Banner missing from Marketplace
**Severity:** Major
**Steps to Reproduce:**
1. Navigate to Marketplace via sidebar

**Expected:** A Subscription Header/Banner at the top with an "Upgrade" CTA
**Actual:** Page shows "Service Marketplace" title but no subscription banner or upgrade option

### Defect #4 (Critical)

**Title:** Marketplace "Request Service" buttons are non-functional
**Severity:** Critical
**Steps to Reproduce:**
1. Navigate to Marketplace
2. Click "Request Service" on any service card (Author Website, Marketing Package, Publishing Assistance, etc.)

**Expected:** A service request modal should open OR user should be directed to manuscript editor
**Actual:** Nothing happens when clicking the buttons. No modal, no navigation, no error message.

---

## Summary

| Story | Pass | Fail | Blocked | Total |
|-------|------|------|---------|-------|
| 8.5 (2FA) | 1 | 1 | 5 | 7 |
| 8.20 (Manuscript Sync) | 6 | 0 | 0 | 6 |
| 8.6 (Publishing) | 3 | 2 | 2 | 7 |
| 8.10 (Marketplace) | 4 | 3 | 1 | 8 |
| **TOTAL** | **14** | **6** | **8** | **28** |

---

## Critical Defects Summary

| ID | Title | Severity | Story |
|----|-------|----------|-------|
| DEF-001 | Security/2FA section completely missing from Settings | Critical | 8.5 |
| DEF-002 | Publishing button opens metadata form instead of service request popup | Major | 8.6 |
| DEF-003 | Subscription Banner missing from Marketplace | Major | 8.10 |
| DEF-004 | All "Request Service" buttons in Marketplace are non-functional | Critical | 8.10 |

---

## Recommendations

1. **Priority 1:** Implement Security Tab in Settings with full 2FA management functionality
2. **Priority 2:** Fix Marketplace "Request Service" buttons - either open modals or prompt user to select a manuscript first
3. **Priority 3:** Add Subscription Banner to Marketplace with working CTA
4. **Priority 4:** Clarify Publishing workflow - current toolbar button is for metadata, service request is separate

---

## Test Evidence

- **Test User:** Ry.Balungeli (User) / ry.balungeli@gmail.com
- **Browser:** Chrome (via automation)
- **Test Data:** Manuscript "Test & Document #123 (2026)" used for service sync testing
- **Active Service:** Cover Design request (submitted Jan 29, 2026)
