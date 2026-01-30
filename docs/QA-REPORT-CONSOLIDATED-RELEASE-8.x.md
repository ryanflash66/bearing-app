# 🧪 Manual Testing Report - Bearing App (Release 8.x)

**Date:** January 30, 2026
**Status:** ❌ **NOT READY FOR RELEASE**
**Environment:** Production/Preview (bearing-app.vercel.app)
**Testers:** QA Automation (Tester 1), User Ry.Balungeli (Tester 2)

---

## 📊 Executive Summary

Both testers have independently confirmed critical failures in **Story 8.5 (Security)** and **Story 8.10 (Marketplace)/8.6 (Publishing)**. While **Story 8.20 (Manuscript Sync)** and **Story 8.9 (Fullscreen/Zen Removal)** passed validation, the application is missing customer-facing features required for this release.

| Story | Tester 1 Verdict | Tester 2 Verdict | Consolidated Status |
|-------|------------------|------------------|---------------------|
| **8.5 (2FA Relocation)** | ❌ FAIL/BLOCKED | ❌ FAIL | 🔴 **CRITICAL FAIL** |
| **8.20 (Manuscript Sync)** | ✅ PASS | ✅ PASS | 🟢 **PASS** |
| **8.6 (Publishing Flow)** | ❌ FAIL | ❌ FAIL | 🔴 **CRITICAL FAIL** |
| **8.10 (Marketplace)** | ❌ FAIL | ❌ FAIL | 🔴 **CRITICAL FAIL** |
| **8.9 (Fullscreen)** | (Not Checked) | ✅ PASS | 🟢 **PASS** |

---

## 🔴 Critical Defects (Must Fix)

### 1. Security / 2FA Not Relocated (Story 8.5)
*   **Severity:** Critical
*   **Issue:** The "Security" tab does not exist in Settings. The "Enable 2FA" card is still present on the Dashboard (Tester 2) or partially hidden (Tester 1).
*   **Impact:** Users cannot manage security settings as designed. There is no way to **disable** 2FA once enabled (Tester 2).
*   **Evidence:**
    *   *Tester 1:* "No Security Tab exists in Settings."
    *   *Tester 2:* "Dashboard still shows 2FA card... Enabling is inconsistent... No disable button."

### 2. Publishing Button Opens Wrong Modal (Story 8.6)
*   **Severity:** Major
*   **Issue:** The "Publishing" button in the editor opens the old "Metadata Editing" form instead of the new "Publishing Service Request" flow.
*   **Impact:** Authors cannot actually submit a publishing request.
*   **Evidence:**
    *   *Tester 1:* "Opens 'Publishing Details' form for editing metadata... not a service request form."
    *   *Tester 2:* "Opens outdated 'Publishing Details' form... No new dedicated request form or pending banner."

### 3. Marketplace is Missing Core Features (Story 8.10)
*   **Severity:** Critical
*   **Issue:**
    *   Missing Subscription/Upgrade Banner.
    *   Service Request buttons are either dead (Tester 1) or trigger simple browser alerts instead of the proper modal (Tester 2).
    *   Missing dedicated "Publishing" service card (Tester 2).
*   **Impact:** Users cannot upgrade plans or request services properly.
*   **Evidence:**
    *   *Tester 1:* "Buttons are non-functional."
    *   *Tester 2:* "Clicking services triggers a basic browser alert... No subscription banner."

---

## 🟢 Validated Features

### Manuscript Service Sync (Story 8.20)
*   **Verdict:** Solid. Both testers confirmed the locking mechanism, banner display, active badge, and cancellation flow work as expected.
*   **Note:** Duplicate prevention works correctly with a friendly error message.

### Fullscreen / Zen Mode (Story 8.9)
*   **Verdict:** Validated by Tester 2. Old Zen button/shortcut is gone. New fullscreen toggle works (Tester 2 validated 8.9 explicitly, though referenced "Zen mode removal" which is part of the same logic).

---

## ⚠️ Medium/Low Issues

*   **Autosave Persistence (Story 8.3):** Tester 2 noted partial success but couldn't verify offline retry logic. This is acceptable for now given it works on the happy path.
*   **UI Consistency:** Tester 1 noted "Dead buttons" while Tester 2 saw "Browser Alerts". This suggests an unfinished UI implementation for service requests.

---

## 📋 Recommendations for Dev Team

1.  **Immediate Action (Story 8.5):** Implement the `Settings > Security` page. Move the 2FA logic there and **hide** it from the Dashboard. Ensure a "Disable" button exists.
2.  **Immediate Action (Story 8.6):** Swap the "Publishing" button action in `ManuscriptEditor` to open the NEW `PublishingRequestModal` (created in 8.6) instead of the old metadata form.
3.  **Immediate Action (Story 8.10):**
    *   Add the Subscription Banner to `src/app/dashboard/marketplace/page.tsx`.
    *   Wire up the Service Cards to open `ServiceRequestModal` instead of `alert()`.
