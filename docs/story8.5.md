# Story 8.5: Move 2FA to Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user (author or admin),
I want to manage my Two-Factor Authentication (2FA) settings from a dedicated Security section in the Settings page,
so that the main dashboard remains uncluttered and security preferences are logically grouped where I expect them.

## Acceptance Criteria

### AC 8.5.1: 2FA Removed from Dashboard
- **Given** I am on the main Dashboard (`/dashboard`)
- **When** I view the page content
- **Then** the "Enable two-factor authentication" card/section is **NOT** visible
- **And** the dashboard layout focuses on manuscripts and core writing tasks

### AC 8.5.2: 2FA Available in Settings
- **Given** I am on the Settings page (`/dashboard/settings` or `/settings`)
- **When** I navigate to the "Security" tab or section
- **Then** I see the 2FA management component
- **And** I can enable/disable 2FA (if implemented) or see the setup flow
- **And** the UI style matches the settings page design (clean, consistent)

### AC 8.5.3: 2FA Functionality Persists
- **Given** I am on the Settings > Security page
- **When** I interact with the 2FA component (enable/setup)
- **Then** the TOTP setup flow works correctly (QR code, verify code)
- **And** successful setup updates my account security status
- **And** no functionality is lost during the move

## Tasks / Subtasks

- [x] **Task 1: Locate and Extract 2FA Component**
  - [x] Identify the current 2FA component (likely `TwoFactorAuth` or similar) in `src/components/` or embedded in `src/app/dashboard/page.tsx`.
  - [x] If embedded, refactor into a reusable component (e.g., `src/components/settings/SecuritySettings.tsx` or `src/components/auth/MfaSetup.tsx`).

- [x] **Task 2: Remove from Dashboard**
  - [x] Remove the 2FA component usage from `src/app/dashboard/page.tsx`.
  - [x] clean up any unused imports or state related to 2FA in the dashboard page.

- [x] **Task 3: Implement in Settings Page**
  - [x] Locate `src/app/dashboard/settings/page.tsx` (or create if missing).
  - [x] Create/Update a "Security" section/tab in the settings layout.
  - [x] Import and render the 2FA component in this new location.
  - [x] Ensure responsive design works (mobile friendly).

- [x] **Task 4: Verify Functionality**
  - [x] Verify 2FA setup flow still works in the new location.
  - [x] Verify UI state updates correctly (Enabled/Disabled).

## Dev Notes

### Architecture & patterns
- **Supabase Auth:** The 2FA logic relies on Supabase Auth API (`supabase.auth.mfa...`). Ensure the component has access to the Supabase client (via `createClient` hook or prop).
- **Settings Layout:** Follow existing settings page structure. If a tabs pattern exists, use it. If not, create a distinct "Security" section.
- **Component Reusability:** The 2FA component should be self-contained. Avoid prop drilling deep state from the dashboard page if possible; use Supabase auth state directly.

### Project Structure Notes
- **Dashboard:** `src/app/dashboard/page.tsx`
- **Settings:** Likely `src/app/dashboard/settings/page.tsx` or `src/app/settings/page.tsx`. Check `src/app/` structure.
- **Components:** Check `src/components/auth/` or `src/components/dashboard/`.

### Previous Story Intelligence (Story 8.4)
- **Middleware:** No changes expected to middleware, but be aware of `/dashboard` vs `/dashboard/settings` route protection (should be covered by existing layout guards).
- **Next.js 15+ Async Params:** If the settings page uses dynamic routes (e.g. `/settings/[tab]`), remember that `params` are now Promises. Always `await params`.

### References
- [Source: bearing-todo.md] P1 #5: Move 2FA to Settings.
- [Source: docs/architecture-auth.md] MFA (TOTP) Implementation details.

## Dev Agent Record

### Agent Model Used

gemini-2.0-flash-thinking-exp-01-21

### Debug Log References

### Completion Notes List

- Extracted 2FA logic into `SecuritySettings` component.
- Removed 2FA card from Dashboard.
- Added `SecuritySettings` to Settings page.
- Added unit tests for `SecuritySettings` covering loading, enrolled, and unenrolled states.
- Verified Dashboard tests pass.
- **AI Review Fixes (2026-01-28):**
  - Improved error handling in `SecuritySettings` to gracefully handle API failures.
  - Fixed SPA navigation violation in Dashboard (replaced `<a>` with `<Link>`).
  - Updated File List to include documentation updates.

### File List
- src/components/settings/SecuritySettings.tsx
- src/app/dashboard/settings/page.tsx
- src/app/dashboard/page.tsx
- tests/components/settings/SecuritySettings.test.tsx
- docs/story8.5.md
- _bmad-output/traceability-matrix.md
- _bmad-output/bmm-workflow-status.yaml
