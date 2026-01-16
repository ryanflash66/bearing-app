# Epic 6: Blog & Content Platform

**Goal:** Empower authors to build their audience (Blog) and establish their public presence directly from the platform.

## Scope
This Epic focuses on the "Marketing" and "Audience" phase of the book lifecycle.
*   **Author Blog:** A CMS for authors to write and publish posts.
*   **Public Profile:** A reader-facing view of the author's bio and blog.
*   **Admin Moderation:** Safety and quality control for public content.

## Functional Requirements Covered
*   **Blog Module (PRD 9)**: Create, Edit, Publish posts.
*   **Reader Platform (PRD 9)**: Public visibility of published content.
*   **Admin Governance (PRD 10)**: Ability to take down offensive blogs.

## Non-Functional Requirements
*   **SEO**: Public blog pages must be SSR with proper metadata.
*   **Safety**: All user-generated content must pass safety filters.
*   **Isolation**: Reader views must NOT have access to internal app APIs.

## User Stories Overview
*   **Story 6.1: Blog Management (CMS)**: The author's dashboard for posts.
*   **Story 6.2: Public Author Profile/Blog**: The next.js pages for outside readers.
*   **Story 6.3: Admin Blog Moderation**: The Trust & Safety workflow.
