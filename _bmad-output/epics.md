---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['PRD-The-Bearing-platform.txt', 'planning-artifacts/architecture.md', 'ux-design-specification.md']
---

# Bearing App - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Bearing App, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-01: **Authentication**: Email + password authentication, MFA option, Password reset flow, Secure session management (PRD 4.1)
FR-02: **User Profiles**: Account profile management (PRD 4.1)
FR-03: **Author Dashboard**: Central hub showing books, services, orders, tickets, blog posts (PRD 5.1)
FR-04: **Manuscript Ingest**: Upload DOCX, PDF, TXT, Markdown; extract text (PRD 5.2.1)
FR-05: **Manuscript Editor**: Full interactive editor, Chapters view, Version history, Revert capability (PRD 5.2.2)
FR-06: **Autosave**: Autosave every 3 seconds (PRD 5.2.2)
FR-07: **AI Writing Assistant**: Real-time suggestions (clarity, grammar, tone, rephrasing, expanding) (PRD 5.2.3)
FR-08: **AI Manuscript Consistency**: Check character consistency, plot logic, timeline, tone (PRD 5.2.4)
FR-09: **Secure Storage**: All manuscripts stored securely, no duplicate uploads (PRD 5.3)
FR-10: **ISBN Purchase**: Integrated workflow to buy ISBNs (PRD 7.1)
FR-11: **Service Marketplace**: Request professional services (Cover, Editing, Website, Marketing) (PRD 7.2)
FR-12: **Support System**: In-app support inbox, messaging with admins (PRD 7.3)
FR-13: **AI Cover Design**: Generate cover concepts from book details (PRD 8)
FR-14: **Blog Module**: Authors can write, schedule, and publish blog posts to reader platform (PRD 9)
FR-15: **Admin Dashboard**: View all manuscripts, manage users, track ISBNs/Services, AI analytics, Blog moderation (PRD 10)
FR-16: **Usage Metering**: Track tokens/checks, enforce caps (Architecture 5.4, PRD 15)

### NonFunctional Requirements

NFR-01: **Security**: All data encrypted at rest and in transit (PRD 4.2, 13)
NFR-02: **Privacy**: Strong permission boundaries (Author vs Admin vs Support) (PRD 5.3)
NFR-03: **Usability**: UI must be clean, modern, and extremely intuitive (PRD 5.1)
NFR-04: **Reliability**: System uptime ≥ 99%, No lost work (PRD 15)
NFR-05: **Performance**: Seamless navigation, minimal clicks (PRD 11)
NFR-06: **Mobile**: Mobile-friendly layout (PRD 11)
NFR-07: **Tech Stack**: Next.js, Node/NestJS, Vercel infra (PRD 12)
NFR-08: **AI Quality**: Base model fine-tuned, Safety filters (PRD 6.1)

### Additional Requirements

**From Architecture:**
- AR-01: **Infrastructure**: Backend on Vercel (Serverless/Edge) with Modal for heavy lifting; Service-Role for background tasks.
- AR-02: **Database**: Supabase (Postgres + Auth + RLS). Strict RLS for all account-scoped tables.
- AR-03: **AI Provider**: Modal.com (Llama 8B) for suggestions; Google Gemini for consistency checks.
- AR-04: **Async Processing**: Heavy tasks (consistency, exports) must be async (Queues/Workers).
- AR-05: **Storage**: Cloudflare R2 for binary files (uploads, exports).
- AR-06: **Billing**: Immutable usage records. Linear cost scaling.
- AR-07: **Roles**: Strict separation of Author, Admin, Support.

