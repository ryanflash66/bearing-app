**Manual QA Checklist**
Project: bearing-app
Date: 2026-02-09
Scope: Story 8.19 - Clarify AI tokens display
Audience: Manual QA Team

**Setup**
- [ ] Use an Author account with an active account and billing cycle
- [ ] Ensure test account has some AI usage events (consistency checks and/or suggestions) OR test with zero usage for empty state
- [ ] Use a Super Admin account (`users.role = 'super_admin'`) for admin testing
- [ ] Clear browser cache and test in both light and dark modes
- [ ] Test on desktop (Chrome, Firefox, Safari) and mobile viewports

---

## Story 8.19: Clarify AI tokens display

**AC 8.19.1: Explain AI tokens on Dashboard**

User Dashboard - Help Affordance Display:
- [ ] Navigate to `/dashboard`
- [ ] Locate the "AI Tokens" card
- [ ] Verify a help affordance (info icon or button) is visible adjacent to the "AI Tokens" label
- [ ] Verify the affordance has proper aria-label (e.g., "What are AI tokens?")
- [ ] Tab through the page and confirm the help affordance can be focused via keyboard
- [ ] Use a screen reader (NVDA/JAWS/VoiceOver) and confirm the affordance is announced correctly

User Dashboard - Help Content Display:
- [ ] Hover over the help affordance (desktop) or tap it (mobile)
- [ ] Verify a popover/tooltip appears with explanation content
- [ ] Confirm the explanation includes: "Tokens are units of AI model usage"
- [ ] Confirm the explanation mentions: "Gemini consistency checks" and "Llama suggestions"
- [ ] Confirm the explanation mentions: "Tokens reset each billing cycle"
- [ ] Confirm the explanation mentions: "displayed value is tokens used / monthly cap"
- [ ] Click outside the popover and confirm it dismisses properly
- [ ] Press Escape key with popover open and confirm it closes

**AC 8.19.2: View per-feature usage breakdown**

Details View - Opening and Navigation:
- [ ] On `/dashboard`, locate the "View details" button/link associated with AI Tokens card
- [ ] Click "View details" and confirm a sheet/modal opens
- [ ] Verify the sheet title is "AI Token Usage Details" or similar
- [ ] Verify the sheet has a close button (X icon) that works
- [ ] Press Escape key and confirm the sheet closes
- [ ] Re-open the sheet using keyboard navigation (Tab to trigger, Enter/Space to activate)

Details View - Usage Breakdown (with data):
- [ ] With an account that has AI usage events, open the details view
- [ ] Verify a breakdown section is visible showing per-feature data
- [ ] Confirm "Consistency Checks" feature is listed (if account has consistency check usage)
- [ ] Confirm "AI Suggestions" feature is listed (if account has suggestion usage)
- [ ] For each feature, verify:
  - [ ] Feature name is displayed (human-friendly label)
  - [ ] Token count is shown as exact number with locale separators (e.g., "5,000")
  - [ ] Action count is shown (e.g., "10 actions")
- [ ] Verify the breakdown reflects data from the current billing cycle only

Details View - Empty State:
- [ ] With an account that has NO AI usage events in the current billing cycle, open the details view
- [ ] Verify the empty state message is displayed: "No AI usage yet this cycle."
- [ ] Confirm no feature breakdown is shown when there's no usage

**AC 8.19.3: Clarify units and formatting**

Dashboard Summary Formatting:
- [ ] On `/dashboard`, check the AI Tokens card summary
- [ ] If token count is in thousands, verify it uses abbreviated format (e.g., "5k")
- [ ] Open the help popover and confirm it explicitly states: "k means thousands of tokens"
- [ ] Verify the summary shows format: "used / cap" (e.g., "5k / 10,000k")

Details View Formatting:
- [ ] Open the AI tokens details view
- [ ] Verify the total tokens used is displayed with exact numbers and locale separators (e.g., "8,000")
- [ ] Verify the monthly cap is displayed as "10,000,000" (with locale separators)
- [ ] For each feature in the breakdown, verify token counts use locale separators (no abbreviation)
- [ ] Verify small token counts (< 1,000) display as "< 1k" in the dashboard summary (if applicable)
- [ ] Verify zero usage displays as "0k" in the dashboard summary

