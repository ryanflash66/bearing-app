# Manual Testing Checklist: Epic 8 + Story 5.8

**Generated:** 2026-01-27  
**Scope:** Epic 8 (Stories 8.1–8.4 P0 Critical Bugs) + Story 5.8 (Mobile Responsive Layout)  
**Purpose:** Manual QA verification before release

---

## Pre-Testing Setup

### Environment
- **Testing on:** Vercel Production/Preview Build
- **URL:** _________________________________ (fill in deployment URL)

### Requirements
- [ ] Vercel deployment is accessible
- [ ] Test account with regular user role
- [ ] Test account with admin/super_admin role
- [ ] Access to multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device OR browser DevTools mobile emulation (375px width recommended)
- [ ] Test manuscript with content for export testing

### Test Data Setup
- [ ] Create at least one manuscript with content (for export/autosave tests)
- [ ] Have admin credentials ready
- [ ] Know how to toggle maintenance mode (Super Admin → Settings → Maintenance Toggle)

### Vercel-Specific Notes
- Network throttling tests (8.2) require browser DevTools offline mode
- If testing on preview deployment, some features may differ from production
- Check Vercel deployment logs if unexpected errors occur

---

## Story 5.8: Mobile Responsive Layout

### 5.8-T01: Dashboard Responsiveness

#### 5.8-T01a: Manuscript Grid (Mobile)
- [ ] Open Dashboard on mobile viewport (<768px)
- [ ] **Expected:** Manuscript grid shows 1 column layout
- [ ] Cards are full-width with proper spacing
- [ ] No horizontal scrolling needed for cards

#### 5.8-T01b: Manuscript Grid (Tablet)
- [ ] Open Dashboard on tablet viewport (768px–1024px)
- [ ] **Expected:** Manuscript grid shows 2 column layout
- [ ] Cards have consistent sizing

#### 5.8-T01c: Manuscript Grid (Desktop)
- [ ] Open Dashboard on desktop viewport (>1024px)
- [ ] **Expected:** Manuscript grid shows 3 column layout

#### 5.8-T01d: Sidebar Navigation (Mobile)
- [ ] Open Dashboard on mobile viewport
- [ ] Tap hamburger menu icon
- [ ] **Expected:** Sidebar navigation opens as overlay/sheet
- [ ] All navigation items are accessible
- [ ] Tap outside or close button dismisses sidebar

### 5.8-T02: Editor Responsiveness

#### 5.8-T02a: Binder Toggle (Mobile)
- [ ] Open manuscript editor on mobile viewport
- [ ] **Expected:** Binder sidebar is hidden by default
- [ ] Tap Binder FAB button (bottom-left or similar)
- [ ] **Expected:** Binder opens as Sheet overlay from left
- [ ] Chapter list is visible and scrollable
- [ ] Close Binder (tap outside or close button)
- [ ] **Expected:** Binder dismisses cleanly

#### 5.8-T02b: Toolbar Scrolling (Mobile)
- [ ] Open manuscript editor on mobile viewport
- [ ] **Expected:** Toolbar scrolls horizontally
- [ ] All toolbar buttons are accessible via scroll
- [ ] No toolbar items cut off or hidden permanently

#### 5.8-T02c: Editor Padding (Mobile)
- [ ] Open manuscript editor on mobile viewport
- [ ] **Expected:** Text container has appropriate padding (not excessive whitespace)
- [ ] Text is readable without side margins eating space
- [ ] Content area fills available width properly

### 5.8-T03: Modal Responsiveness

#### 5.8-T03a: Export Modal (Mobile)
- [ ] Open Export modal on mobile viewport
- [ ] **Expected:** Modal fits within viewport
- [ ] All buttons are visible (no off-screen)
- [ ] Form controls are stacked vertically if needed
- [ ] Can scroll within modal if content overflows
- [ ] Close button/action is accessible

#### 5.8-T03b: Publishing Settings Modal (Mobile)
- [ ] Open Publishing Settings modal on mobile viewport
- [ ] **Expected:** Modal is properly sized for mobile
- [ ] All form fields accessible
- [ ] Submit/Cancel buttons visible

