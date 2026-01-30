# Manual Testing Checklist - Story 8.20: Sync & State (Manuscript ↔ Service)

**Tester:** ____________________
**Date:** ____________________
**Environment:** [ ] Staging [ ] Dev [ ] Local

**Update (Hotfix):** Use the new **"Services"** link in the manuscript header, NOT the global Marketplace.

---

## 📋 Prerequisites
1.  Login as a **Standard User** (Author).
2.  Have at least one existing **Manuscript** (or create one).

---

## 🧪 Test Scenarios

### Scenario 1: Create Request & Verify Locking (AC 1, 2, 3, 5, 7)
*Target: Verify that creating a service request locks the manuscript and updates the UI.*

1.  **Navigate** to the **Manuscript Editor** for a clean manuscript.
2.  **Verify** the editor is **Editable** (you can type, change title).
3.  **Action:** Click the **"Services"** link in the top navigation bar (next to "Back" and "Marketing").
4.  **Action:** On the Services page, click **"Request Service"** on the **"Professional Book Cover Design"** card.
    *   [ ] **Check:** Success alert appears.
    *   [ ] **Check:** Page automatically reloads or redirects? (If not, manually navigate back to Editor).
5.  **Action:** Return to the **Manuscript Editor** (click "Back to Editor").
    *   [ ] **Check:** Is there a **colored banner** at the top showing "Cover Design" and status "Pending"?
    *   [ ] **Check:** Is there a **Lock Icon** or visual indicator that editing is disabled?
    *   [ ] **Action:** Try to type in the main text area. **Verify** it is **Read-Only**.
    *   [ ] **Action:** Try to change the Title. **Verify** it is **Disabled**.
6.  **Action:** Return to the **Manuscript List**.
    *   [ ] **Check:** Does the manuscript card have a **"Service Pending"** badge?

### Scenario 2: Cancel Request & Verify Unlocking (AC 4, 6)
*Target: Verify that cancelling a pending request immediately restores edit access.*

1.  **Navigate** to the **Manuscript Editor** (which is currently locked).
2.  **Action:** On the Service Status Banner, click **"Cancel Request"**.
3.  **Action:** Confirm the cancellation in the modal.
4.  **Check:**
    *   [ ] Does the banner disappear (or update to "Cancelled")?
    *   [ ] Does the **Lock Icon** disappear?
    *   [ ] **Action:** Try to type in the editor. **Verify** it is **Editable** again.

### Scenario 3: Duplicate Prevention (AC 5)
1.  **Setup:** Create a new "Cover Design" request (Status: Pending) so the manuscript is locked.
2.  **Action:** Go back to the **Services** page (`/dashboard/manuscripts/<id>/services`).
3.  **Action:** Try to click **"Request Service"** again on "Cover Design".
    *   [ ] **Check:** Does it fail with an error? (e.g., "Manuscript already has an active request").

### Scenario 4: Admin Status Updates (AC 6)
*Target: Verify that status changes made by Admin reflect on the Author's view.*
*(Requires Admin access or simulating DB changes)*

1.  **Setup:** As Author, create a new Service Request (Status: Pending).
2.  **Action (Admin/DB):** Update this request's status to **`in_progress`**.
3.  **Action (Author):** Refresh the Manuscript Editor.
    *   [ ] **Check:** Banner status says **"In Progress"**.
    *   [ ] **Check:** "Cancel Request" button is **NOT** visible.
    *   [ ] **Check:** Editor remains **Locked**.
4.  **Action (Admin/DB):** Update status to **`completed`**.
5.  **Action (Author):** Refresh the Manuscript Editor.
    *   [ ] **Check:** Editor is **Unlocked** (Editable).

---

## 📝 Notes / Bugs Found
*   __________________________________________________________________________
*   __________________________________________________________________________
*   __________________________________________________________________________

**Overall Result:** [ ] PASS [ ] FAIL