# Story 5.9: AI Cover Generator

**Description**
As an Author,
I want to generate visual cover concepts using AI,
So that I can visualize my book's brand or create a placeholder cover.

**Acceptance Criteria**
*   **Given** the "Cover Lab" page
    *   **When** inputting prompt (Title, Genre, Mood, Description)
    *   **Then** the "Generate" button becomes active.
*   **Given** Generate clicked
    *   **When** processing
    *   **Then** an async job calls Stable Diffusion (via Modal/API).
    *   **And** 4 variation images are returned within 15 seconds.
*   **Given** a selected image
    *   **When** clicked "Save to Manuscript"
    *   **Then** the image is uploaded to R2 and linked to the manuscript metadata.
*   **Given** safety filter trigger
    *   **When** prompt contains restricted words
    *   **Then** the request is blocked before API call with a polite error.

**Effort:** 24h
**Dependencies:** Epic 2 (Manuscript), Modal API
**Status:** Planned