#### 5.8-T03c: Beta Share Modal (Mobile)
- [ ] Open Beta Share modal on mobile viewport
- [ ] **Expected:** Modal fits viewport
- [ ] Copy and Revoke buttons accessible
- [ ] Share link is readable/copyable

### 5.8-T04: Touch Accessibility

#### 5.8-T04a: Touch Targets
- [ ] On mobile device, verify tap targets are large enough (≥44px)
- [ ] Test: Hamburger menu button
- [ ] Test: Binder FAB button
- [ ] Test: Toolbar buttons
- [ ] Test: Modal buttons (Copy, Revoke, Export, etc.)
- [ ] Test: Chapter buttons in Binder
- [ ] **Expected:** No difficulty tapping any interactive element

---

## Story 8.1: Export Download Fix

### 8.1-T01: PDF Export Download

#### 8.1-T01a: PDF Export Success
- [ ] Open manuscript with content
- [ ] Click Export button → select PDF format
- [ ] Configure formatting options (font size, line height)
- [ ] Click Export/Download button
- [ ] **Expected:** PDF file downloads successfully
- [ ] **Expected:** Filename includes manuscript title
- [ ] **Expected:** No "Failed to download the file" error
- [ ] Open downloaded PDF in viewer
- [ ] **Expected:** Content is correct and formatted

#### 8.1-T01b: PDF with Special Characters in Title
- [ ] Create/use manuscript with special characters in title (spaces, quotes, unicode: "Test's Manuscript – Draft №1")
- [ ] Export to PDF
- [ ] **Expected:** Download succeeds with properly encoded filename
- [ ] Filename handles special characters gracefully

### 8.1-T02: DOCX Export Download

#### 8.1-T02a: DOCX Export Success
- [ ] Open manuscript with content
- [ ] Click Export button → select DOCX format
- [ ] Configure formatting options
- [ ] Click Export/Download button
- [ ] **Expected:** DOCX file downloads successfully
- [ ] **Expected:** Filename includes manuscript title
- [ ] **Expected:** No "Failed to download the file" error
- [ ] Open downloaded DOCX in Word or compatible app
- [ ] **Expected:** Content is correct and formatted

#### 8.1-T02b: DOCX with Special Characters in Title
- [ ] Use manuscript with special characters in title
- [ ] Export to DOCX
- [ ] **Expected:** Download succeeds with properly encoded filename

### 8.1-T03: Export Error Handling

#### 8.1-T03a: Clear Error Messages
- [ ] Open DevTools → Network tab → check "Offline"
- [ ] Attempt export (PDF or DOCX)
- [ ] **Expected:** User-friendly error message appears (not generic "Failed to download")
- [ ] **Expected:** Error message provides actionable guidance (e.g., "Network error. Check your connection...")
- [ ] **Expected:** Error can be dismissed
- [ ] Uncheck "Offline" in DevTools when done

#### 8.1-T03b: Export State Recovery
- [ ] After an export error, restore network
- [ ] Attempt export again
- [ ] **Expected:** Export succeeds on retry
- [ ] **Expected:** UI state resets properly (not stuck in "exporting" state)

### 8.1-T04: Cross-Browser Export Testing

#### 8.1-T04a: Chrome Export
- [ ] PDF export works in Chrome
- [ ] DOCX export works in Chrome

#### 8.1-T04b: Firefox Export
- [ ] PDF export works in Firefox
- [ ] DOCX export works in Firefox

#### 8.1-T04c: Safari Export
- [ ] PDF export works in Safari
- [ ] DOCX export works in Safari
- [ ] (Note any Safari-specific behavior)

#### 8.1-T04d: Edge Export
- [ ] PDF export works in Edge
- [ ] DOCX export works in Edge

---

## Story 8.2: Autosave Retry & Recovery

### 8.2-T01: Normal Autosave Operation

