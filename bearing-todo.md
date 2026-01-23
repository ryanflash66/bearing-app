# The Bearing — Client Feedback TODO List
**Date:** January 22, 2026  
**Status:** Extracted from client walkthrough recordings (2 transcripts cross-checked)  
**Priority Levels:** P0 (Critical bugs), P1 (Required features), P2 (Polish/future)  
**Epic:** These items are isolated in **Epic 8** — see `docs/prd-epic-8.md`, `_bmad-output/bearing-todo-plan.md`, and `docs/sprint-status.yaml` (epic-8, stories 8.1–8.22).

---

## P0 — Critical Bugs (Fix ASAP)

### 1. Export Broken
- **Location:** Manuscript → Export  
- **Issue:** Clicking export errors with "Failed to download the file"  
- **Impact:** Users cannot export their manuscripts  
- **Fix:** Debug download endpoint; verify file generation and CORS headers  

### 2. Autosave Stuck in Loop
- **Location:** Manuscript editor  
- **Issue:** "Save failed" message appears repeatedly and UI stays stuck retrying; never recovers  
- **Impact:** Users cannot reliably save work; editor appears frozen  
- **Fix:** Add exponential backoff to retry logic; show a "manual save" button as fallback; log errors  

### 3. Zen Mode Breaks Editor
- **Location:** Manuscript editor → Zen mode button  
- **Issue:** Enabling Zen mode makes the editor unclickable; shows "Error saving" repeatedly  
- **Impact:** Users cannot interact with the editor once Zen mode is enabled  
- **Fix:** Replace with simple fullscreen view (see P1 below); remove current broken implementation  

### 4. Admin Login Landing Page Broken
- **Location:** Admin portal  
- **Issue:** After successful login, shows "System is under maintenance. Please try again later" instead of loading admin dashboard  
- **Impact:** Admin cannot access the admin portal at all  
- **Fix:** Remove/comment out maintenance banner OR fix the gating logic; ensure auth redirects to proper admin route  

---

## P1 — Required Features (Implement Before MVP)

### 5. Move 2FA to Settings
- **Location:** Dashboard → Security settings  
- **What:** Move "Enable two-factor authentication" security card from dashboard to Settings page  
- **Why:** Client likes the feature but it clogs the dashboard; belongs in Settings  
- **Implementation:** Move the 2FA card/component; ensure it's accessible in Settings → Security  

### 6. Publishing Flow — Service Request Popup
- **Location:** Manuscript → Publishing tab  
- **Current:** Unknown/partially implemented  
- **Desired:** Click "Publishing" → opens modal/popup form with these fields:
  - **ISBN:** Optional (allow blank)  
  - **Category:** Prefilled from manuscript metadata  
  - **Keywords:** Required; what the book should be identified as  
  - **Acknowledgments:** Already captured; confirm/review  
  - **Education level:** Already captured; confirm/review  
  - **Remove:** Copyright field, Publisher name field (client says not needed)  
- **CTA Button:** Rename "Save changes" → "Send publishing request"  
- **Warning Text:** "Before you publish this book, your manuscript will be sent to NGANDIWEB for publishing. You cannot edit this manuscript while the request is active."  
- **On Submit:** Create a service request (same way Marketplace does) and send to admin queue  

### 7. Manuscript → Check Consistency Enhancement
- **Location:** Manuscript editor  
- **Current:** Static field  
- **Desired:** When "Check consistency" is triggered:
  - Provide **writing suggestions** (grammar, style, tone)  
  - Check **character consistency** (are character names/traits consistent throughout?)  
  - Check **story/plot consistency** (timeline, continuity issues)  
  - Display suggestions in a sidebar or expandable section  

### 8. Image Upload in Manuscript
- **Location:** Manuscript editor  
- **What:** 
  - Allow users to upload/insert images into the manuscript content (similar to Google Docs)  
  - Allow using an image generation model to create images from manuscript context (e.g., "generate cover art" or "generate scene illustrations")  
- **Implementation:** Add image toolbar button → file upload OR AI image generation modal  