Source of Truth Verification:
- [ ] Inspect `src/lib/ai-usage.ts` and confirm `MONTHLY_TOKEN_CAP` constant is used (no duplicate definitions)
- [ ] Verify the dashboard and details views pull the cap from the same constant

**AC 8.19.4: Upgrade / purchase guidance**

Details View - Upgrade CTA:
- [ ] Open the AI tokens details view
- [ ] Verify the section "Need more tokens?" is visible
- [ ] Confirm the copy states: "Additional tokens are available via plan upgrade" (or similar phrasing)
- [ ] Verify there is a link/button labeled "View upgrade options" or similar
- [ ] Click the upgrade link and confirm it navigates to `/dashboard/settings`
- [ ] Verify the link opens in the same tab (not a new window unless explicitly designed that way)
- [ ] Return to dashboard and confirm copy aligns with `src/components/dashboard/UpsellBanner.tsx` messaging

**AC 8.19.5: Admin usage table clarity (Super Admin)**

Admin Table - Help Affordance:
- [ ] Log in as a Super Admin user
- [ ] Navigate to `/dashboard/admin/users` (or the admin user usage table page)
- [ ] Locate the "Tokens (Cycle)" table header
- [ ] Verify a help affordance (same component as user dashboard) is present in the header
- [ ] Click the help affordance and confirm the popover appears
- [ ] Verify the explanation copy is IDENTICAL to the user dashboard help (shared component)
- [ ] Confirm the popover includes all key points: units, features, billing cycle, format explanation

Admin Table - Consistency Check:
- [ ] Confirm the help component source is `src/components/dashboard/AiTokenHelp.tsx` (same as dashboard)
- [ ] Verify there are no duplicate explanations or hardcoded copy in the admin table
- [ ] Test keyboard accessibility and screen reader announcement in admin table header

---

## Cross-Feature Integration Tests

Dashboard Integration:
- [ ] On `/dashboard`, verify the AI Tokens card integrates smoothly with other dashboard cards
- [ ] Confirm the card layout is responsive on mobile, tablet, and desktop
- [ ] Verify clicking "View details" doesn't interfere with other dashboard modals/sheets
- [ ] Open AI tokens details, close it, then open another modal (e.g., Export) and confirm no conflicts

Theme and Accessibility:
- [ ] Toggle dark mode and confirm all AI token UI elements are visible and properly styled
- [ ] Test with browser zoom at 200% and confirm layout doesn't break
- [ ] Test with Windows High Contrast mode and confirm affordances remain visible
- [ ] Run axe DevTools browser extension on `/dashboard` and confirm no Critical/Serious violations

Performance:
- [ ] Open AI tokens details view multiple times and confirm it loads quickly
- [ ] With a large number of AI usage events (stress test if possible), confirm breakdown renders efficiently
- [ ] Verify no console errors or warnings when interacting with AI tokens UI

---

## Regression Testing

Existing Dashboard Features:
- [ ] Verify other dashboard cards (Manuscripts, AI Usage, etc.) still function correctly
- [ ] Confirm AI usage metering logic is unchanged (only display/UX updated)
- [ ] Verify Gemini consistency checks still log usage correctly (`src/lib/gemini.ts`)
- [ ] Verify Llama suggestions still log usage correctly (`src/lib/llama.ts`)

Database and Backend:
- [ ] Confirm `billing_cycles` table and `ai_usage_events` table are queried correctly
- [ ] Verify no changes to metering logic or database schema (display-only story)
- [ ] Check that `getOrCreateOpenBillingCycle` continues to work as expected

---

## Defect Reporting

- [ ] Log defects with story number (8.19) and exact AC reference (e.g., AC 8.19.2)
- [ ] Attach screenshots or screen recordings for UI defects
- [ ] Include browser, OS, and viewport size for visual bugs
- [ ] Note specific steps to reproduce any issues
- [ ] Tag defects as Critical, High, Medium, or Low priority

---

## Sign-off

**QA Engineer:** _________________________
**Date Tested:** _________________________
**Environment:** _________________________
**Result:** [ ] Pass  [ ] Pass with minor issues  [ ] Fail

**Notes:**
