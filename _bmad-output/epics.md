---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/prd.md', 'docs/prd-epic-4.md', 'docs/architecture.md', 'docs/ux-design-specification.md']
---

# Bearing App - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Bearing App, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-01: Email-based authentication with optional MFA (TOTP)
FR-02: Author profile management
FR-03: Account-level grouping of users
FR-04: Role-based access (Author, Admin, Support Agent, Super Admin) [UPDATED via Epic 4]
FR-05: Create, upload, and delete manuscripts
FR-06: Rich-text editor with autosave
FR-07: Version history with restore
FR-08: Secure private manuscript storage
FR-09: Export manuscripts to PDF and DOCX
FR-10: Context-limited real-time AI suggestions
FR-11: AI suggestions never auto-modify text
FR-12: Token tracking per suggestion
FR-13: Manual consistency check initiation
FR-14: Asynchronous execution
FR-15: Structured consistency reports
FR-16: Track AI tokens per author per billing period
FR-17: Track Gemini checks per author per billing period
FR-18: Immutable usage records per billing cycle
FR-19: Detect sustained over-usage (two cycles)
FR-20: Trigger upsell / overage workflow
FR-21: In-app support messaging (Robust Ticket System)
FR-22: Admin dashboard (Dual Views: System & Support)
FR-23: Admin override controls
FR-24: (New) Support Ticket State Machine (Draft -> Open -> Pending -> Resolved)
FR-25: (New) Admin/Support Rate Limiting & Audit Logs

### NonFunctional Requirements

NFR-01: Editor response <200ms P95
NFR-02: Llama suggestions <2s P95
NFR-03: Gemini checks <15s P95
NFR-04: Autosave ≤5s interval
NFR-05: 99.5% uptime (monthly)
NFR-06: Zero data loss tolerance
NFR-07: TLS 1.2+ everywhere
NFR-08: AES-256 encryption at rest
NFR-09: JWT-based auth
NFR-10: Strict Supabase RLS
NFR-11: Audit logs for AI runs, uploads, exports, and admin/support actions
NFR-12: Token estimation pre-execution
NFR-13: Token logging post-execution
NFR-14: Hard caps per request, author, account
NFR-15: Graceful failure on cap breach
NFR-16: <$70/month at 10 authors
NFR-17: <$300/month at 100 authors
NFR-18: (New) Support UI must pass accessibility tests (WCAG 2.1 AA)
NFR-19: (New) E2E Tests for Ticket Lifecycle Required
NFR-20: (New) Mobile/Safari Support for Support UI verified

### Additional Requirements

From Architecture:
- Serverless-first architecture using Next.js, Supabase, Modal, and Gemini
- "RPC First" approach for workspace features (Security)
- Separation of `super_admin` and `support_agent` roles (Security)
- Strict RLS Policies for Ticket visibility (User sees own, Support sees assigned/all, Super sees all)
- Scale usage, not idle capacity (Cost principle)

From UX Design:
- "Modern Parchment" aesthetic for all new components
- Persistent Ticket Detail Page (not just a modal)
- Mobile/Safari support for Support UI
- Accessibility compliance (WCAG 2.1 AA) for Support UI

### FR Coverage Map

FR-01: Epic 1 - Authentication
FR-02: Epic 1 - Profiles
FR-03: Epic 1 - Account Groups
FR-04: Epic 4 - Role Hierarchy (Super vs Support)
FR-05: Epic 2 - Manuscript CRUD
FR-06: Epic 2 - Rich Text Editor
FR-07: Epic 2 - Version History
FR-08: Epic 1 (Storage) & Epic 4 (Privacy for Support)
FR-09: Epic 2 - Export
FR-10: Epic 2 - AI Suggestions
FR-11: Epic 2 - Non-destructive AI
FR-12: Epic 2 - Suggestion Tokens
FR-13: Epic 3 - Consistency Check
FR-14: Epic 3 - Async Jobs
FR-15: Epic 3 - Reports
FR-16: Epic 2 - Usage Tracking
FR-17: Epic 3 - Check Tracking
FR-18: Epic 2 - Immutable Records
FR-19: Epic 4 - Usage Detection (in Admin Dash)
FR-20: Epic 4 - Upsell Triggers
FR-21: Epic 4 - Ticket System
FR-22: Epic 4 - Dashboards
FR-23: Epic 4 - Overrides
FR-24: Epic 4 - State Machine
FR-25: Epic 4 - Rate Limits

