**Manual QA**
Project: bearing-app
Date: 2026-02-06
Scope: Stories 8.9, 8.11, 8.12, 8.13, 8.15
Audience: Manual QA Team

**Setup**
- [ ] Use an Author account with at least two manuscripts.
- [ ] Manuscript A has metadata author name and BISAC category set.
- [ ] Manuscript B has no author name or BISAC metadata.
- [ ] Use a System Admin account (`users.role = 'admin'`).
- [ ] Stripe is in test mode and checkout can be completed.
- [ ] Resend is configured so email delivery can be verified.
- [ ] Seed or create service requests in statuses: `pending`, `paid`, `in_progress`, `completed`, `cancelled`, `failed`.

**Story 8.9 (Fullscreen View)**
- [ ] From the manuscript editor, click the Fullscreen button and confirm header, footer, and binder are hidden. (AC 8.9.1)
- [ ] Toggle fullscreen with Cmd+Backslash (Mac) or Ctrl+Backslash (Windows) and confirm behavior matches the button. (AC 8.9.1)
- [ ] Confirm the editor keeps focus after entering fullscreen and typing works immediately. (AC 8.9.1)
- [ ] Open Export or Conflict modal while fullscreen and confirm it appears above the fullscreen overlay. (AC 8.9.1)
- [ ] Confirm editor width remains focused (max-w-3xl) and fills the screen area. (AC 8.9.2)
- [ ] Confirm floating controls show Autosave indicator, Theme toggle, and Exit button. (AC 8.9.2)
- [ ] Scroll in normal view, enter fullscreen, exit fullscreen, and confirm scroll position is preserved. (AC 8.9.2)
- [ ] Toggle Dark Mode in fullscreen, exit, re-enter, and confirm preference persists. (AC 8.9.3)
- [ ] Exit fullscreen using Esc, keyboard shortcut, and Exit button; confirm focus returns to editor. (AC 8.9.4)
- [ ] Confirm fullscreen is a CSS overlay (no broken or unclickable editor state). (AC 8.9.5)

**Story 8.11 (ISBN Registration Flow)**
- [ ] Marketplace: click Buy ISBN and confirm the ISBN Registration modal opens. (AC 8.11.1)
- [ ] Manuscript Services page: click Buy ISBN and confirm modal opens with manuscript read-only. (AC 8.11.1)
- [ ] Marketplace context shows required manuscript dropdown. (AC 8.11.2)
- [ ] If no manuscripts exist, confirm CTA is disabled and empty state links to create/open manuscripts. (AC 8.11.2)
- [ ] Prefill author name and BISAC from manuscript metadata; fallback to user display name when missing. (AC 8.11.3)
- [ ] Verify CTA disabled until manuscript, author name, and category are valid. (AC 8.11.4)
- [ ] Submit valid form and confirm Stripe checkout redirect occurs. (AC 8.11.5)
- [ ] If an active request exists for the manuscript, confirm no Stripe redirect and user sees View Order link. (AC 8.11.7)
- [ ] After successful checkout, confirm a service request is created with type `isbn` and metadata stored. (AC 8.11.6)
- [ ] Verify the new ISBN request appears in My Orders. (AC 8.11.6)

**Story 8.12 (Service Submission Forms)**
- [ ] Marketplace and Manuscript Services: clicking Request opens a modal titled with the service name. (AC 8.12.1)
- [ ] Marketplace context uses manuscript dropdown; manuscript context is read-only. (AC 8.12.1)
- [ ] Author Website form shows Genre/Vibe, Existing Website URL (optional), Design Notes. (AC 8.12.2)
- [ ] Marketing form shows Target Audience, Budget Range, Goals. (AC 8.12.2)
- [ ] Social Media form shows Target Platforms (multi-select) and Current Handles. (AC 8.12.2)
- [ ] Generic service shows Request Details and requires it. (AC 8.12.2)
- [ ] Submit valid form and confirm success toast plus modal close. (AC 8.12.3)
- [ ] Confirm service request is created with status `pending` and metadata stored. (AC 8.12.4)
- [ ] Duplicate active request for same manuscript and service is blocked or shows View Request link. (AC 8.12.5)

**Story 8.13 (My Orders / Tracking)**
- [ ] Navigate to `/dashboard/orders` and confirm list loads. (AC 8.13.1)
- [ ] Confirm list shows Service Type, Manuscript Title, Status badge, Date Submitted. (AC 8.13.1)
- [ ] Confirm list is sorted by newest first. (AC 8.13.1)
- [ ] Status badges use correct colors for each status. (AC 8.13.2)
- [ ] Empty state shows message and Marketplace link. (AC 8.13.2)
- [ ] Click an order to open `/dashboard/orders/[id]` detail view. (AC 8.13.3)
- [ ] Detail view shows metadata, current status, and admin notes if present. (AC 8.13.3)
- [ ] Pending orders show Cancel Request; non-pending orders do not. (AC 8.13.3)
- [ ] Manuscript column links to the manuscript editor when available. (AC 8.13.5)
- [ ] Admin updates status; confirm user receives email with subject and order link. (AC 8.13.4)

**Story 8.15 (Admin Orders / Service Requests)**
- [ ] Non-admin access to `/dashboard/admin/fulfillment` is denied or redirected. (AC 8.15.4)
- [ ] Admin can access fulfillment dashboard and see all requests. (AC 8.15.1)
- [ ] Admin list shows User, Service Type, Status, Date Submitted. (AC 8.15.1)
- [ ] Filters by status and service type work. (AC 8.15.1)
- [ ] Admin opens details and views full metadata. (AC 8.15.2)
- [ ] Admin updates status and sees change reflected in user My Orders. (AC 8.15.2)
- [ ] Admin can open Email Customer modal and send message. (AC 8.15.3)
- [ ] Status update triggers user notification email. (AC 8.15.5)

**Cross-Story Flow Checks**
- [ ] Submit a service request (8.12) and confirm it appears in My Orders (8.13).
- [ ] Purchase ISBN (8.11) and confirm it appears in My Orders (8.13).
- [ ] Update a request status as Admin (8.15) and confirm user view updates (8.13).
- [ ] Confirm status-change email is delivered after admin update (8.13, 8.15).
- [ ] Duplicate prevention works for both ISBN and service requests (8.11, 8.12).

**Reporting**
- [ ] Log defects with story number and exact AC reference.
- [ ] Attach screenshots or screen recordings for UI defects.
- [ ] Capture email headers if notification emails fail.