**From UX:**
- UR-01: **Visuals**: "Modern Clean" theme (#FDF7E9 background optional, focus on clean typography).
- UR-02: **Interactions**: "Ghost Text" for AI suggestions (SF Mono).
- UR-03: **Consistency UI**: "Clarity Hub" with visual badges for issues.
- UR-04: **Feedback**: 3s Autosave visual heartbeat.
- UR-05: **Navigation**: "Binder" sidebar (Ulysses-style).

### FR Coverage Map

- **Epic 1**: FR-01, FR-02, FR-09, NFR-01, NFR-02, AR-02, AR-07
- **Epic 2**: FR-03, FR-04, FR-05, FR-06, NFR-03, NFR-04, NFR-05, UR-01, UR-05
- **Epic 3**: FR-07, FR-08, FR-16, NFR-08, AR-03, AR-04, AR-06, UR-02, UR-03
- **Epic 4**: FR-12, FR-15, NFR-02, AR-07, NFR-06
- **Epic 5**: FR-10, FR-11
- **Epic 6**: FR-13, FR-14

## Epic List

### Epic 1: Foundation & Identity
**Goal:** Establish secure access, identity management, and the reliable infrastructure layer required for all subsequent features.
**FRs covered:** FR-01 (Auth), FR-02 (Profiles), FR-09 (Secure Storage)

### Epic 2: Core Writing Studio
**Goal:** Deliver the primary value proposition—a distraction-free, reliable writing environment where authors can create and manage their work.
**FRs covered:** FR-03 (Dashboard), FR-04 (Ingest), FR-05 (Editor), FR-06 (Autosave)

### Epic 3: AI Intelligence Layer
**Goal:** Empower authors with the "Smart Companion"—real-time suggestions and deep narrative analysis, strictly metered for cost control.
**FRs covered:** FR-07 (Llama Suggestions), FR-08 (Consistency Checks), FR-16 (Usage Metering)

### Epic 4: Support & Admin Architecture (Emergency Rework Focus)
**Goal:** Establish a high-trust support ecosystem with robust ticketing, distinct admin roles, and deep visibility for operations.
**FRs covered:** FR-12 (Support System), FR-15 (Admin Dashboard), NFR-02 (Role Separation)

### Epic 5: Services & Monetization
**Goal:** Enable revenue generation through seamless ISBN purchases and professional service requests, while phasing in intelligence upgrades like dictation and custom models as secondary priorities.
**FRs covered:** FR-10 (ISBN), FR-11 (Service Marketplace), FR-13 (AI Covers - partially moved)

### Epic 6: Creative Expansion
**Goal:** Provide authors with marketing assets (AI Covers) and audience-building tools (Blogs).
**FRs covered:** FR-13 (AI Covers), FR-14 (Blog Module)

## Epic 1: Foundation & Identity

**Goal:** Establish secure access, identity management, and the reliable infrastructure layer required for all subsequent features, ensuring strict role separation and data privacy from day one.

### Story 1.1: Secure Authentication Setup
As a new author,
I want to sign up and log in securely using email and password,
So that I can access the platform while knowing my account is protected.
**Acceptance Criteria:**
**Given** a visitor on the signup page
**When** they enter valid credentials
**Then** a Supabase Auth user is created and a verification email is sent
**And** they are redirected to a generic dashboard upon successful login
**And** MFA setup is available in settings (FR-01)

### Story 1.2: Profile & Role Architecture
As a System Architect,
I want to define strict roles (Author, Support, Admin) in the database,
So that RLS policies can enforce granular access control immediately.
**Acceptance Criteria:**
**Given** the database schema
**When** the `profiles` table is created
**Then** it includes a locked `role` column defaulting to 'Author'
**And** RLS policies prevent users from modifying their own role
**And** Users can update their 'Pen Name' and Bio (FR-02, AR-07)

### Story 1.3: Secure Manuscript Storage Infrastructure
As a Backend Engineer,
I want to configure Cloudflare R2 and Postgres RLS for manuscript data,
So that user content is encrypted at rest and totally isolated from other tenants.
**Acceptance Criteria:**
**Given** a deployed environment
**When** a manuscript record is created
**Then** it is linked strictly to the `account_id`
**And** RLS policies deny read access to any user not in that account
**And** R2 buckets are configured with private access only (FR-09, NFR-02)

## Epic 2: Core Writing Studio

**Goal:** Deliver the primary value proposition—a distraction-free, reliable writing environment where authors can create and manage their work without fear of data loss.

### Story 2.1: Author Dashboard & Manuscript List
As an author,
I want to see all my active book projects in one clean dashboard,
So that I can quickly resume writing where I left off.
**Acceptance Criteria:**
**Given** an authenticated author
**When** they visit the home dashboard
**Then** they see a grid of their manuscripts with progress bars
**And** clicking a cover opens the Editor (FR-03)

### Story 2.2: Manuscript Ingest (Drop-to-Draft)
As an author,
I want to drag and drop my existing DOCX file,
So that I don't have to copy-paste 50 chapters manually.
**Acceptance Criteria:**
**Given** a .docx file on the dashboard
**When** dropped into the upload zone
**Then** the server parses it, extracts text, and creates Chapter records
**And** the Binder sidebar populates with the correct hierarchy (FR-04)

### Story 2.3: "Modern Parchment" Editor
As an author,
I want a beautiful, distraction-free writing interface,
So that I can focus purely on my creative flow.
**Acceptance Criteria:**
**Given** the editor view
**When** loaded
**Then** the background is clean and font is Merriweather
**And** the UI controls fade out when I start typing (Zen Mode)
**And** the "Binder" sidebar lists all chapters (FR-05, UR-01, UR-05)

### Story 2.4: 3-Second Autosave Heartbeat
As an author,
I want my work to save automatically every few seconds,
So that I never lose a single sentence if my browser crashes.
**Acceptance Criteria:**
**Given** I am typing in the editor
**When** I pause for 3 seconds
**Then** the content is silently synced to the database
**And** a subtle visual indicator shows "Saved"
**And** dirty state management prevents navigating away with unsaved changes (FR-06, UR-04)

### Story 2.5: Version History & Revert
As an author,
I want to browse past versions of my chapter,
So that I can undo a bad rewrite with confidence.
**Acceptance Criteria:**
**Given** a chapter with edit history
**When** I open the "History" panel
**Then** I see timestamps of past saves
**And** clicking one previews the old text
**And** "Restore" overwrites the current content (FR-05)

## Epic 3: AI Intelligence Layer

**Goal:** Empower authors with the "Smart Companion"—real-time suggestions and deep narrative analysis, strictly metered for cost control.

### Story 3.1: Llama-Powered Ghost Text
As an author,
I want smart sentence completions to appear as "Ghost Text" while I type,
So that I can unblock my creative flow without changing tools.
**Acceptance Criteria:**
**Given** the editor is active
**When** I stop typing and wait
**Then** a Llama inference request is sent
**And** the suggestion appears in SF Mono font (Ghost Text)
**And** Pressing Tab accepts it; Esc dismisses it (FR-07, UR-02)

### Story 3.2: Async Consistency Check (Gemini)
As an author,
I want to run a deep analysis of my entire book,
So that I can find plot holes and character inconsistencies.
**Acceptance Criteria:**
**Given** a completed manuscript
**When** I click "Run Consistency Check"
**Then** a Gemini job is queued (Async)
**And** I can continue working while it runs
**And** I receive a notification when the report is ready (FR-08, AR-03, AR-04)

### Story 3.3: Clarity Hub (Report UI)
As an author,
I want to view consistency issues in a structured, actionable list,
So that I can fix them systematically.
**Acceptance Criteria:**
**Given** a completed Consistency Report
**When** I open the "Clarity Hub"
**Then** I see issues grouped by Character, Plot, and Tone
**And** Visual badges indicate severity
**And** Clicking an issue jumps to the text location (FR-08, UR-03)

### Story 3.4: Usage Metering & Hard Caps
As a Product Owner,
I want to track every AI token used and enforce monthly caps,
So that we never lose money on high-volume users.
**Acceptance Criteria:**
**Given** any AI request (Llama or Gemini)
**When** initiated
**Then** the system checks the user's remaining quota
**If** quota is sufficient, it proceeds and logs usage
**If** quota is exceeded, it blocks the request with an upgrade prompt (FR-16, AR-06)

## Epic 4: Support & Admin Architecture (Emergency Rework Focus)

**Goal:** Establish a high-trust support ecosystem with robust ticketing, distinct admin roles, and deep visibility for operations. **CRITICAL PRIORITY.**

### Story 4.1: Separate Support Role & RLS
As a Security Architect,
I want to ensure Support Agents cannot access private manuscripts or billing data,
So that user privacy is guaranteed even during support sessions.
**Acceptance Criteria:**
**Given** a user with 'Support' role
**When** they attempt to read the `manuscripts` table
**Then** RLS policies BLOCK access (0 rows returned)
**When** they read `support_tickets`
**Then** RLS policies ALLOW access to all tickets (FR-12, NFR-02, AR-07)

### Story 4.2: Support Ticket State Machine
As a Support Manager,
I want tickets to flow strictly through defined states (Open -> Pending -> Resolved),
So that no request ever gets lost.
**Acceptance Criteria:**
**Given** a ticket
**When** an agent replies, Status moves to 'Pending User'
**When** a user replies, Status moves to 'Pending Support'
**When** marked 'Resolved', it can be re-opened by a new user reply (FR-12)

### Story 4.3: In-App Support Inbox
As an author,
I want to chat with support directly inside the dashboard,
So that I don't have to check my email for updates.
**Acceptance Criteria:**
**Given** the Help section
**When** I create a ticket
**Then** a secure chat interface opens
**And** message history is preserved
**And** mobile layout works perfectly (FR-12, NFR-06)

### Story 4.4: Admin Dashboard (System View)
As a Super Admin,
I want a dashboard to see high-level system health and critical alerts,
So that I can monitor platform stability.
**Acceptance Criteria:**
**Given** a Super Admin user
**When** accessing the Admin Dashboard
**Then** they see Global User Count, Active Tickets, and AI Error Rates
**Then** they see Global User Count, Active Tickets, and AI Error Rates
**And** Support Agents CANNOT access this view (FR-15)

### Story 4.5: System Settings & Maintenance Mode
As a Super Admin,
I want to toggle maintenance mode and manage global system settings,
So that I can safely deploy updates or freeze the system during emergencies.
**Acceptance Criteria:**
**Given** the Super Admin Settings page
**When** checked
**Then** I can see a "Maintenance Mode" toggle
**And** toggling it blocks non-admin access to critical write operations
**And** a global banner is displayed to all active users
**And** Support Agents cannot access these settings

## Epic 5: Services & Monetization

**Goal:** Enable revenue generation through seamless ISBN purchases and professional service requests.

### Story 5.2: ISBN Purchase Workflow
As an author,
I want to buy an ISBN directly for my book,
So that I can publish professionally without leaving the platform.
**Acceptance Criteria:**
**Given** a manuscript ready for publishing
**When** I select "Buy ISBN"
**Then** a Stripe checkout session is initiated
**And** upon success, an ISBN is assigned to the book metadata (FR-10)

### Story 5.5: Cmd+K Commander Pattern
**Acceptance Criteria:**
**Given** the editor is active
**When** I press Cmd+K
**Then** the command palette appears with search, AI transformations, and navigation commands.

### Story 5.3: Order Management System
As an Admin,
I want to track and fulfill service requests,
So that we deliver promised services on time.
**Acceptance Criteria:**
**Given** a new Service Request
**When** submitted
**Then** it appears in the Admin Order Queue
**And** Admins can update status (In Progress, Delivered) (FR-11, FR-15)

## Epic 6: Creative Expansion

**Goal:** Provide authors with marketing assets (AI Covers) and audience-building tools (Blogs).

### Story 6.1: AI Cover Generator
As an author,
I want to generate book cover concepts using AI,
So that I can visualize my story packaging early on.
**Acceptance Criteria:**
**Given** a book with title and genre
**When** I run the Cover Generator
**Then** 4 distinct image variants are generated
**And** I can save my favorite to the book profile (FR-13)

### Story 6.2: Blog CMS Module
As an author,
I want to write and publish blog posts to my author page,
So that I can build an audience before my book launches.
**Acceptance Criteria:**
**Given** the Blog section
**When** I write a post
**Then** I can format it with the same rich editor used for books
**And** "Publish" makes it visible on the public reader platform (FR-14)

### Story 6.3: Public Author Profile
As a reader,
I want to view an author's public profile and blog,
So that I can discover their work and updates.
**Acceptance Criteria:**
**Given** a public author URL
**When** visited
**Then** I see their bio, published books, and blog posts
**And** the page is SEO optimized (FR-14)
