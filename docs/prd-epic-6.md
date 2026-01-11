# Epic 6: Creative Tools (AI Covers & Blog)

**Goal:** empower authors to generate release-ready assets (Covers) and build their audience (Blog) directly from the platform.

## Scope
This Epic focuses on the "Output" and "Marketing" phase of the book lifecycle.
*   **AI Cover Designer:** A generative tool for creating book covers.
*   **Author Blog:** A CMS for authors to write and publish posts.
*   **Public Profile:** A reader-facing view of the author's bio and blog.
*   **Admin Moderation:** Safety and quality control for public content.

## Functional Requirements Covered
*   **AI Cover Design Module (PRD 8)**: Input prompts -> multiple outputs -> selection.
*   **Blog Module (PRD 9)**: Create, Edit, Publish posts.
*   **Reader Platform (PRD 9)**: Public visibility of published content.
*   **Admin Governance (PRD 10)**: Ability to take down offensive blogs.

## Non-Functional Requirements
*   **Generation Speed**: Cover generation < 15s.
*   **SEO**: Public blog pages must be SSR with proper metadata.
*   **Safety**: All AI prompts/outputs must pass safety filters.
*   **Isolation**: Reader views must NOT have access to internal app APIs.

## User Stories Overview
*   **Story 6.1: AI Cover Generator**: Stable Diffusion/DALL-E integration.
*   **Story 6.2: Blog Management (CMS)**: The author's dashboard for posts.
*   **Story 6.3: Public Author Profile/Blog**: The next.js pages for outside readers.
*   **Story 6.4: Admin Blog Moderation**: The Trust & Safety workflow.
