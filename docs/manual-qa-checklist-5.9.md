# Manual QA Checklist: Story 5.9 — AI Cover Generator

**Feature**: Cover Lab (AI-powered book cover generation)
**Location**: Manuscript Settings > "Cover Lab" tab
**Prerequisites**: Logged-in author with at least one manuscript

---

## Pre-Test Setup

- [ ] Confirm `MODAL_COVER_URL` env var is set in Vercel
- [ ] Confirm `MODAL_API_KEY` env var is set in Vercel
- [ ] Confirm Vertex AI Imagen credentials are configured in Modal secrets
- [ ] Confirm R2 lifecycle rule exists for `tmp/covers/` prefix (48h expiration)
- [ ] Confirm R2 `covers/` and `gallery/` prefixes are NOT in any lifecycle rule

---

## 1. Cover Lab UI — Form & Layout

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 1.1 | Cover Lab tab visible | Navigate to any manuscript > Settings | "Cover Lab" tab appears | [ ] |
| 1.2 | Form fields present | Click Cover Lab tab | Genre dropdown, Mood dropdown, Art Style selector (Cinematic / Illustrated / Minimalist), Visual Description textarea all visible | [ ] |
| 1.3 | Title auto-filled | Open Cover Lab on a manuscript with a title | Title field is pre-populated from manuscript metadata | [ ] |
| 1.4 | Author name auto-filled | Open Cover Lab on a manuscript with author metadata | Author name field is pre-populated | [ ] |
| 1.5 | Generate button enabled | Fill in required fields | "Generate" button is enabled and clickable | [ ] |
| 1.6 | Generate button disabled (empty form) | Leave Visual Description blank | Generate button is disabled or shows validation error | [ ] |

---

## 2. Generation Flow — Happy Path

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 2.1 | Job creation | Fill form and click Generate | Immediate response — no long wait. Loading state begins with skeleton placeholders | [ ] |
| 2.2 | Progressive image loading | Watch the grid after clicking Generate | Images appear one at a time as they complete (up to 4). Skeleton placeholders shown for pending slots | [ ] |
| 2.3 | All 4 images generated | Wait for generation to complete | 4 cover images displayed in a grid. All are portrait orientation (taller than wide) | [ ] |
| 2.4 | Images are textless | Inspect generated images | Images contain artwork only — no AI-generated text, letters, or words on the covers | [ ] |
| 2.5 | Title/author overlay | Check images after generation | Title and author name appear as UI text overlay on the artwork | [ ] |
| 2.6 | Portrait 2:3 ratio | Right-click > inspect image dimensions | Images are approximately 2:3 ratio (e.g., 832x1248) | [ ] |
| 2.7 | WebP format | Right-click > save image or inspect network | Images are served as `.webp` format | [ ] |

---

## 3. Text Overlay Controls

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 3.1 | Font selection | Change font selector | Text overlay switches between serif, sans-serif, monospace families | [ ] |
| 3.2 | Position control | Change position (top/center/bottom) | Title and author text moves to selected position on the cover | [ ] |
| 3.3 | Color/opacity control | Adjust color and opacity | Text overlay changes color and opacity accordingly | [ ] |
| 3.4 | Overlay settings persist | Change overlay settings, navigate away, come back | Settings are preserved (font, position, color/opacity intact) | [ ] |

---

## 4. Full-Size Preview

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 4.1 | Preview opens on click | Click any generated image | Full-size preview modal opens showing the image with text overlay | [ ] |
| 4.2 | Keyboard: Escape closes | Press Escape while preview is open | Modal closes | [ ] |
| 4.3 | Keyboard: arrow keys | Press left/right arrows in preview | Navigate between generated images | [ ] |
| 4.4 | Click outside closes | Click outside the preview modal | Modal closes | [ ] |

---

## 5. Save to Gallery

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 5.1 | Save button visible | View generated images | "Save to Gallery" button appears on each image | [ ] |
| 5.2 | Save succeeds | Click "Save to Gallery" on an image | Success feedback. Image is saved without being applied as book cover | [ ] |
| 5.3 | Gallery isolation | Log in as a different user | Cannot see the first user's gallery images | [ ] |

---

## 6. Select as Book Cover

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 6.1 | Select button visible | View generated images | "Select as Book Cover" button appears on each image | [ ] |
| 6.2 | Confirmation dialog | Click "Select as Book Cover" | Confirmation dialog appears: "This will replace your current cover. Continue?" | [ ] |
| 6.3 | Side-by-side comparison | Click Select on a manuscript that already has a cover | Dialog shows current cover vs new cover side-by-side | [ ] |
| 6.4 | Cover updated | Confirm selection | Manuscript's cover_url is updated. New cover visible in manuscript settings / marketing page | [ ] |
| 6.5 | Cover history preserved | Select a new cover when one already exists | Previous cover is preserved (not permanently lost) | [ ] |

---

## 7. Regenerate

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 7.1 | Regenerate button | After images load | "Regenerate" button is visible | [ ] |
| 7.2 | Form pre-filled | Click Regenerate | Form inputs are pre-filled with previous values. User can tweak before re-submitting | [ ] |
| 7.3 | Previous results visible | Click Regenerate (or tweak and submit) | Previous results remain visible while new generation is in progress | [ ] |
| 7.4 | New results replace | Wait for new generation to complete | New images displayed. Previous results replaced | [ ] |

