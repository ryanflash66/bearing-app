# Story 8.7: Publishing Ops - Review Dashboard

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Super Admin**,
I want **a dedicated dashboard to review publishing help requests**,
so that **I can verify manuscript metadata, check publishing requirements, and approve or reject publishing services.**

## Acceptance Criteria

1. **Dedicated View**: Implement a new admin route at `/dashboard/admin/publishing` (or a tab within the Fulfillment dashboard). [AC 8.7.1]
2. **Metadata Visibility**: The dashboard must display metadata for `publishing_help` requests:
    - Target ISBN (if provided by author)
    - Selected Categories (BISAC codes)
    - Keywords
    - Format preferences (Print/Ebook) [AC 8.7.2]
3. **Manuscript Context**: Each request must link directly to the manuscript review page or provide a "View Manuscript" button. [AC 8.7.3]
4. **Filtering**: Filter specifically for `service_type = 'publishing_help'`. [AC 8.7.4]
5. **State Transitions**: Admins can mark as "In Progress" (acknowledging the request) or "Completed" (publishing successfully initiated). [AC 8.7.5]
6. **Rejection with Reason**: Admins can reject a publishing request with a specific reason (e.g., "Missing front matter," "Cover requirements not met"). [AC 8.7.6]

## Tasks / Subtasks

- [ ] **Infrastructure & Routing**
  - [ ] Create `src/app/dashboard/admin/publishing/page.tsx`
  - [ ] Add navigation link to admin sidebar/layout
- [ ] **Data Fetching**
  - [ ] Implement server-side fetching of `service_requests` where `service_type = 'publishing_help'`
  - [ ] Join with `manuscripts` table to get title and status
  - [ ] Join with `users` table for author contact info
- [ ] **UI Components**
  - [ ] Create `PublishingReviewQueue` component (inspired by `FulfillmentQueue`)
  - [ ] Implement `PublishingMetadataCard` to show Categories/Keywords cleanly
  - [ ] Integrate existing `RejectRequestModal`
- [ ] **Backend Actions**
  - [ ] Ensure `fulfill-request` API handles `publishing_help` status updates
  - [ ] Create `update-request-status` action for "In Progress" state

## Dev Notes

- **Existing Pattern**: Follow the pattern in `src/app/dashboard/admin/fulfillment/page.tsx`.
- **Metadata Handling**: `service_requests.metadata` is a JSONB field. Use type-safe casting in the component.
- **Role Check**: Use `isSuperAdmin(supabase)` for gating access (AC 5.4.1 compliance).
- **Manuscript Linking**: Ensure the "View Manuscript" button opens the manuscript in a read-only mode or the standard editor if the admin has bypass rights.

### Project Structure Notes

- New Page: `src/app/dashboard/admin/publishing/page.tsx`
- New Component: `src/components/admin/PublishingReviewQueue.tsx`
- Reusable: `src/components/admin/RejectRequestModal.tsx`

### References

- [Source: src/app/api/services/request/route.ts] - Defines metadata structure for `publishing-help`.
- [Source: src/app/dashboard/admin/fulfillment/page.tsx] - Reference for admin listing pages.
- [Source: src/lib/service-requests.ts] - Active status definitions and utility functions.

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash (via BMad PM Agent)

### File List
- `src/app/dashboard/admin/publishing/page.tsx`
- `src/components/admin/PublishingReviewQueue.tsx`
- `src/components/admin/PublishingMetadataCard.tsx`
- `src/app/api/admin/update-status/route.ts` (Optional: if "In Progress" needs separate logic)
