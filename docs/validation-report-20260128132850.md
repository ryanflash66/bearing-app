# Validation Report

**Document:** `docs/8-20-sync-manuscript-service.md`  
**Checklist:** `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`  
**Date:** 2026-01-28 13:28:50

## Summary

- Overall: 9/16 passed (56%)
- Critical Issues: 3

## Section Results

### 🚨 Critical mistakes to prevent

Pass Rate: 5/8 (63%)

✓ **Reinventing wheels**  
Evidence: Story explicitly points to reuse of existing types/utils/components/modal patterns (Story L116-L123).

⚠ **Wrong libraries / wrong approach risk**  
Evidence: Story correctly targets existing TipTap `editable` toggle (Story L23-L29; `src/components/editor/TiptapEditor.tsx` L18-L45), but it claims autosave “already has disable capability” (Story L122) which is not currently true in `src/lib/useAutosave.ts` (no `disabled` option in options at L170-L184).  
Impact: Dev may implement locking incompletely (editor read-only but autosave still running), causing confusing UX and potential writes while “locked”.

✓ **Wrong file locations**  
Evidence: Story lists concrete file locations that match the repo structure (Story L164-L173), including existing `src/components/manuscripts/ManuscriptEditor.tsx` and `src/app/dashboard/manuscripts/[id]/ManuscriptEditorWrapper.tsx`.

⚠ **Breaking regressions**  
Evidence: Story proposes DB uniqueness + API changes (Story L50-L60) but does not call out that the existing service request creation route currently stores `manuscriptId` only in `metadata` and does not populate the `service_requests.manuscript_id` column (`src/app/api/services/request/route.ts` L104-L116).  
Impact: Implementing the new “active request” queries/lock may silently fail (no matches) unless creation is corrected, leading to regressions in service flows.

⚠ **Ignoring UX**  
Evidence: Banner requirements are clear (Story L17-L29), but “View Order” is only a generic link to `/dashboard/orders` (Story L21) with no deep link to the specific order/request.  
Impact: Users may struggle to find the relevant order when multiple requests exist.

✓ **Vague implementations**  
Evidence: Story includes concrete endpoints, statuses, and specific UI locking behaviors (Story L15-L45, L55-L94).

✓ **Lying about completion**  
Evidence: Acceptance criteria are testable and explicit (Story L15-L47).

✓ **Not learning from past work**  
Evidence: Story includes “Known Patterns from Previous Work” and references existing patterns (`getAdminAwareClient` usage, server vs client split) (Story L205-L211).

### 🔒 Security / RLS viability (implicit but critical)

Pass Rate: 0/1 (0%)

✗ **User cancellation via RLS-compatible path**  
Evidence: Story requires users to cancel `pending` requests (Story L30-L35) via a user-facing API route (Story L57). However, current RLS for `service_requests` includes UPDATE only for admins/support agents (`supabase/migrations/20260114000000_create_service_marketplace_tables.sql` L88-L98).  
Impact: A straightforward “cancel” implementation using the user session will fail under RLS, blocking a core AC and risking unsafe workarounds (e.g., using elevated clients without guardrails).

### 🗄️ Data integrity / duplicate prevention

Pass Rate: 1/2 (50%)

✓ **Partial unique index approach is correct**  
Evidence: Table has a dedicated `manuscript_id` column (`supabase/migrations/20260114000000_create_service_marketplace_tables.sql` L28-L40), and a partial unique index is an appropriate mechanism (Story L51-L54, L126-L135).

✗ **Creation flow currently does not set `manuscript_id` column**  
Evidence: Existing create route inserts `metadata.manuscript_id` only (`src/app/api/services/request/route.ts` L104-L116) and does not set the `manuscript_id` column.  
Impact: The proposed unique index and “active request detection” will not work reliably until the creation route (and any other creation paths) writes `manuscript_id`.

### 🔁 Status sync / locking behavior

Pass Rate: 2/3 (67%)

✓ **Active vs inactive statuses are consistent with DB enum**  
Evidence: Story defines active statuses and references the enum values that exist in the migration (Story L100-L114; migration L18-L25).

⚠ **Locking implementation details need one extra guard**  
Evidence: Story specifies TipTap `editable: false` (Story L23-L27) which is feasible, but needs explicit guidance for preventing any writes (autosave + title updates) while locked; story partially covers this (Story L25-L27, L81-L83) but references a non-existent “autosave disable capability” (Story L122).  
Impact: Locked UI could still trigger background saves unless explicitly gated.

✓ **Refresh-based sync is acceptable**  
Evidence: Story explicitly states no real-time sync required; refresh updates state (Story L41-L45).

### 📋 Manuscript list integration

Pass Rate: 1/2 (50%)

⚠ **List badge requirement is clear but query approach is underspecified**  
Evidence: Story says “manuscript list shows a badge/indicator” (Story L46-L47) and includes tasks to update query (Story L85-L88), but does not specify whether to use a join, denormalized field, or a computed boolean.  
Impact: Dev may implement an inefficient N+1 query or inconsistent data path.

✓ **Existing list component has a clear extension point**  
Evidence: `src/components/manuscripts/ManuscriptList.tsx` already renders a status badge and can accept additional badge/indicator near L106-L110.

## Failed Items

1. **RLS: user cancellation path missing**  
   Recommendation: Add a dedicated RLS policy allowing users to update their own `service_requests` only when status is `pending` and transitioning to `cancelled`, or implement a narrowly-scoped server-side cancel path using an admin-aware client with strict owner checks.

2. **Creation route must populate `service_requests.manuscript_id`**  
   Recommendation: Update `POST /api/services/request` (and any other creation paths) to set the actual `manuscript_id` column (not only `metadata`), otherwise the unique index and active detection will not work.

3. **Autosave “disable capability” claim is inaccurate**  
   Recommendation: Either add an explicit `disabled` option to `useAutosave`, or ensure the editor never calls `queueSave` / `saveNow` when locked (and disables title changes) with an explicit implementation note in the story.

## Partial Items

1. **Regression prevention**  
   What’s missing: A note explicitly calling out the existing `metadata.manuscript_id` behavior as a migration step / data compatibility issue.

2. **UX: View Order deep link**  
   What’s missing: Consider linking to `/dashboard/orders/[id]` (if present) or including request/order ID in the banner for easy lookup.

3. **Manuscript list badge approach**  
   What’s missing: A recommended data approach (single query with join/exists, or precomputed flag) to avoid N+1 queries.

## Recommendations

1. **Must Fix**
   - Add explicit RLS guidance for user-driven cancellation (or safe server-side bypass with owner verification).
   - Require updating service request creation to set `service_requests.manuscript_id`.
   - Correct the autosave-locking guidance (either implement `disabled` in `useAutosave` or gate calls in editor).
2. **Should Improve**
   - Specify a performant manuscript list “active request” badge data strategy.
   - Add deep-linking guidance for “View Order”.
3. **Consider**
   - Call out expected Postgres unique-violation handling (map to HTTP 409) once the partial unique index is added.
