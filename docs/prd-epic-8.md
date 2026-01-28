# Epic 8: Client Feedback & Bearing TODO

**Goal:** Isolate and address all items from the client walkthrough feedback (Jan 2026): fix critical bugs (P0), implement required MVP features (P1), and capture polish/future work (P2).

**Source:** `bearing-todo.md` (client walkthrough, 2 transcripts cross-checked)  
**Planning:** `_bmad-output/bearing-todo-plan.md`  
**Create-story inputs (P0):** `_bmad-output/p0-create-story-inputs.md`

---

## Scope

This epic **isolates** bearing-todo work from existing epics so it can be planned, prioritised, and delivered explicitly. It covers:

- **P0 (Critical bugs):** Export download, autosave loop, Zen mode, admin login/maintenance gating.
- **P1 (Required for MVP):** 2FA move, publishing popup, consistency enhancement, images, fullscreen, marketplace redesign, ISBN/service forms, My Orders, admin users/orders/blog/notifications/CRUD, AI tokens clarity, **manuscript–service sync**.
- **P2 (Polish):** Login/UI improvements, subscription messaging.

Stories **8.1–8.4** fix regressions; **8.5–8.20** deliver P1; **8.21–8.22** are P2 backlog.

---

## Functional Requirements Covered

- **Export & Editor Reliability:** Fix download flow (2.4), autosave retry/recovery (2.1), Zen removal then fullscreen (2.1).
- **Admin Access:** Fix post-login maintenance gating and redirect (4.5, middleware).
- **Security UX:** Move 2FA to Settings (1.1).
- **Publishing & Services:** Publishing popup (7.3), ISBN/service forms (5.2, 5.3), marketplace redesign (5.1), **manuscript–service sync** (new).
- **Consistency & AI:** Check consistency enhancement (3.1/3.2), image upload + AI generation (5.9), AI tokens display (3.3).
- **Admin Portal:** User/manuscript viewing (read-only), orders/fulfillment, blog (WordPress), notifications, user CRUD (4.x, 5.4, 6.3).
- **My Orders:** Service tracking, status transitions, email on status change (5.3).

---

## Non-Functional Requirements

- **Reliability:** P0 fixes must eliminate “Failed to download”, autosave loops, Zen lockup, and admin lockout.
- **Data integrity:** Service requests linked to manuscripts; no duplicate active requests; clear lock/cancel workflow.
- **Accessibility:** New UI (modals, fullscreen, marketplace) remains WCAG 2.1 AA compliant where applicable.

---

## User Stories Overview

### P0 — Critical Bugs (Stories 8.1–8.4)

| ID | Story | Summary |
|----|-------|---------|
| **8.1** | Export download fix | Fix “Failed to download the file”; verify API headers, CORS, client fetch→blob→download; clear errors. |
| **8.2** | Autosave retry & recovery | Exponential backoff, “Manual save” fallback, structured logging; no endless “Save failed” loop. |
| **8.3** | Remove broken Zen mode | Remove/disable Zen toggle; editor always usable; no “Error saving” loop. Fullscreen replaces it (8.9). |
| **8.4** | Admin login / maintenance gating | Fix “System is under maintenance” after admin login; ensure admin bypass or correct redirect. |

### P1 — Required for MVP (Stories 8.5–8.20)

| ID | Story | Summary |
|----|-------|---------|
| **8.5** | Move 2FA to Settings | Move “Enable two-factor authentication” card from dashboard to Settings → Security. |
| **8.6** | Publishing flow — Service request popup | Manuscript → Publishing → modal: ISBN (optional), Category (prefill), Keywords (required), Ack/Education (review). Remove Copyright, Publisher. CTA “Send publishing request”; warning re NGANDIWEB; create `service_request` → admin queue. |
| **8.7** | Check consistency enhancement | Writing suggestions (grammar, style, tone); character consistency; story/plot consistency. Sidebar or expandable UI. |
| **8.8** | Image upload + AI generation in manuscript | Toolbar: upload images and/or AI “generate from context” (e.g. cover, scene). |
| **8.9** | Zen mode → Fullscreen view | Simple fullscreen: hide toolbar/sidebar, manuscript only, Escape to exit, dark/light toggle. Replaces 8.3. |
| **8.10** | Marketplace redesign (subscription) | Top banner: subscription CTA. Services (Publishing, ISBN, Author Website, etc.) open same-style popup → service request. |
| **8.11** | ISBN registration flow | Popup: manuscript selector, author name, category. “Send request” → service request. |
| **8.12** | Service submission forms | Per-service popups (Author Website, Marketing, Social Launch, etc.); all → service request. |
| **8.13** | My Orders / Service tracking | List requests, status (submitted → in progress → done), transitions, badges. Email on status change. |
| **8.14** | Admin — User & manuscript viewing | Remove manuscript editing from admin; user list → per-user manuscripts (read-only). |
| **8.15** | Admin — Orders / Service requests | All service requests; status updates; email customer from app. |
| **8.16** | Admin — Blog view | Pull from WordPress; list user blogs (who, when, title, link). |
| **8.17** | Admin — Notifications bell | Navbar bell: new requests, order updates, support. Fix if broken. |
| **8.18** | Admin — User CRUD | Add/invite, delete, edit roles. |
| **8.19** | Clarify AI tokens display | Tooltip/help: what tokens are, balance, usage per feature, optional purchase. |
| **8.20** | Sync & state (manuscript ↔ service) | **Key.** Link `service_request` to `manuscript_id`; manuscript UI shows status, “Cancel request”; lock edit while active; prevent duplicates. |

