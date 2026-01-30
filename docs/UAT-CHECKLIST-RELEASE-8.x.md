# 🧪 Bearing App - Release 8.x UAT Checklist

**Goal:** Verify recent enhancements around Security (2FA), Manuscript-Service Logic, and Marketplace.
**Audience:** Internal QA & Beta Testers
**Version:** 8.x (Candidate)

---

## 🔒 Security: Two-Factor Authentication (Story 8.5)
*Goal: Ensure 2FA management is correctly located in Settings and no longer on the Dashboard.*

- [ ] **Navigation Check**
    - [ ] Go to the **Dashboard**. Confirm the "Enable 2FA" card is **removed**.
    - [ ] Navigate to **Settings** (Sidebar) -> **Security Tab**.
    - [ ] Confirm "Two-Factor Authentication" section is visible here.
- [ ] **Setup Flow**
    - [ ] Click "Enable 2FA".
    - [ ] Verify QR code appears.
    - [ ] Enter an **incorrect** code first -> System should reject it.
    - [ ] Enter a **correct** code -> System should accept + switch state to "Enabled".
- [ ] **Persistence**
    - [ ] Refresh the page.
    - [ ] Verify 2FA still shows as "Enabled".
- [ ] **Disable Logic**
    - [ ] Click "Disable". Confirm status updates immediately.

---

## 📚 Manuscript Service Sync (Story 8.20)
*Goal: Verify manuscripts are locked when a service is active to prevent data conflicts.*

- [ ] **Locking Mechanism**
    - [ ] Open a manuscript that has no active requests.
    - [ ] Create a service request (e.g., Request ISBN or Publishing Help).
    - [ ] Return to the **Manuscript Editor** for that specific book.
    - [ ] **Verify:** You CANNOT type in the editor (Read-Only mode).
    - [ ] **Verify:** A banner appears at the top: *"Editing locked while [Service] request is active"*.
- [ ] **Cancellation Flow**
    - [ ] On the banner, click **"Cancel Request"**.
    - [ ] Confirm the modal dialogue.
    - [ ] **Verify:** After cancellation, the banner vanishes and you can type again immediately.
- [ ] **Duplicate Prevention**
    - [ ] (Advanced) Try to request a service for a manuscript that *already* has one pending.
    - [ ] **Verify:** You get a friendly error message (e.g., "Request already active") rather than a raw system crash code.

---

## 🚀 Publishing Flow (Story 8.6)
*Goal: Verify the new dedicated publishing request popup.*

- [ ] **Access & Validation**
    - [ ] Inside the Manuscript Editor, click the **"Publishing"** button (toolbar).
    - [ ] Attempt to submit the form immediately (Empty).
    - [ ] **Verify:** The "Send Request" button is **Disabled**.
- [ ] **Data Entry**
    - [ ] Select a **Category** (BISAC).
    - [ ] Add at least one **Keyword**.
    - [ ] (Optional) Add an **Acknowledgement**.
- [ ] **Submission & Save**
    - [ ] Click Submit.
    - [ ] **Verify:** Modal closes.
    - [ ] **Verify:** Editor refreshes and shows the "Service Locked" banner (confirming Story 8.20 integration).
    - [ ] (Optional) Refresh page -> Check "Metadata" panel to see if your acknowledgement text was saved.

---

## 🛒 Marketplace & Subscriptions (Story 8.10)
*Goal: Validate the redesigned Marketplace hub.*

- [ ] **Subscription Banner**
    - [ ] Go to **Marketplace**.
    - [ ] **Verify:** You see the Subscription Header.
    - [ ] **Verify:** The CTA (e.g., "Upgrade") is clickable and leads somewhere meaningful (even if just "Coming Soon" or Settings).
- [ ] **Service Grid**
    - [ ] Confirm cards exist for: **ISBN**, **Author Website**, **Marketing**, **Publishing**.
    - [ ] Click **"Author Website"** -> Verify a generic service request modal opens (User can enter details).
    - [ ] Click **"Publishing"** -> Verify it directs you towards the Manuscript Editor (since publishing requires a specific book context).

---

## 🧘 Fullscreen Editor (Story 8.9)
*Goal: Test the new distraction-free writing mode.*

- [ ] **Entry & Exit**
    - [ ] In Editor: Press keyboard shortcut `Cmd + \` (Mac) or `Ctrl + \` (Windows).
    - [ ] **Verify:** Sidebar, Header, and Footer disappear. Focus stays on text.
    - [ ] Press `Esc` -> **Verify:** Returns to normal interface.
- [ ] **Tools & Theme**
    - [ ] In Fullscreen: Hover mouse at **top-right** to reveal floating controls.
    - [ ] Toggle **Dark Mode**.
    - [ ] **Verify:** Text and background invert correctly; content remains readable.
    - [ ] Refresh page -> **Verify:** Dark mode choice is remembered.
- [ ] **Layering Test**
    - [ ] While in Fullscreen, trigger an **Export** or **Backups** modal (if accessible via shortcuts or menu).
    - [ ] **Verify:** The modal appears *on top* of the fullscreen editor, not behind it.

---

**Tester Notes:**
*   Please report any crashes immediately.
*   "Cosmetic" issues (spacing, colors) are lower priority than functional blocks.