## Epic List

### Epic 1: Foundation & Auth
Establish secure access, account structure, and data isolation.
**FRs covered:** FR-01, FR-02, FR-03, FR-08 (Basic RLS), NFR-07, NFR-08, NFR-09, NFR-10

### Epic 2: Manuscript Editor & Llama AI
Deliver the core writing experience with non-destructive AI assistance.
**FRs covered:** FR-05, FR-06, FR-07, FR-09, FR-10, FR-11, FR-12, FR-16, FR-18

### Epic 3: Consistency Engine
Implement async, deep analysis with strict cost controls.
**FRs covered:** FR-13, FR-14, FR-15, FR-17, NFR-03, NFR-13, NFR-14

### Epic 4: Admin Infrastructure & Support System (Emergency Rework)
Establish a robust, high-trust support system with distinct admin roles, persistent ticket management, and deep accessibility.
**FRs covered:** FR-04 (Roles), FR-21 (Tickets), FR-22 (Dashboards), FR-23 (Overrides), FR-24 (State Machine), FR-25 (Audit/Rates), NFR-18, NFR-19, NFR-20

### Epic Hardening: Hardening & Stabilization
Ensure system robustness, security, and performance.
**Status:** In Progress

## Epic 1: Foundation & Auth

Establish secure access, account structure, and data isolation.

### Story 1.1: Email + MFA Authentication

As a new author,
I want to sign up securely, log in with email/password, and optionally enable MFA,
So that my account is protected from unauthorized access.

**Acceptance Criteria:**

**Given** a new user visits the signup page
**When** they submit a valid email and password
**Then** an account is created and a verification email is sent
**And** they cannot access protected routes until email verification is complete

**Given** an existing user logs in
**When** they provide valid credentials and have MFA enabled
**Then** they must enter a valid TOTP code before access is granted
**And** 5 failed attempts locks the account for 15 minutes

**Given** a user forgets their password
**When** they request a reset
**Then** a secure link with 1-hour expiry is sent to their verified email

### Story 1.2: Author Profiles

As an author,
I want to manage my profile and pen name preferences,
So that my published works display the correct attribution.

**Acceptance Criteria:**

**Given** an authenticated user
**When** they update their display name or bio
**Then** the changes persist to the database immediately

**Given** a user has set a pen name
**When** they export a manuscript
**Then** the pen name is used in the metadata instead of their legal name

**Given** a profile has multiple fields
**When** another user queries the API (if public profiles enabled later)
**Then** strict RLS policies prevent exposure of private fields (email, phone)

### Story 1.3: Account & Role Management

As an administrator,
I want to assign roles (Author, Admin) and enforce permissions,
So that users can only access features appropriate for their level.

**Acceptance Criteria:**

**Given** an admin user
**When** they access the backend dashboard route
**Then** their role is verified via JWT claims and access is granted

**Given** a standard author user
**When** they attempt to access any /admin route
**Then** a 403 Forbidden error is returned and the incident logged

**Given** a role change assignment
**When** saved to the database
**Then** RLS policies immediately reflect the new permissions (e.g., admin visibility)

**Given** a sensitive admin action
**When** performed
**Then** an immutable audit log entry is created with user ID and timestamp

### Story 1.4: Secure Storage & RLS

As a system architect,
I want to enforce data privacy at the database level using Row-Level Security,
So that no bug in the application code can ever leak one user's data to another.

**Acceptance Criteria:**

**Given** User A has 5 manuscripts and User B has 3
**When** User B queries the manuscripts table via API
**Then** they receive ONLY their 3 rows (strict RLS filtering)

**Given** a system administrator
**When** they query the manuscripts table
**Then** they can see all rows via a specific admin bypass policy (using `admin` role)

**Given** data storage
**When** idle
**Then** data is encrypted at rest (AES-256) via Supabase encryption

**Given** any API request
**When** transmitted over the network
**Then** TLS 1.2+ is strictly enforced (reject non-HTTPS)

## Epic 2: Manuscript Editor & Llama AI

Deliver the core writing experience with non-destructive AI assistance.

### Story 2.1: Manuscript CRUD + Autosave

