# Bearing Client Feedback — Planning Artifact

**Source:** `bearing-todo.md` (client walkthrough, Jan 22, 2026)  
**Prepared by:** PM (John)  
**Date:** January 22, 2026  
**Config:** `_bmad/bmm/config.yaml` | Output: `_bmad-output`

---

## Executive Summary

Client feedback surfaces **4 P0 bugs** (blocking), **16 P1 features** (required for MVP), and **2 P2 polish items**. Several “done” stories (Export 2.4, Autosave 2.1, Zen mode, Admin login) are **failing in client environment**—treat as regressions or environment-specific fixes. The **service-request ↔ manuscript sync** (P1 #20) and **Admin Orders/CRUD** (P1 #14–18) are architectural themes that span multiple stories.

**Recommended sequence:** Fix P0 → then P1 in dependency order → P2 when core is stable.

---

## 1. P0 — Critical Bugs (Fix ASAP)

| # | Item | Current story / epic | Action |
|---|------|----------------------|--------|
| **1** | **Export broken** — "Failed to download the file" | Story 2.4 (Export) | **Bugfix story.** Debug `/api/manuscripts/[id]/export/{pdf,docx}` + `ExportModal` fetch→blob→download. Verify CORS, `Content-Disposition`, and client-side error handling. Add E2E for export download. |
| **2** | **Autosave stuck in loop** — "Save failed" repeatedly, no recovery | Story 2.1 (CRUD + Autosave) | **Bugfix story.** Add exponential backoff to retries, "Manual save" fallback button, structured error logging. Re-verify disconnect/reconnect scenarios. |
| **3** | **Zen mode breaks editor** — unclickable, "Error saving" loop | Story 2.1 (Zen toggle, AC 2.1.6) | **Bugfix story.** Replace current Zen impl with simple fullscreen view (see P1 #9). Remove broken Zen toggle until #9 is done. |
| **4** | **Admin login landing broken** — "System is under maintenance" after login | Admin / middleware | **Bugfix story.** Fix maintenance gating: ensure admin routes either bypass maintenance **or** maintenance is off by default. Verify auth redirect to admin dashboard. Option: remove/comment maintenance banner for admin-only views until properly scoped. |

**Dependencies:** None. These unblock usage immediately.

**Suggested artifact:** Create `docs/story-p0-fixes.md` (or separate stories `p0-1` … `p0-4`) and run `dev-story` → `code-review` → QA.

---

## 2. P1 — Required Features (Before MVP)

### 2.1 Quick wins (no new backend)

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **5** | Move 2FA to Settings | Story 1.1 / Settings | Move 2FA card from dashboard to Settings → Security. UI shuffle only. |
| **9** | Zen mode → Fullscreen view | Replaces Zen in 2.1 | Simple fullscreen: hide toolbar/sidebar, manuscript only, Escape to exit, dark/light toggle. Delivers P0 #3 fix. |

### 2.2 Publishing & service requests (core product)

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **6** | Publishing flow — Service request popup | Story 7.3 (Metadata) / new | Modal: ISBN (optional), Category (prefill), Keywords (required), Acknowledgments/Education (review). Remove Copyright, Publisher. CTA: "Send publishing request". Warning re NGANDIWEB + no edit while active. Create `service_request` → admin queue. |
| **10** | Marketplace redesign (subscription) | Story 5.1 / 5.3 | Top banner: subscription CTA. Services: Publishing, ISBN, Author Website, etc. Each opens same-style popup as #6 → service request. |
| **11** | ISBN registration flow | Story 5.2 | Popup: manuscript selector, author name, category. "Send request" → service request. |
| **12** | Service forms (Author Website, Marketing, Social, etc.) | New stories | Per-service popup (e.g. domain, design, platforms). All → service request. |
| **20** | **Sync & state (manuscript ↔ service)** | **Cross‑epic** | **Key architecture.** Link `service_request` to `manuscript_id`. Manuscript UI: show "Publishing request submitted", status, "Cancel request". Lock editing while active; prevent duplicate requests. |

**Dependencies:** #6, #10, #11, #12 all feed into **#20**. #20 blocks "edit while request active" and "My Orders" consistency.

### 2.3 My Orders & notifications

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **13** | My Orders / Service tracking | Story 5.3, `dashboard/orders` | List requests, status (submitted → in progress → done). Stage transitions, status badge. **Email on status change.** |
| **19** | Clarify AI tokens display | Story 3.3 / dashboard | Tooltip/help: what tokens are, balance, usage per feature, decrease on use. Optional: purchase more. |

### 2.4 Check Consistency enhancement

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **7** | Check consistency — suggestions, character/story consistency | Story 3.1 / 3.2 | Add writing suggestions (grammar, style, tone), character consistency, plot/timeline consistency. Sidebar or expandable UI. |

### 2.5 Image upload & generation

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **8** | Image upload + AI image generation in manuscript | Story 5.9 (AI cover) / new | Upload/insert images + "generate from context" (e.g. cover, scene). Toolbar button → upload **or** AI modal. |

### 2.6 Admin portal

| # | Item | Map to | Notes |
|---|------|--------|-------|
| **14** | Admin — User & manuscript viewing | Story 4.5, 4.x | Remove manuscript **editing** from admin. Add user list → per user: manuscripts (read-only). View only, no edit. |
| **15** | Admin — Orders / service requests | Story 5.4 (Fulfillment) | All service requests, status, update status (submitted → in progress → done). Email customer from app. |
| **16** | Admin — Blog view | Story 6.3 / new | Pull from WordPress; list user blogs (who, when, title, link). |
| **17** | Admin — Notifications bell | Story 4.6 / new | Navbar bell: new requests, order updates, support. Fix if broken/hanging. |
| **18** | Admin — User CRUD | Story 4.5 / new | Add/invite user, delete, edit roles. |

**Dependencies:** #15 depends on #6, #10, #11, #12 (service requests). #14, #17, #18 can proceed in parallel.

---

## 3. P2 — Polish & Future

| # | Item | When |
|---|------|------|
| **21** | Login/UI improvements | After P0 + P1 stable. Social login, passwordless, etc. |
| **22** | Marketplace subscription messaging | When business model finalised (see Questions). |

---

## 4. Implementation Notes (from bearing-todo)

- **Service request workflow:** User submits form → `service_request` (e.g. `manuscript_id`, `service_type`, `form_data`, `status`, `user_id`) → Admin queue → status updates → user sees in My Orders + email.
- **Sync pattern:** Manuscript has `linked_service_requests`; request has `manuscript_id`. Editor checks active requests → banner + lock or "Cancel request".
- **Admin structure:** Users (view, CRUD) → manuscripts (read-only), Orders (all requests, status, email), Blog (WordPress), Settings, Support.

---

## 5. Suggested story/epic mapping

| Epic | Stories | Bearing-todo items |
|------|---------|--------------------|
| **P0 bugfixes** | `p0-1` Export, `p0-2` Autosave, `p0-3` Zen, `p0-4` Admin login | #1–4 |
| **Epic 2** | 2.1 (autosave, Zen replacement), 2.4 (export) | #2, #3, #1 |
| **Epic 3** | 3.1/3.2 (consistency), 3.3 (tokens) | #7, #19 |
| **Epic 4** | 4.5 (admin users), 4.6 (notifications), new admin stories | #14, #17, #18 |
| **Epic 5** | 5.1, 5.2, 5.3, 5.4, 5.9 + new | #5, #8, #10, #11, #12, #13, #15 |
| **Epic 6** | 6.3 + WordPress integration | #16 |
| **Epic 7** | 7.3 + publishing popup | #6 |
| **New** | Manuscript–service sync | #20 |

---

## 6. Risks & dependencies

1. **#20 (sync)** blocks correct behaviour for #6, #10, #11, #12 and My Orders. Design DB schema and app logic early.
2. **WordPress (Blog)** — #16 assumes API/credentials. Confirm with client (see Questions).
3. **Image model** — #8 requires chosen model (DALL·E, etc.). Clarify before implementation.
4. **Subscription model** — #10, #22 depend on "$X/month" vs "pay-per-service". Affects UX and copy.

---

## 7. Client follow-up (from bearing-todo)

1. Subscription: $X/month all-in vs pay-per-service?  
2. Fulfillment: Who fulfils services (internal, third-party, automated)?  
3. Image generation: Which AI model?  
4. Blog: Existing WordPress? API credentials?  
5. AI tokens: Mapping to features? Can users buy more?  
6. Admin notifications: Which events trigger notifications?

---

## 8. Next actions

1. **Immediate:** Create P0 bugfix stories (`p0-1`…`p0-4` or single `story-p0-fixes`), prioritise Export + Admin login.  
2. **Short-term:** Implement #9 (fullscreen) to resolve Zen; #5 (2FA move); #4 (admin maintenance gating).  
3. **Sprint planning:** Add P1 items to backlog; order by dependencies (#20 before full rollout of #6, #10, #11, #12).  
4. **Documentation:** Update `docs/sprint-status.yaml` and `_bmad-output/bmm-workflow-status.yaml` when new stories are created and scheduled.

---

**Last updated:** 2026-01-22  
**Owner:** Ryan Balungeli & NGANDIWEB Dev Team