---

## 8. Concurrency & Rate Limiting

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 8.1 | Generate disabled during active job | Click Generate, then try to click it again immediately | Generate button is disabled while job is running. Status indicator shown instead | [ ] |
| 8.2 | Rate limit (5/day) | Generate covers 5 times in one day, then try a 6th | 6th attempt is rejected with rate limit message | [ ] |
| 8.3 | Concurrent job blocked (409) | Try to start a generation while one is already running for the same manuscript | Error message indicating a job is already active | [ ] |

---

## 9. Error Handling

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 9.1 | Partial safety block | If Imagen blocks some images | Shows "X of 4 images generated — Y blocked by safety filter" message. Available images are still displayed | [ ] |
| 9.2 | Full safety block | If all 4 images are blocked by safety filter | Job marked as failed with user-friendly safety message | [ ] |
| 9.3 | Timeout | If job takes too long (>5 min) | Client-side timeout message displayed after ~60 polls | [ ] |
| 9.4 | Quota exhaustion (429) | If Vertex AI returns 429 | "Generation queued — high demand, retrying shortly" message. Job retries automatically | [ ] |

> **Note**: Tests 9.1, 9.2, and 9.4 may be difficult to trigger intentionally. If they can't be reproduced, verify the error UI by checking that the error state components render correctly (e.g., via DevTools or by temporarily mocking responses).

---

## 10. Accessibility

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 10.1 | Alt text on images | Inspect generated images (right-click or screen reader) | Alt text is populated from the user's visual description input | [ ] |
| 10.2 | Screen reader: preview modal | Open preview with screen reader active | Modal announces as dialog with label. Focus is trapped inside modal | [ ] |
| 10.3 | Keyboard-only navigation | Tab through Cover Lab without a mouse | All interactive elements (form fields, buttons, image actions) are reachable and operable via keyboard | [ ] |

---

## 11. Mobile Responsive (< 768px viewport)

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 11.1 | Image grid layout | View Cover Lab at 375px width | Image grid switches to single-column stacked layout | [ ] |
| 11.2 | Form fields | View form at 375px width | All fields stack vertically, no horizontal overflow | [ ] |
| 11.3 | Preview modal | Open full-size preview at 375px width | Preview is full-screen on mobile | [ ] |
| 11.4 | Tablet breakpoint | View Cover Lab at 768px width | Layout adapts appropriately (no overflow, no broken grid) | [ ] |

---

## 12. Data Integrity

| # | Test Case | Steps | Expected | Pass? |
|---|-----------|-------|----------|-------|
| 12.1 | Job record created | After clicking Generate, check Supabase `cover_jobs` table | New row with correct `user_id`, `manuscript_id`, `status`, `prompt`, `genre`, `mood`, `style` | [ ] |
| 12.2 | Wrapped prompt saved | Check `cover_jobs.wrapped_prompt` | Contains the full prompt sent to Imagen (includes "no text" directives) | [ ] |
| 12.3 | Gallery record created | After saving to gallery, check `gallery_assets` table | New row with correct metadata: `url`, `prompt`, `wrapped_prompt`, `provider` ("vertex-ai"), `model` ("imagen-4.0") | [ ] |
| 12.4 | RLS enforcement | Query `gallery_assets` or `cover_jobs` as a different user | Cannot access another user's records | [ ] |
| 12.5 | Usage event logged | After successful generation, check `ai_usage_events` | Event with `feature = "cover_generation"`, `model = "imagen-4.0"` | [ ] |
| 12.6 | Usage NOT logged on failure | If Modal trigger fails, check `ai_usage_events` | No usage event created (rate limit slot not consumed) | [ ] |

---

## Summary

| Section | Test Count |
|---------|-----------|
| 1. Form & Layout | 6 |
| 2. Happy Path | 7 |
| 3. Overlay Controls | 4 |
| 4. Preview | 4 |
| 5. Save to Gallery | 3 |
| 6. Select as Cover | 5 |
| 7. Regenerate | 4 |
| 8. Concurrency & Rate Limits | 3 |
| 9. Error Handling | 4 |
| 10. Accessibility | 3 |
| 11. Mobile Responsive | 4 |
| 12. Data Integrity | 6 |
| **Total** | **53** |

---

## Notes for QA Team

- **Environment**: Test on the deployed Vercel preview or staging URL (not localhost) — Modal worker needs to reach production Supabase and R2.
- **Generation time**: Each cover generation takes ~15-60 seconds depending on Vertex AI load. Be patient during progressive loading.
- **Daily rate limit**: You get 5 generations per day per user. Plan test sequences accordingly or use multiple test accounts.
- **Safety filter tests**: Imagen 4.0 has built-in safety filters. You generally cannot trigger them with normal book descriptions. Tests 9.1/9.2 may need to be verified via code inspection rather than live reproduction.
- **R2 temp cleanup**: Temporary images auto-expire after 48 hours. Don't rely on `tmp/covers/` URLs persisting beyond that window.
