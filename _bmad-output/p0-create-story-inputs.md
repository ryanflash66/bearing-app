# P0 Bugfixes — Create-Story Inputs

**Source:** `bearing-todo.md` (client feedback) + `bearing-todo-plan.md`  
**Use:** Feed into `/bmad:bmm:workflows:create-story` or author `docs/story-p0-1.md` … `docs/story-p0-4.md` manually.  
**Date:** 2026-01-22

---

## P0-1: Export Download Fix (Manuscript → Export)

### Story ID
`p0-1` or `story-p0-1`

### Title
**Fix manuscript export download ("Failed to download the file")**

### Description
As an author, when I export my manuscript to PDF or DOCX and the file is ready, the browser successfully downloads the file. The system no longer shows "Failed to download the file" or leaves the user without a downloaded file.

### Acceptance Criteria (Gherkin)

- **AC P0-1.1**  
  **Given** I am on the manuscript editor and open Export  
  **When** I choose PDF and click export  
  **Then** A PDF file downloads with the correct filename and content (no "Failed to download" error)

- **AC P0-1.2**  
  **Given** I am on the manuscript editor and open Export  
  **When** I choose DOCX and click export  
  **Then** A DOCX file downloads with the correct filename and content (no "Failed to download" error)

- **AC P0-1.3**  
  **Given** The export API returns an error (e.g. 4xx/5xx)  
  **When** The client handles the response  
  **Then** The user sees a clear, actionable error message (not a generic "Failed to download")

- **AC P0-1.4**  
  **Given** Export is used in production-like environment  
  **When** PDF/DOCX export is requested  
  **Then** Response headers (e.g. `Content-Disposition`, `Content-Type`) and CORS allow the browser to perform the download correctly

### Dependencies
- Story 2.1 (manuscripts), 2.2 (versions), 2.4 (export service). Fix builds on existing `/api/manuscripts/[id]/export/pdf` and `docx` + `ExportModal` fetch → blob → download flow.

### Implementation Tasks (checklist)

- [ ] Inspect `ExportModal` fetch → blob → `link.download` flow; fix blob handling or fallback to direct navigation if appropriate
- [ ] Verify `/api/manuscripts/[id]/export/pdf` and `docx` return correct `Content-Type` and `Content-Disposition`; fix if missing or wrong
- [ ] Check CORS and response shape for export routes; ensure no cross-origin or opaque response issues blocking download
- [ ] Replace generic "Failed to download file" with contextual error messaging (e.g. "Export failed. Please try again." or surface API error when safe)
- [ ] Add E2E test: export PDF and DOCX from manuscript editor and assert file download (or explicit failure message)

### Effort (estimate)
- Dev: 4–6 h  
- QA: 2 h  

### References
- `src/components/manuscripts/ExportModal.tsx` (download logic, alert)
- `src/app/api/manuscripts/[id]/export/pdf/route.ts`, `docx/route.ts`
- `src/lib/export.ts` (`exportManuscript`)

---

## P0-2: Autosave Retry & Recovery (Save Failed Loop)

### Story ID
`p0-2` or `story-p0-2`

### Title
**Autosave retry with backoff and manual-save fallback (fix "Save failed" loop)**

### Description
As an author, when autosave fails (e.g. network or server error), the system retries with exponential backoff and eventually offers a manual "Save" action. I am never stuck in an endless "Save failed" loop with no way to recover.

### Acceptance Criteria (Gherkin)

- **AC P0-2.1**  
  **Given** Autosave has failed one or more times  
  **When** Retries are performed  
  **Then** Retries use exponential backoff (e.g. 1s, 2s, 4s, cap) and do not hammer the server

- **AC P0-2.2**  
  **Given** Autosave is in a failed state  
  **When** The user is shown "Save failed"  
  **Then** A "Save" (or "Retry save") button is visible; clicking it triggers a single save attempt

- **AC P0-2.3**  
  **Given** The user clicks "Save" after previous failures  
  **When** The save succeeds  
  **Then** The failed state is cleared, and autosave resumes normally

- **AC P0-2.4**  
  **Given** A save fails (network or API error)  
  **When** The failure is handled  
  **Then** An actionable error is logged (client and/or server) with enough context to debug (e.g. manuscript id, error code, timestamp)

### Dependencies
- Story 2.1 (manuscript CRUD + autosave). Extends `useAutosave` and editor UI.

### Implementation Tasks (checklist)

- [ ] Add exponential backoff to autosave retry logic in `useAutosave` (or equivalent)
- [ ] Introduce "Save" / "Retry save" button when autosave is in failed state; wire to single save attempt
- [ ] Clear failed state and resume autosave when manual save succeeds
- [ ] Add structured error logging for save failures (avoid logging PII)
- [ ] Re-run disconnect/reconnect scenarios; ensure no indefinite "Save failed" loop and no data loss

### Effort (estimate)
- Dev: 4–6 h  
- QA: 2 h  

### References
- `src/lib/useAutosave.ts`
- Editor components that consume autosave (e.g. `ManuscriptEditor`)

---

## P0-3: Zen Mode → Remove Broken Implementation

### Story ID
`p0-3` or `story-p0-3`

### Title
**Remove broken Zen mode (editor unclickable / "Error saving" loop)**