### 9. Zen Mode → Fullscreen View
- **Location:** Manuscript editor  
- **Replace:** Current broken Zen mode  
- **With:** Simple fullscreen writing mode:
  - Hide all UI chrome (toolbar, sidebar)  
  - Show manuscript text only (like iA Writer or Bear)  
  - Escape/fullscreen button to exit  
  - Background: dark or light mode toggle  

### 10. Marketplace Redesign (Subscription Model)
- **Location:** Marketplace page  
- **Current:** Shows list of services like a product catalog  
- **Desired:** 
  - Top banner: "Monthly Subscription" CTA or info (client mentioned this will be a subscription model)  
  - Services section: Show available services (Publishing, ISBN, Author Website, Marketing Package, Social Media Launch, etc.)  
  - Each service can be clicked to open the same popup form used in Manuscript (e.g., "Publish your book" → same Publishing popup from Manuscript)  
  - All popups should send service requests to admin queue  

### 11. ISBN Registration Flow
- **Location:** Marketplace → ISBN tile (or Manuscript → ISBN section)  
- **What:** Popup form with:
  - **Manuscript:** Dropdown/selector to load existing manuscript from dashboard (OR upload new)  
  - **Author name:** Text input  
  - **Category:** Dropdown (auto-populated from manuscript)  
  - **CTA:** "Send request"  
- **On Submit:** Create service request for admin  

### 12. Service Submission Forms (Author Website, Marketing, Social Launch, etc.)
- **Location:** Marketplace  
- **What:** Each service (author website, marketing package, social media launch, etc.) should have a popup form asking relevant questions  
  - E.g., "Author Website" → asks for domain name, design preferences, content sections, etc.  
  - "Marketing Package" → asks for target audience, budget, timeline, platforms, etc.  
  - "Social Media Launch" → asks for which platforms, content style, posting frequency, etc.  
- **On Submit:** Create service request for admin (who then delivers the service)  

### 13. My Orders / Service Tracking
- **Location:** Dashboard / Navigation  
- **What:** Show all service requests the user has made, with status tracking:
  - Request created (submitted)  
  - In progress (admin is working)  
  - Done/Published (completed)  
  - Ability to see stage transitions: "Moved from stage A → stage B → published"  
  - Show current status badge for each order  
- **Email Notifications:** User receives email when order status changes  