#### 8.2-T01a: Autosave Indicator
- [ ] Open manuscript editor
- [ ] Type some content
- [ ] Wait for autosave (default 5 seconds after typing stops)
- [ ] **Expected:** Status indicator shows "Saving..." then "Saved"
- [ ] **Expected:** No errors in console

### 8.2-T02: Autosave Failure & Retry

#### 8.2-T02a: Exponential Backoff Display
- [ ] Open browser DevTools → Network tab → check "Offline" (or throttle to "Offline")
- [ ] Type content to trigger autosave
- [ ] **Expected:** Status shows "Retrying in Xs..." with countdown
- [ ] **Expected:** Retry delays increase (approximately 2s, 4s, 8s, 16s pattern)
- [ ] **Expected:** Status uses amber/yellow color for retrying state
- [ ] **Note:** On Vercel, use DevTools offline mode to simulate network failure

#### 8.2-T02b: Manual Save Button
- [ ] Let retries exceed max count (wait for multiple failures)
- [ ] **Expected:** "Save Now" or "Retry" button appears
- [ ] **Expected:** Status shows "Save failed" with red styling
- [ ] **Expected:** Button is visible and clickable

#### 8.2-T02c: Manual Save Works
- [ ] Uncheck "Offline" in DevTools to restore network
- [ ] Click "Save Now" button
- [ ] **Expected:** Save attempt occurs immediately
- [ ] **Expected:** On success, error state clears
- [ ] **Expected:** Status returns to "Saved"
- [ ] **Expected:** Autosave resumes normal operation

### 8.2-T03: Error State Distinction

#### 8.2-T03a: Retrying State (Automatic)
- [ ] During automatic retry (network down, before max retries)
- [ ] **Expected:** Shows "Retrying in Xs..." or "Retrying... (attempt N)"
- [ ] **Expected:** Amber/yellow styling

#### 8.2-T03b: Failed State (Manual Action Needed)
- [ ] After max retries exceeded
- [ ] **Expected:** Shows "Save failed" with "Save Now" button
- [ ] **Expected:** Red styling

### 8.2-T04: Data Preservation

#### 8.2-T04a: Changes Preserved During Failure
- [ ] With DevTools offline mode enabled, add more content while autosave is failing
- [ ] **Expected:** Content remains in editor (not lost)
- [ ] Uncheck "Offline" in DevTools to restore network
- [ ] Wait for save or click "Save Now"
- [ ] **Expected:** All content (including additions during failure) is saved

#### 8.2-T04b: Beforeunload Warning
- [ ] While in failed state with pending changes
- [ ] Attempt to navigate away or close tab
- [ ] **Expected:** Browser warns about unsaved changes
- [ ] Cancel navigation
- [ ] **Expected:** Can continue editing

---

## Story 8.3: Remove Broken Zen Mode

### 8.3-T01: Zen Mode Removed

#### 8.3-T01a: No Zen Toggle Button
- [ ] Open manuscript editor
- [ ] Scan toolbar for Zen mode toggle
- [ ] **Expected:** No Zen mode button/toggle exists
- [ ] **Expected:** No "Zen" option in any menu

#### 8.3-T01b: Keyboard Shortcut Disabled
- [ ] In manuscript editor, press Cmd+\ (Mac) or Ctrl+\ (Windows)
- [ ] **Expected:** Nothing happens (shortcut is disabled/removed)
- [ ] **Expected:** Editor does not enter any special mode

### 8.3-T02: Editor Fully Functional

#### 8.3-T02a: Basic Editing
- [ ] Create new manuscript
- [ ] Type content
- [ ] **Expected:** Editor is focusable and editable
- [ ] **Expected:** Cursor visible, typing works normally

#### 8.3-T02b: Autosave Works
- [ ] Type content and wait for autosave
- [ ] **Expected:** "Saved" indicator appears
- [ ] **Expected:** No "Error saving" loops

#### 8.3-T02c: All Toolbar Features Work
- [ ] Click Export button → modal opens → can close
- [ ] Click Publishing button → modal opens → can close
- [ ] Click Share/Beta button → modal opens → can close
- [ ] Click Version History → modal opens → can close
- [ ] Click Check Consistency → consistency check runs
- [ ] **Expected:** All features work without errors