As an author,
I want to create and edit manuscripts with automatic saving,
So that I never lose my work due to a browser crash or network issue.

**Acceptance Criteria:**

**Given** an author typing in the editor
**When** 5 seconds elapse without saving
**Then** the changes are automatically persisted to the database

**Given** a network disconnection during editing
**When** the connection is restored
**Then** the editor resyncs the latest local version without conflict

**Given** a soft delete request
**When** confirmed by the user
**Then** the manuscript is marked deleted but recoverable for 30 days

**Given** a large manuscript (1M+ chars)
**When** autosave triggers
**Then** the operation completes in the background without UI lagginess

### Story 2.2: Version History

As an author,
I want to view and restore previous versions of my manuscript,
So that I can experiment with changes without fear of breaking my story.

**Acceptance Criteria:**

**Given** a manuscript with multiple edits
**When** opening version history
**Then** a chronological list of save points is displayed with timestamps

**Given** an older version selected
**When** clicking "Restore"
**Then** the content reverts to that version AND the previous state is saved as a new version history point

**Given** a history list with 30+ items
**When** scrolling
**Then** the list uses virtualization/pagination to remain performant

### Story 2.3: Real-Time Llama Suggestions

As an author,
I want to request AI continuations or suggestions for my selected text,
So that I can overcome writer's block or improve my phrasing.

**Acceptance Criteria:**

**Given** text selection in the editor
**When** clicking "Suggest"
**Then** AI output streams inline within 2 seconds

**Given** an AI suggestion is displayed
**When** not explicitly applied by the user
**Then** the original text remains unchanged (non-destructive)

**Given** a suggestion response
**When** confidence is low (<50%)
**Then** a visual indicator (beta/low confidence) is shown

**Given** a monthly usage cap reached
**When** suggest is clicked
**Then** a graceful error notifies the user to upgrade

### Story 2.4: Manuscript Export (PDF/DOCX)

As an author,
I want to export my manuscript to standard formats,
So that I can share it with beta readers or upload it for publishing.

**Acceptance Criteria:**

**Given** a completed manuscript
**When** selecting "Export PDF"
**Then** a properly formatted file downloads with title and chapters

**Given** rich text formatting (bold, italic)
**When** exported to DOCX
**Then** all formatting is preserved and editable in Word

**Given** a large export request
**When** processing
**Then** it completes within 10 seconds or shows a progress indicator

**Given** multiple versions
**When** exporting
**Then** the logic uses the specific version selected by the user (defaulting to latest)

### Story 2.5: AI Usage Metering

As a product owner,
I want to track token usage per author/request,
So that costs are transparent and usage caps can be enforced.

**Acceptance Criteria:**

**Given** an AI request (Llama or Gemini) initiation
**When** estimated tokens exceed the user's remaining cap
**Then** the request is rejected before execution

**Given** a completed AI request
**When** returned
**Then** actual token usage is logged to an immutable usage record

**Given** a billing cycle ends
**When** processing
**Then** usage records for that period are locked and cached for reporting

**Given** usage data
**When** querying via dashboard
**Then** aggregate stats are available per month per user

## Epic 3: Consistency Engine

Implement async, deep analysis with strict cost controls.

### Story 3.1: Manual Gemini Consistency Check

As an author,
I want to manually trigger a deep consistency check on my manuscript,
So that I can find plot holes and character inconsistencies.

**Acceptance Criteria:**

**Given** a loaded manuscript
**When** clicking "Check Consistency"
**Then** an asynchronous job starts and UI shows "Checking..." status

**Given** an async job completion
**When** finished
**Then** a structured result is stored and the user is notified

**Given** a check is running
**When** the author continues editing
**Then** the UI remains responsive (non-blocking)

**Given** a massive manuscript (>500k tokens)
**When** submitted
**Then** logic automatically chunks the request to respect model limits

### Story 3.2: Structured Consistency Reports

As an author,
I want to view issues grouped by category,
So that I can systematically fix narrative problems.

**Acceptance Criteria:**

**Given** a completed consistency report
**When** viewing
**Then** issues are categorized (Plot, Character, Tone)

**Given** a specific issue in the report
**When** clicked
**Then** the editor scrolls to the relevant paragraph in the manuscript

