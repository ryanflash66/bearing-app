# Manual QA Guide: Story 8.7 & 8.19

## Story 8.7: Check Consistency Enhancement (AI)

### Test Environment

- Platform: Web (Desktop & Mobile)
- User roles: Author
- Prerequisites: Manuscript with varied grammar/style/tone issues

### Test Cases

#### 1. Sidebar UI & Sheet Behavior

- [ ] Open a manuscript, trigger Consistency Check
- [ ] Sidebar opens as a Sheet (right on desktop, bottom on mobile)
- [ ] Sidebar remains open while editing
- [ ] Overlay cannot be closed by clicking outside (verify controlled mode)

#### 2. Issue Rendering & Navigation

- [ ] Issues are listed with severity, type, and suggested fix
- [ ] Clicking an issue scrolls and highlights the relevant text
- [ ] If text is changed, fallback warning appears
- [ ] Keyboard navigation: Arrow keys move focus, Enter/Space navigates

#### 3. Quick-Fix & Undo

- [ ] "Apply Fix" button replaces text and triggers autosave
- [ ] Undo button appears for 60s per fix, can undo out of order
- [ ] Multiple fixes in rapid succession: only one applies at a time (no race)
- [ ] Autosave failure: warning toast on first failure, persistent banner after 3

#### 4. Skeleton Loader & Cancellation

- [ ] Skeleton appears immediately on check start, hides on data/cancel
- [ ] Cancel button appears after 30s, cancels job and resets UI
- [ ] If check completes while cancel is visible, cancel button disappears

#### 5. Filtering, Sorting, Virtualization

- [ ] Filter by severity/type, sort by severity then position
- [ ] Filter state persists in URL; back button restores filters
- [ ] > 50 issues: list is virtualized, keyboard nav works

#### 6. Security & Accessibility

- [ ] Suggestions with <script>, <img>, or data URIs are sanitized
- [ ] Formatting tags (<em>, <strong>, <code>, <mark>) are preserved
- [ ] Sheet has `aria-modal`, `role="dialog"`, focus trap
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)

#### 7. Visual Contrast

- [ ] Severity borders and backgrounds meet WCAG AA contrast

---

## Story 8.19: Clarify AI Tokens Display

### Test Environment

- Platform: Web (Desktop & Mobile)
- User roles: Author, Admin
- Prerequisites: Account with AI usage history

### Test Cases

#### 1. Token Display Accuracy

- [ ] AI token usage is visible in dashboard/profile
- [ ] Token count matches backend/API values
- [ ] Token display updates after new AI actions

#### 2. UI Clarity

- [ ] Token display is labeled clearly (e.g., "AI Tokens Used")
- [ ] Tooltip or help text explains what tokens are
- [ ] No ambiguous or misleading labels

#### 3. Edge Cases

- [ ] Zero tokens: UI shows clear empty state
- [ ] Large token counts: UI does not overflow or truncate
- [ ] Error state: If API fails, user sees friendly error message

#### 4. Security & Privacy

- [ ] No sensitive data is exposed in token display
- [ ] Only authorized users can see their own token usage

#### 5. Accessibility

- [ ] Token display is screen reader accessible
- [ ] Sufficient color contrast for all text

---

## General QA Notes

- Test on latest Chrome, Firefox, Safari, Edge
- Test on iOS Safari and Android Chrome (mobile)
- Log all bugs with screenshots and reproduction steps
- Confirm all acceptance criteria from story docs are met