### P2 — Polish & Future (Stories 8.21–8.22)

| ID | Story | Summary |
|----|-------|---------|
| **8.21** | Login/UI improvements | Improve login design and general UI; consider social login, passwordless. After P0+P1 stable. |
| **8.22** | Marketplace subscription messaging | Clear “$X/month” or “pay-per-service” messaging. Depends on business model. |

---

## Dependencies

### Critical path

- **8.1, 8.4** → Unblock users and admins immediately; no story dependencies.
- **8.2, 8.3** → Autosave and Zen fixes; 8.9 replaces Zen.
- **8.6, 8.10, 8.11, 8.12** → Create service requests; **8.20** (sync) depends on these and underpins “edit lock” and My Orders.
- **8.13** (My Orders) → Depends on service requests and 8.20.
- **8.15** (Admin orders) → Depends on 8.6, 8.10, 8.11, 8.12.

### Cross-epic

- **2.1, 2.4:** Autosave, export (8.1, 8.2, 8.3).
- **4.5, 4.6, middleware:** Admin, maintenance, notifications (8.4, 8.14–8.18).
- **5.1–5.4, 7.3:** Marketplace, ISBN, fulfillment, metadata (8.6, 8.10–8.13, 8.15).
- **3.1, 3.2, 3.3:** Consistency, tokens (8.7, 8.19).
- **5.9, 6.3:** Cover/gen, blog (8.8, 8.16).

---

## Implementation Notes (from bearing-todo)

### Service request workflow

1. User clicks “Publishing” (or service) → Opens popup form.
2. User submits → App creates `service_request`: `manuscript_id`, `service_type`, `form_data`, `status`, `user_id`.
3. Request appears in Admin → Orders.
4. Admin updates status → User sees in My Orders + email.

### Sync pattern (Story 8.20)

- Manuscript ↔ `service_request` via `manuscript_id` / `linked_service_requests`.
- Editor checks active requests → banner + “Cancel request” or lock.
- No duplicate active requests per manuscript.

### Admin structure

- **Users:** View all, CRUD; per user: manuscripts (read-only), orders.
- **Orders:** All service requests; status; email customer.
- **Blog:** WordPress-backed list.
- **Settings, Support:** As-is.

---

## Effort & Cost (estimates)

| Tier | Stories | Dev (est.) | QA (est.) |
|------|---------|------------|-----------|
| P0 | 8.1–8.4 | 14–19 h | 7 h |
| P1 | 8.5–8.20 | TBD per story | TBD |
| P2 | 8.21–8.22 | Backlog | Backlog |

**Cost:** No new AI infra for P0. P1 image generation (8.8) and consistency (8.7) may add token cost; track in story estimates.

---

## Success Criteria

- [ ] **P0:** Export downloads successfully; autosave recovers; no Zen lockup; admin can access dashboard after login.
- [ ] **P1:** Publishing popup → service request; marketplace redesign; My Orders + email; admin users/orders/blog/notifications/CRUD; manuscript–service sync enforced.
- [ ] **P2:** Logged in backlog; executed when prioritised.

---

## References

- `bearing-todo.md` — Full client feedback.
- `_bmad-output/bearing-todo-plan.md` — Mapping, sequence, risks.
- `_bmad-output/p0-create-story-inputs.md` — Create-story inputs for 8.1–8.4.

---

**Last updated:** 2026-01-22  
**Owner:** Ryan Balungeli & NGANDIWEB Dev Team