### Description
As an author, I do not encounter a broken "Zen mode" that makes the editor unclickable or triggers repeated "Error saving" messages. The current Zen implementation is removed or disabled until replaced by a proper fullscreen mode (P1 #9).

### Acceptance Criteria (Gherkin)

- **AC P0-3.1**  
  **Given** The manuscript editor  
  **When** I use the editor (no Zen toggle)  
  **Then** The editor remains fully usable: focusable, editable, and without spurious "Error saving" loops

- **AC P0-3.2**  
  **Given** The previous Zen mode toggle/button  
  **When** This story is complete  
  **Then** The Zen toggle is removed or disabled; users cannot enter the broken Zen state

- **AC P0-3.3**  
  **Given** Any remaining Zen-related UI or logic  
  **When** Touched by this change  
  **Then** No regressions in normal editing, autosave, or export

### Dependencies
- Story 2.1. Complements P1 #9 (fullscreen view), which will replace Zen.

### Implementation Tasks (checklist)

- [ ] Locate Zen mode toggle and all Zen-specific logic (editor wrapper, focus handling, etc.)
- [ ] Remove or disable Zen toggle and Zen-specific behaviour; ensure default view is standard editor
- [ ] Remove or guard any Zen-specific save/error paths that could cause "Error saving" loop
- [ ] Smoke-test: edit, autosave, export; no Zen-related failures
- [ ] Document that "fullscreen" mode will be implemented in P1 #9

### Effort (estimate)
- Dev: 2–3 h  
- QA: 1 h  

### References
- Story 2.1 (AC 2.1.6 Zen Mode per bmm-workflow-status)
- Manuscript editor and layout components

---

## P0-4: Admin Login / Maintenance Gating Fix

### Story ID
`p0-4` or `story-p0-4`

### Title
**Fix admin login landing ("System is under maintenance" after successful login)**

### Description
As an admin, after I successfully log in and am redirected to the admin area, I see the admin dashboard (or appropriate admin route)—not "System is under maintenance. Please try again later." Maintenance gating applies only where intended and does not block admins from accessing the admin portal.

### Acceptance Criteria (Gherkin)

- **AC P0-4.1**  
  **Given** Maintenance mode is **off**  
  **When** An admin logs in and is redirected to the admin dashboard (or configured admin landing)  
  **Then** The admin sees the dashboard, not the maintenance message

- **AC P0-4.2**  
  **Given** Maintenance mode is **on**  
  **When** An admin logs in and is redirected to the admin area  
  **Then** Admins can still access the admin portal (maintenance bypass for admin routes); OR product explicitly documents that maintenance blocks everyone including admins (current behaviour retained and clarified)

- **AC P0-4.3**  
  **Given** Auth redirect logic for admin users  
  **When** Login succeeds  
  **Then** Redirect lands on the correct admin route (e.g. `/dashboard/admin/super` or `/dashboard/admin/...`), not a generic dashboard that shows maintenance

- **AC P0-4.4**  
  **Given** Admin uses the app in production-like environment  
  **When** Maintenance is off and no other outage  
  **Then** Admin login → admin dashboard flow works reliably (no spurious maintenance UX)

### Dependencies
- Story 4.1 (admin roles), 4.5 (maintenance mode). Uses `src/utils/supabase/middleware.ts`, `DashboardLayout`, admin routes.

### Implementation Tasks (checklist)

- [ ] Review middleware maintenance check: which routes are blocked, which bypass (e.g. admin)?
- [ ] Ensure admin routes (e.g. `/dashboard/admin/*`) bypass maintenance, **or** clearly document that maintenance locks everyone
- [ ] Verify post-login redirect: admin → admin dashboard (not generic dashboard that shows maintenance banner)
- [ ] If maintenance banner is shown on admin dashboard when maintenance is on: ensure it’s informational only and does not block use (per product decision)
- [ ] Add or extend E2E/test: admin login → reach admin dashboard when maintenance off; no "under maintenance" as blocking UX for admin

### Effort (estimate)
- Dev: 3–4 h  
- QA: 2 h  

### References
- `src/utils/supabase/middleware.ts` (maintenance check, allowlist)
- `src/components/layout/DashboardLayout.tsx` (maintenance banner)
- `src/lib/super-admin.ts`, `MaintenanceToggle`, `MaintenanceCallout`
- Auth redirect flow (e.g. callback, `dashboard` vs `dashboard/admin`)

---

## Suggested story file layout

If creating `docs/` story files manually:

- `docs/story-p0-1.md` — Export download fix  
- `docs/story-p0-2.md` — Autosave retry + manual save  
- `docs/story-p0-3.md` — Remove broken Zen mode  
- `docs/story-p0-4.md` — Admin login / maintenance gating  

Use the same sections as existing stories: Description, Acceptance Criteria, Dependencies, Implementation Tasks, Effort, References. Add **Status:** `ready-for-dev` and link to `bearing-todo.md` / `bearing-todo-plan.md`.

---

## Sprint / workflow

1. **Create stories:** Run create-story for each P0 item using the inputs above, or add `story-p0-1` … `story-p0-4` to `docs/` and `sprint-status.yaml`.
2. **Sequence:** Suggested order: **P0-1** (export) and **P0-4** (admin) first to unblock users and admins; then **P0-2** (autosave), then **P0-3** (Zen removal).
3. **DEV:** Implement via `dev-story`, then `code-review`, then QA gate per BMAD.

---

**Last updated:** 2026-01-22  
**Owner:** Ryan Balungeli & NGANDIWEB Dev Team