**Given** a clean manuscript
**When** report generated
**Then** a distinct "No Issues Found" state is shown

**Given** a large report (50+ issues)
**When** viewing list
**Then** rendering is virtualized for performance

## Epic 4: Admin Infrastructure & Support System (Emergency Rework)

Establish a robust, high-trust support system with distinct admin roles, persistent ticket management, and deep accessibility.

### Story 4.1: Admin Role Architecture (RBAC)

As a System Architect,
I want to separate the Super Admin and Support Agent roles with strict database constraints,
So that support staff can help users without accessing sensitive revenue data or private manuscripts.

**Acceptance Criteria:**

**Given** the users table
**When** migrated
**Then** a new `role` enum supports 'user', 'support_agent', 'super_admin'

**Given** a support_agent user
**When** attempting to query `manuscripts` content
**Then** RLS policy BLOCKS access (returns 0 rows or 403 error)

**Given** a support_agent user
**When** querying `tickets`
**Then** RLS policy ALLOWS access to all tickets assigned to them or unassigned

**Given** an 'RPC-First' strategy
**When** a support agent performs an action (e.g. reply)
**Then** it MUST go through a Secure Definer Function, not direct table manipulation

### Story 4.2: The Support Ticket Engine (State Machine)

As a Product Manager,
I want a formal state machine for support tickets (Open -> Pending -> Resolved),
So that no user request is ever lost in a 'void' state.

**Acceptance Criteria:**

**Given** a new ticket submission
**When** created
**Then** initial state is 'OPEN' and created_at timestamp is set

**Given** a support agent reply
**When** sent
**Then** state automatically transitions to 'PENDING_USER'

**Given** a user reply
**When** sent
**Then** state automatically transitions to 'PENDING_AGENT'

**Given** a ticket in 'RESOLVED' state
**When** a user replies
**Then** it automatically re-opens to 'PENDING_AGENT'

### Story 4.3: User Support Console (Frontend)

As a User,
I want a persistent "My Tickets" page with accessible inputs,
So that I can track my requests and type comfortably without UI bugs.

**Acceptance Criteria:**

**Given** the support page
**When** viewing inputs
**Then** they use standard browser focus/cursor behaviors (No invisible text bugs)

**Given** a list of past tickets
**When** clicked
**Then** user is taken to a Detail View showing the full conversation history

**Given** a mobile device (Safari iOS)
**When** typing in the support box
**Then** the UI respects the virtual keyboard and remains usable

**Given** accessibility audit
**When** verified
**Then** all inputs have proper labels and ARIA attributes (WCAG 2.1 AA)

### Story 4.4: Support Agent Dashboard

As a Support Agent,
I want a dedicated dashboard with a queue and user context snapshot,
So that I can resolve issues efficiently without asking basic questions.

**Acceptance Criteria:**

**Given** the agent dashboard
**When** viewing a ticket
**Then** a side panel shows the user's "Snapshot": Subscription Tier, Limit Status, Last Error Log

**Given** the ticket queue
**When** loaded
**Then** 'Stale' tickets (>48h) are visually highlighted (Red indicator)

**Given** sensitive user data
**When** agent views snapshot
**Then** PII (Billing Address, etc.) is masked or hidden

### Story 4.5: Super Admin Dashboard

As a Super Admin,
I want a high-level view of system health and override controls,
So that I can manage the business and handle emergencies.

**Acceptance Criteria:**

**Given** the super admin dashboard
**When** loaded
**Then** Global Metrics are shown: Total Token Burn, Active Users, Revenue Estimate

**Given** a user experiencing a bug
**When** super admin clicks "Override"
**Then** they can manually reset the user's Usage Limits or toggle their Plan

**Given** a system maintenance event
**When** needed
**Then** Super Admin can toggle "Maintenance Mode" to pause new job submissions

### Story 4.6: Critical Notification System

As an Operations Lead,
I want automated email triggers for ticket activity,
So that neither users nor agents have to manic-refresh the page to know there's an update.

**Acceptance Criteria:**

**Given** a new ticket created by a user
**When** submitted
**Then** an email is sent to the Support Team alias

**Given** an agent reply
**When** sent
**Then** an email notification is sent to the User with a link to the Ticket Detail page

**Given** email delivery failure
**When** detected
**Then** the failure is logged and the system retries (idempotency required)
