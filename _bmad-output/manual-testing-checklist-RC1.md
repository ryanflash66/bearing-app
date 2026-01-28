# Manual Testing Checklist: Release Candidate verification

**Target Stories:** 5.8, 8.1, 8.2, 8.3
**Environment:** Staging / Production Helper (Localhost dev)
**Tools Required:** Chrome DevTools, Network Throttling

---

## 📱 Story 5.8: Mobile Responsive Layout
**Goal:** Verify the application is usable and responsive on mobile viewports.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Open Dashboard in Mobile View | 1. Open DevTools (F12) -> Toggle Device Toolbar (Ctrl+Shift+M).<br>2. Select "iPhone SE" or "iPhone 12".<br>3. Navigate to `/dashboard`. | Sidebar collapses into a hamburger menu (top left/right). Content (Grid) stacks in single column. | [ ] |
| 2 | Verify Sidebar Navigation | Click the Hamburger menu icon. | Sidebar slides in from left. Backdrop appears. Links work. Clicking outside closes it. | [ ] |
| 3 | Check Manuscript Grid | View `/dashboard/manuscripts`. | Manuscript cards are full width (1 column). Text is readable. | [ ] |
| 4 | **Verify Binder** (Critial) | Open a Manuscript (Editor). <br>Click "Open Binder" floating action button (FAB) usually at bottom-left or bottom-right. | Binder Sheet slides up/in from bottom/side. "Binder" title visible. Chapters list clickable. | [ ] |
| 5 | Verify Editor Toolbar | Look at the formatting toolbar above the text area. | Toolbar scrolls horizontally if icons overflow. Icons are touch-target friendly sized. | [ ] |
| 6 | Check Modals (Export) | Click "Export" in Editor. | Export modal fits within the screen width. No horizontal scroll on the modal overlay. Buttons visible. | [ ] |

---

## 💾 Story 8.2: Autosave Retry & Recovery
**Goal:** Verify data resilience during network instability.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Prepare Network Throttling | Open Editor. Open DevTools -> Network tab. | - | [ ] |
| 2 | Simulate Offline Save | 1. Type "Testing autosave offline".<br>2. Immediately switch Network to **"Offline"**. | UI should show "Saving..." then change to "Unsaved changes" or "Save failed" warning. **Should NOT crash or loop infinitely.** | [ ] |
| 3 | Recover Connection | Switch Network back to **"No throttling"**. | Autosave should retry automatically (exponential backoff) and eventually show "Saved". | [ ] |
| 4 | Manual Save Fallback | 1. Make a change.<br>2. Click any "Save Now" button if visible (or Ctrl+S). | Content saves immediately. Last saved timestamp updates. | [ ] |

---

## 📤 Story 8.1: Export Download Fix
**Goal:** Verify large manuscript exports do not timeout.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Create Large Manuscript | 1. Create new manuscript.<br>2. Paste ~10-20k words of text (Lorem Ipsum matches actual load). | Manuscript saves successfully. | [ ] |
| 2 | Export to PDF | Click Export -> Select "PDF" -> "Export". | 1. Loading spinner validates "Preparing...".<br>2. Download starts within 5-10 seconds.<br>3. File is valid PDF (open it). | [ ] |
| 3 | Export to DOCX | Click Export -> Select "DOCX" -> "Export". | Download starts. File opens in Word/Docs correctly (rich text preserved). | [ ] |

---

## 🧘 Story 8.3: Remove Broken Zen Mode
**Goal:** Verify the broken Zen Mode feature is completely removed.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Check Editor UI | Open Manuscript Editor. Look for "Zen Mode" toggle (usually top right or toolbar). | **Toggle should be GONE.** No broken icon/button present. | [ ] |
| 2 | Check Console | Open DevTools Console. reload editor. | No errors related to `useZenMode` or missing CSS classes. | [ ] |