### 14. Admin Portal — User & Manuscript Viewing
- **Location:** Admin site → Users section  
- **What:** 
  - Remove "Manuscript" writing/editing from admin nav (admins don't write manuscripts)  
  - Add ability to view all users  
  - For each user, view all their manuscripts (read-only)  
  - Admins can inspect content but cannot write or edit manuscripts  

### 15. Admin Portal — Orders/Service Requests Management
- **Location:** Admin site → Marketplace/Orders section  
- **What:** 
  - Show all service requests from users (Publishing, ISBN, Author Website, Marketing, etc.)  
  - Display service request details and current status  
  - Admin can **update status** (e.g., "submitted" → "in progress" → "done")  
  - Admin can **directly email the customer** from the app (template or compose)  
  - Track which user made the request and which service  

### 16. Admin Portal — Blog View
- **Location:** Admin site → Blog section  
- **What:** 
  - Display all blogs published by users  
  - Pull data from WordPress (client's WordPress blog instance)  
  - Admin can view and track user blog publications  
  - Show user who published, publish date, title, link  

### 17. Admin Portal — Notifications Bell
- **Location:** Admin site → Top navbar  
- **What:** 
  - Display notifications for new service requests, order status updates, support tickets, etc.  
  - Ensure notifications are functional and not broken/hanging  

### 18. Admin Portal — User Management (CRUD)
- **Location:** Admin site → Users/Admin section  
- **What:** 
  - Add user (invite/create new user)  
  - Delete user  
  - Edit user roles/permissions  
  - Basic CRUD operations  

### 19. Clarify AI Tokens Display
- **Location:** Dashboard / User profile  
- **What:** 
  - Explain what "AI tokens" are in the UI (tooltip or help text)  
  - Show current token balance  
  - Show how tokens are used (per feature/service)  
  - Show how tokens decrease as user generates content (writing suggestions, images, etc.)  
  - Optional: Allow users to purchase more tokens  

### 20. Synchronization & State Management (Biggest Requirement)
- **Location:** Entire platform  
- **What:** Services and manuscripts must be synchronized:
  - **When a user requests a service** (e.g., Publishing), that service request is **linked to the manuscript**  
  - **When viewing a manuscript**, the user can see:
    - "Publishing request already submitted for this book"  
    - Status: "Pending admin review" or "In progress" or "Done"  
  - **If editing a manuscript with an active service request**:
    - Show warning: "Publishing request is active. You must disallow this request before editing."  
    - Option to "Disallow publishing request" (cancel it)  
    - After cancel, user can re-edit and resubmit  
  - **Prevent duplicate requests**: User cannot submit a new service request for the same manuscript while one is already active (must cancel first)  
  - **Enforce workflow**: User → Request service → Manuscript locked (read-only or warning) → Admin completes → User unlocked  
- **Implementation:** Store service request state in database, linked to manuscript ID; check state when rendering manuscript editor  

---

## P2 — Polish & Future Work

### 21. Login/UI Improvements
- **What:** Client mentioned wanting to improve login page design and general UI/UX  
- **When:** After core functionality is working  
- **Scope:** Make UI more intuitive; consider modern auth patterns (social login, passwordless, etc.)  

### 22. Marketplace Subscription Messaging
- **Location:** Marketplace page  
- **What:** Add clear messaging about the subscription model (e.g., "$X/month for all services" or "Pay-per-service")  
- **Depends on:** Business model finalization with client  

---

## Implementation Notes

### Service Request Workflow (Key Architecture)
1. User clicks "Publishing" → Opens popup form  
2. User fills form → Clicks "Send request"  
3. App creates **service_request** record in DB:
   - `manuscript_id`  
   - `service_type` (publishing, isbn, author_website, etc.)  
   - `form_data` (ISBN, category, keywords, etc.)  
   - `status` (submitted)  
   - `created_at`  
   - `user_id`  
4. Request appears in Admin → Orders section  
5. Admin reviews, updates status to "in progress" or "done"  
6. User sees status in My Orders & gets email notification  
7. Manuscript shows linked service request (cannot edit while active)  

### Synchronization Pattern
- **Manuscript entity** has `linked_service_requests` (array of service request IDs)  
- **Service request entity** has `manuscript_id` (back-reference)  
- When rendering manuscript editor, check for active service requests  
- If active, show banner: "This manuscript has an active [Publishing] request. [Cancel request]"  
- Disable/lock editing until request is canceled  

### Admin Portal Structure
```
Admin Dashboard
├── Users (view all, CRUD)
│   └── [User detail] → see their manuscripts, orders, activity
├── Orders/Services (all service requests)
│   ├── [Order detail] → status, form data, email customer
│   └── Update status → "submitted" / "in progress" / "done"
├── Blog (pull from WordPress)
├── Settings (admin configuration)
└── Support (if applicable)
```

### Blog Integration
- Query WordPress API or database for published blogs by users  
- Display in Admin → Blog section  
- Could later sync blog posts back to user dashboard  

---

## Questions for Client Follow-up
1. **Subscription model details:** Is Marketplace a $X/month all-you-can-use, or pay-per-service?  
2. **Fulfillment process:** Who fulfills services? Internal NGANDIWEB team, third parties, or automated?  
3. **Image generation model:** Which AI model to use for image generation (DALL-E, Stable Diffusion, etc.)?  
4. **Blog WordPress instance:** Is there an existing WordPress blog? API credentials available?  
5. **AI tokens pricing:** How do tokens map to features? Can users buy more?  
6. **Admin notification triggers:** What events should trigger admin notifications (new request, deadline approaching, etc.)?  

---

## Done ✅
- Dashboard moved to "access the app" (no major changes planned)  
- Settings / Support sections as-is  
- Blog publishes to WordPress (confirmed)  
- Export feature (will be fixed, P0)  
- Check consistency → enhanced (P1)  

---

**Last Updated:** January 22, 2026  
**Owner:** Ryan Balungeli & NGANDIWEB Dev Team