### 8.3-T03: No Regressions

#### 8.3-T03a: Mobile Editor
- [ ] Open editor on mobile viewport
- [ ] **Expected:** Editor is fully usable
- [ ] Binder toggle works
- [ ] Toolbar accessible

#### 8.3-T03b: No Console Errors
- [ ] Open browser DevTools console
- [ ] Use editor (type, save, use features)
- [ ] **Expected:** No errors related to "zen", "zenMode", or undefined references

---

## Story 8.4: Admin Login / Maintenance Gating

### 8.4-T01: Admin Access (Maintenance OFF)

#### 8.4-T01a: Admin Login → Dashboard
- [ ] Ensure maintenance mode is OFF
- [ ] Log in with admin/super_admin credentials
- [ ] **Expected:** Redirected to admin dashboard (e.g., `/dashboard/admin/super`)
- [ ] **Expected:** No "System is under maintenance" message
- [ ] **Expected:** Dashboard loads fully with all admin features

#### 8.4-T01b: Admin Navigation
- [ ] While logged in as admin, navigate between admin pages
- [ ] Users list, Orders, Settings, etc.
- [ ] **Expected:** All admin pages load without maintenance blocking

### 8.4-T02: Admin Access (Maintenance ON)

#### 8.4-T02a: Enable Maintenance Mode
- [ ] As super admin, go to Settings → toggle Maintenance Mode ON
- [ ] **Expected:** Maintenance mode activates

#### 8.4-T02b: Admin Bypass
- [ ] Log out and log back in as admin/super_admin
- [ ] **Expected:** Admin can still access admin dashboard
- [ ] **Expected:** No 503 error or "System is under maintenance" blocking access
- [ ] **Note:** Informational banner about maintenance is OK; full blocking is not

#### 8.4-T02c: Admin Operations During Maintenance
- [ ] While maintenance is ON as admin
- [ ] Perform admin operations (view users, update status, etc.)
- [ ] **Expected:** Admin write operations succeed
- [ ] **Expected:** No 503 errors on admin actions

#### 8.4-T02d: Regular User Blocked During Maintenance
- [ ] While maintenance is ON
- [ ] Log in as regular (non-admin) user
- [ ] Attempt to perform write operations
- [ ] **Expected:** Regular users see maintenance message or are blocked from writes
- [ ] **Expected:** Admin bypass does NOT apply to regular users

### 8.4-T03: Post-Login Redirect

#### 8.4-T03a: Super Admin Redirect
- [ ] Log in as super_admin without returnUrl
- [ ] **Expected:** Redirected to `/dashboard/admin/super` (or configured landing)
- [ ] **Expected:** NOT redirected to generic dashboard

#### 8.4-T03b: Return URL Preserved
- [ ] Access `/dashboard/admin/users?foo=bar` while logged out
- [ ] Log in
- [ ] **Expected:** Redirected back to `/dashboard/admin/users?foo=bar`

### 8.4-T04: Maintenance Toggle

#### 8.4-T04a: Toggle Works
- [ ] As super admin, navigate to maintenance settings
- [ ] Toggle maintenance ON
- [ ] **Expected:** Maintenance activates (verify with regular user or check status)
- [ ] Toggle maintenance OFF
- [ ] **Expected:** Maintenance deactivates

---

## Cross-Story Integration Tests

### INT-01: Export + Mobile
- [ ] On mobile viewport, open Export modal
- [ ] Complete PDF export
- [ ] **Expected:** Download works on mobile

### INT-02: Autosave + Mobile
- [ ] On mobile viewport, edit manuscript
- [ ] **Expected:** Autosave indicator visible
- [ ] **Expected:** Autosave works normally

### INT-03: Admin + Mobile
- [ ] On mobile viewport, access admin dashboard
- [ ] **Expected:** Admin UI is responsive
- [ ] **Expected:** Admin functions work on mobile

### INT-04: Full Editor Workflow
- [ ] Create new manuscript
- [ ] Add content (verify autosave)
- [ ] Export to PDF (verify download)
- [ ] Export to DOCX (verify download)
- [ ] Use all toolbar features
- [ ] **Expected:** Complete workflow works end-to-end

---

## Test Results Summary

### Story 5.8: Mobile Responsive Layout
| Test ID | Status | Notes |
|---------|--------|-------|
| 5.8-T01a | ⬜ | |
| 5.8-T01b | ⬜ | |
| 5.8-T01c | ⬜ | |
| 5.8-T01d | ⬜ | |
| 5.8-T02a | ⬜ | |
| 5.8-T02b | ⬜ | |
| 5.8-T02c | ⬜ | |
| 5.8-T03a | ⬜ | |
| 5.8-T03b | ⬜ | |
| 5.8-T03c | ⬜ | |
| 5.8-T04a | ⬜ | |

### Story 8.1: Export Download Fix
| Test ID | Status | Notes |
|---------|--------|-------|
| 8.1-T01a | ⬜ | |
| 8.1-T01b | ⬜ | |
| 8.1-T02a | ⬜ | |
| 8.1-T02b | ⬜ | |
| 8.1-T03a | ⬜ | |
| 8.1-T03b | ⬜ | |
| 8.1-T04a | ⬜ | |
| 8.1-T04b | ⬜ | |
| 8.1-T04c | ⬜ | |
| 8.1-T04d | ⬜ | |

### Story 8.2: Autosave Retry & Recovery
| Test ID | Status | Notes |
|---------|--------|-------|
| 8.2-T01a | ⬜ | |
| 8.2-T02a | ⬜ | |
| 8.2-T02b | ⬜ | |
| 8.2-T02c | ⬜ | |
| 8.2-T03a | ⬜ | |
| 8.2-T03b | ⬜ | |
| 8.2-T04a | ⬜ | |
| 8.2-T04b | ⬜ | |

### Story 8.3: Remove Broken Zen Mode
| Test ID | Status | Notes |
|---------|--------|-------|
| 8.3-T01a | ⬜ | |
| 8.3-T01b | ⬜ | |
| 8.3-T02a | ⬜ | |
| 8.3-T02b | ⬜ | |
| 8.3-T02c | ⬜ | |
| 8.3-T03a | ⬜ | |
| 8.3-T03b | ⬜ | |

### Story 8.4: Admin Login / Maintenance Gating
| Test ID | Status | Notes |
|---------|--------|-------|
| 8.4-T01a | ⬜ | |
| 8.4-T01b | ⬜ | |
| 8.4-T02a | ⬜ | |
| 8.4-T02b | ⬜ | |
| 8.4-T02c | ⬜ | |
| 8.4-T02d | ⬜ | |
| 8.4-T03a | ⬜ | |
| 8.4-T03b | ⬜ | |
| 8.4-T04a | ⬜ | |

### Integration Tests
| Test ID | Status | Notes |
|---------|--------|-------|
| INT-01 | ⬜ | |
| INT-02 | ⬜ | |
| INT-03 | ⬜ | |
| INT-04 | ⬜ | |

---

## Status Legend

- ⬜ Not tested
- ✅ Pass
- ❌ Fail
- ⚠️ Partial / Issue found
- ⏭️ Skipped (with reason)

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| QA Lead | | | |
| Product Owner | | | |

---

## Issues Found

<!-- Document any issues discovered during testing -->

### Issue Template
```
**Issue ID:** [AUTO-001]
**Test ID:** [8.1-T01a]
**Severity:** [Critical/High/Medium/Low]
**Summary:** [Brief description]
**Steps to Reproduce:**
1. ...
2. ...
**Expected:** ...
**Actual:** ...
**Screenshots/Logs:** [Attach if applicable]
**Status:** [Open/In Progress/Resolved]
```

---

**Document Version:** 1.1  
**Last Updated:** 2026-01-27  
**Test Environment:** Vercel Deployment
