# Story 5.9: AI Cover Generator

Status: done

## Story

As an **Author**,
I want **to generate visual cover concepts using AI based on my book's metadata**,
so that **I can visualize my packaging or create a placeholder cover for my coming soon page**.

## Architecture

**Model**: Vertex AI Imagen 4.0 (no fine-tuning - prompt engineering only)
**Worker**: Modal.com `generate_book_asset` — async worker that calls Vertex AI, streams to R2, updates Supabase
**Storage**: Cloudflare R2 (temporary grid + permanent selected covers)
**Job Tracking**: Supabase `cover_jobs` table
**Gallery**: Supabase `gallery_assets` table

> **Clarification**: Modal does **not** replace Vertex AI. Modal is used purely as a long-running async worker to: (1) call Vertex Imagen, (2) handle retries and quota errors, (3) stream images to R2, (4) update job state in Supabase. Next.js (Vercel) does **not** perform image generation directly — it only creates the job record and triggers Modal.

### Generation Flow (Async Job Pattern)

```
UI (description + style)
  → POST /api/manuscripts/:id/covers/jobs
    → validates, rate-limits, creates cover_jobs record
    → triggers Modal worker (fire-and-forget)
  ← Returns job_id immediately (202 Accepted)

Modal Worker (async, long-running):
  → Receives job_id + cover inputs
  → Prompt wrapping ("Professional book cover illustration...")
  → Vertex AI Imagen 4.0 (portrait 2:3 aspect ratio, 4 variations)
  → Upload each image to R2 as WebP as completed
  → Progressively update cover_jobs.images[] in Supabase
  → Mark job completed or failed
  (Uses Supabase service role key for DB updates)

UI polls GET /api/covers/jobs/:job_id → renders results as they arrive
```

### Database Schema

#### `cover_jobs` table (new)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `manuscript_id` | uuid | FK → manuscripts |
| `status` | text | `queued` \| `running` \| `completed` \| `failed` |
| `prompt` | text | User's visual description |
| `genre` | text | |
| `mood` | text | |
| `style` | text | Cinematic, Illustrated, Minimalist |
| `wrapped_prompt` | text | Final prompt sent to Imagen |
| `provider` | text | `vertex-ai` |
| `model` | text | `imagen-4.0` |
| `images` | jsonb | Array of `{url, safety_status, seed}` — grows progressively |
| `selected_url` | text | Nullable — set when user selects a cover |
| `error_message` | text | Nullable |
| `retry_count` | int | Default 0, max 3 |
| `retry_after` | timestamptz | Nullable — set on 429 |
| `requested_at` | timestamptz | |
| `started_at` | timestamptz | Nullable |
| `completed_at` | timestamptz | Nullable |

RLS: Users can only read/insert their own jobs. Modal uses service role key (bypasses RLS).

#### `gallery_assets` table (new)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `account_id` | uuid | FK → accounts (for RLS scoping) |
| `manuscript_id` | uuid | FK → manuscripts |
| `asset_type` | text | `cover` |
| `url` | text | R2 permanent URL |
| `provider` | text | `vertex-ai` |
| `model` | text | `imagen-4.0` |
| `prompt` | text | User's original input |
| `wrapped_prompt` | text | Final prompt sent to Imagen |
| `metadata` | jsonb | Style, genre, mood, safety_status, seed |
| `created_at` | timestamptz | |

RLS: Users can only access rows matching their `account_id`.

**Key Decisions**:
- **No SDXL for covers.** Imagen 4.0 is highly capable out-of-the-box. Modal handles prompt engineering wrappers. SDXL remains for inline manuscript images (Story 8.8) - see Finding #8 justification below.
- **No background jobs in Next.js.** Vercel serverless functions have 10-60s timeout limits. All long-running work happens in Modal. Next.js only creates the job record and triggers Modal (Finding #4).
- **Textless art only** - AI generates artwork without text. Title/author overlaid by the UI (Finding #2).
- **Portrait 2:3 aspect ratio** (standard book cover proportions, Finding #3).
- **Independent of Story 5.6.x.** This story does not depend on the Gemini/Llama infrastructure refactor. Can be completed before custom model migration.

## Non-Goals (Scope Boundaries)

- **No background jobs in Next.js** — all long-running work happens in Modal. Next.js only creates job records and triggers Modal.
- **No dependency on Story 5.6.x** — this story is independent of the Gemini/Llama infrastructure refactor. Can be completed before custom model migration.
- **No advanced gallery management** — basic save-to-gallery only. Gallery browsing, search, tagging, and bulk operations are out of scope.
- **No admin dashboards for covers** — cost tracking for cover generation is Story 5.6.4's responsibility.
- **No image editing** — beyond minimal overlay config (font, position, color), no cropping, filters, or post-processing tools.

## Acceptance Criteria

### 1. Cover Generator UI
- [x] New "Cover Lab" tab in Manuscript settings. [AC 5.9.1]
- [x] Input form for: Genre (Dropdown), Mood (Dropdown), Art Style (Cinematic, Illustrated, Minimalist), and Visual Description. [AC 5.9.2]
- [x] Auto-fills Title and Author Name from manuscript metadata. Title and author are rendered as **UI text overlay** on the generated artwork, NOT baked into the AI image. Overlay uses customizable font/position controls. Overlay configuration (font, position, color/opacity) is **persisted per manuscript** in manuscript metadata so settings survive page reload and are applied to future generations (Finding #17). [AC 5.9.3]
- [x] Generated images use **portrait 2:3 aspect ratio** (e.g., 832x1248 or Imagen's nearest supported portrait size) matching standard book cover proportions. [AC 5.9.4]
- [x] **Mobile responsive**: On viewports < 768px, image grid switches to a single-column stacked layout or horizontal carousel. Form fields stack vertically. Preview modal is full-screen on mobile (Finding #13). [AC 5.9.24]
- [x] **Accessibility**: Generated images include `alt` text auto-populated from the user's visual description input. Preview modal is keyboard-navigable and supports screen readers (Finding #22). [AC 5.9.25]

### 2. Generation Pipeline (Async)
- [x] "Generate" button creates an async job record in Supabase and returns immediately (HTTP 202). **Generate button is disabled while a job is already in progress** for the same manuscript to prevent concurrent generation conflicts (Finding #23). [AC 5.9.5]
- [x] UI polls job status endpoint with **exponential backoff** (start 2s, cap at 10s, max 60 polls ~5 min before timing out client-side). Poll response returns a `completed_images` array (initially empty, grows as images complete) to support true progressive rendering (Finding #24). Shows skeleton placeholders for pending slots. [AC 5.9.6]
- [x] Modal wraps user description in a "Professional book cover illustration, no text, no words, no letters" prompt with style modifiers. Explicit negative prompt to suppress text rendering. [AC 5.9.7]
- [x] Modal calls Vertex AI Imagen 4.0 for generation (no fine-tuning, prompt-engineering only). [AC 5.9.8]
- [x] Returns up to 4 variations. Partial results are acceptable - if safety filters block some variations, return whatever succeeded (minimum 1). If all 4 are blocked, mark job as failed with user-friendly safety message. [AC 5.9.9]
- [x] Generated images are uploaded to Cloudflare R2 from Modal as **WebP format** (lossy, quality 85) for optimal file size. Each image uploaded individually as it completes (Finding #14). [AC 5.9.10]
- [x] Both the user's original input AND the final wrapped prompt are saved to the job metadata for debugging and provenance. [AC 5.9.11]
- [x] **Quota 429 handling**: If Vertex AI returns HTTP 429 (quota exceeded), Modal returns a structured error with `retry_after` seconds. The API route marks the job as `queued` (not failed) and the UI shows "Generation queued - high demand, retrying shortly." Background retry logic respects `retry_after` header (Finding #20). [AC 5.9.26]
- [x] **Regenerate workflow**: After results are displayed, a **"Regenerate"** button re-submits the same inputs (or user can tweak description first). Creates a new job - does not overwrite previous results until user explicitly selects or discards (Finding #21). [AC 5.9.27]

### 3. Selection & Persistence
- [x] User can view full-size preview of variations. [AC 5.9.12]
- [x] User can **"Save to Gallery"** any variation without applying it as the book cover (for brainstorming/reference). Gallery images are scoped to the **user's account** - R2 paths include `account_id` and gallery table rows are RLS-protected so users can only access their own gallery (Finding #15). [AC 5.9.13]
- [x] User can **"Select as Book Cover"** with a confirmation dialog: "This will replace your current cover. Continue?" Shows current vs new side-by-side if a cover already exists. [AC 5.9.14]
- [x] Previous `cover_url` is preserved in a `cover_history` array in manuscript metadata (max 10 entries) before overwriting, enabling undo. [AC 5.9.15]
- [x] Manuscript `cover_url` field is updated in Supabase. [AC 5.9.16]
- [x] R2 public URL, generation metadata, user input, and wrapped prompt saved to Supabase gallery. [AC 5.9.17]

### 4. Safety & Limitations
- [x] Rate limiting: 5 generation requests per day per user (checked via `ai_usage_events`). Each request = up to 4 images = 1 rate limit event. [AC 5.9.18]
- [x] Imagen 4.0 built-in safety filters handle NSFW content. Per-image safety results logged. Blocked images excluded from results with count shown to user (e.g., "3 of 4 images generated - 1 blocked by safety filter"). [AC 5.9.19]
- [x] Error handling for Modal timeout, Vertex AI errors, quota exhaustion, or R2 upload failure. Each error type has a distinct user-facing message. [AC 5.9.20]
- [x] Vertex AI Imagen quota: document the project's Imagen QPM (queries per minute) limit. If concurrent users could exceed it, implement a server-side generation queue. [AC 5.9.21]

### 5. Cleanup & Storage Lifecycle
- [x] R2 bucket lifecycle policy: objects in `tmp/covers/` auto-expire after 48 hours. No application-level cleanup code needed. [AC 5.9.22]
- [x] Gallery-saved and cover-selected images are stored in permanent paths (`covers/` and `gallery/`) not affected by lifecycle policy. [AC 5.9.23]
- [x] **Job record retention**: Completed and failed job records in Supabase are retained for **30 days**, then eligible for cleanup via a scheduled task or manual purge. Job records with gallery-saved or cover-selected images are retained indefinitely (linked via foreign key) (Finding #19). [AC 5.9.28]

## Tasks / Subtasks

- [x] **Task 0: Database Migrations**
  - [x] 0.1: Create `cover_jobs` table migration with schema per Architecture section. Add RLS policy: users can SELECT/INSERT their own jobs only
  - [x] 0.2: Create `gallery_assets` table migration with schema per Architecture section. Add RLS policy: users can only access rows matching their `account_id`
  - [x] 0.3: Add `cover_generation` to `FEATURE_LABELS` in `src/lib/ai-usage.ts`
  - [x] 0.4: Add `MODAL_COVER_URL` to `.env.example` alongside existing `MODAL_SDXL_URL`

- [x] **Task 1: Next.js API Routes**
  - [x] 1.1: Create `POST /api/manuscripts/[id]/covers/jobs` - validates inputs, checks rate limit, checks `checkUsageLimit()`, creates `cover_jobs` record, triggers Modal worker (fire-and-forget via `fetch` to `MODAL_COVER_URL`), returns job ID (202 Accepted)
  - [x] 1.2: Create `GET /api/covers/jobs/[jobId]` - poll endpoint returning job status + `images` array from `cover_jobs` (supports progressive rendering). Include `retry_after` in response when job is `queued` due to quota limits
  - [x] 1.3: Create `POST /api/covers/jobs/[jobId]/select` - sets `manuscript.cover_url`, copies image from `tmp/` to permanent R2 path, saves to `gallery_assets`. Client sends `confirm: true` after showing dialog
  - [x] 1.4: Validate inputs (genre, mood, style, description)
  - [x] 1.5: Check rate limit (5/day/user via `ai_usage_events` with feature `cover_generation`)
  - [x] 1.6: Log usage event to `ai_usage_events` (feature: `cover_generation`, model: `imagen-4.0`)
  - [x] 1.7: Reject generation request if user already has an `in_progress` or `queued` job for the same manuscript (return 409 Conflict)
  - [x] 1.8: Document Vertex AI Imagen QPM limits. If needed, add server-side queue to prevent quota exhaustion under concurrent load

- [x] **Task 2: Modal Worker Endpoint**
  - [x] 2.1: Create Modal function `generate_book_asset` that accepts `job_id` + cover inputs (description, style, genre, mood). New endpoint URL: `MODAL_COVER_URL`
  - [x] 2.2: Implement prompt wrapping logic. Inject "Professional book cover illustration, no text, no words, no letters" prefix + style modifiers + negative prompts
  - [x] 2.3: Call Vertex AI Imagen 4.0 API from Modal. Configure Vertex AI credentials in Modal secrets
  - [x] 2.4: Generate 4 variations per request. Handle partial failures: return whatever succeeds (min 1). Include per-image safety status
  - [x] 2.5: Upload each generated image to R2 individually as it completes (progressive). Use path `tmp/covers/{manuscript_id}/{job_id}/{index}.webp`. Output format is **WebP** (lossy, quality 85)
  - [x] 2.6: **Progressively update `cover_jobs.images[]`** in Supabase after each image upload (using Supabase service role key)
  - [x] 2.7: Mark job `completed` or `failed` in `cover_jobs` table. Save wrapped prompt to `cover_jobs.wrapped_prompt`
  - [x] 2.8: Set portrait aspect ratio (2:3) in Imagen API request parameters
  - [x] 2.9: Handle Vertex AI 429 (quota exceeded): update job status to `queued` with `retry_after` timestamp. Retry up to 3 times before marking as failed

- [x] **Task 3: Selection & Persistence**
  - [x] 3.1: In `POST /api/covers/jobs/[jobId]/select`: before overwriting `cover_url`, push current value to `cover_history` array in manuscript metadata (max 10, FIFO)
  - [x] 3.2: Copy image from `tmp/covers/` to `covers/{account_id}/{manuscript_id}/` in R2 (permanent path)
  - [x] 3.3: Update manuscript `cover_url` field in Supabase
  - [x] 3.4: Create `POST /api/covers/jobs/[jobId]/save-to-gallery` - saves image to `gallery_assets` without applying as cover
  - [x] 3.5: Save full metadata to `gallery_assets`: user input, wrapped prompt, style, generation date, R2 URL, safety status, provider, model

- [x] **Task 4: Frontend - Cover Lab UI**
  - [x] 4.1: Create `CoverGenerator` component with form (genre, mood, style, description)
  - [x] 4.2: Auto-fill title and author name from manuscript metadata (for UI text overlay, not AI input)
  - [x] 4.3: Build `ImageGrid` component for displaying up to 4 variations with progressive loading. On mobile (< 768px), use single-column stacked layout or horizontal carousel
  - [x] 4.4: Loading state with skeleton placeholders. Poll job status endpoint with exponential backoff (2s → 10s cap, max 60 polls). Render images from `completed_images` array as they arrive
  - [x] 4.5: Full-size preview modal on image click with title/author text overlay preview. Full-screen on mobile. Keyboard-navigable (arrow keys, Escape to close)
  - [x] 4.6: **"Save to Gallery"** button per image (saves without applying as cover)
  - [x] 4.7: **"Select as Book Cover"** button per image with confirmation dialog (shows current vs new if cover exists)
  - [x] 4.8: Text overlay controls: font selection (system-safe fonts only: serif, sans-serif, monospace families), position (top/center/bottom), color/opacity. **Persist overlay settings** to manuscript metadata so they survive page reload
  - [x] 4.9: Error states: rate limit hit, partial safety blocks (show count), full safety block, timeout, quota exhaustion, **queued state** (429 retry-after with estimated wait)
  - [x] 4.10: Show "X of 4 images generated" when partial results returned due to safety filters
  - [x] 4.11: **"Regenerate"** button after results load. Pre-fills form with previous inputs. User can tweak description before re-submitting. Previous results remain visible until new job completes
  - [x] 4.12: **Disable Generate button** while an active job exists for the manuscript (in_progress or queued). Show job status indicator instead
  - [x] 4.13: Auto-populate `alt` attribute on generated images from user's visual description input. Ensure preview modal is screen-reader accessible

- [x] **Task 5: Prompt Engineering**
  - [x] 5.1: Create prompt template library in Modal function (style-specific wrappers)
  - [x] 5.2: Map genre + mood + style to Imagen-optimized prompt modifiers
  - [x] 5.3: Add explicit negative prompts to suppress text/letter rendering in all templates
  - [x] 5.4: Test prompt quality across different genres and styles at 2:3 portrait ratio
  - [x] 5.5: Add variation seed logic to ensure 4 distinct outputs

- [x] **Task 6: R2 Lifecycle & Job Cleanup**
  - [x] 6.1: Configure R2 bucket lifecycle rule: auto-delete objects with prefix `tmp/covers/` after 48 hours
  - [x] 6.2: Verify permanent paths (`covers/`, `gallery/`) are NOT affected by lifecycle rule
  - [x] 6.3: Document lifecycle policy in infrastructure runbook
  - [x] 6.4: Add job record cleanup: completed/failed jobs older than 30 days and not linked to gallery/cover entries are eligible for deletion. Implement as scheduled task or manual SQL script

- [x] **Task 7: Testing**
  - [x] 7.1: Unit tests for prompt construction logic (including negative prompts)
  - [x] 7.2: Unit tests for rate limiting (5/day/user via `ai_usage_events`)
  - [x] 7.3: Unit tests for cover history preservation (max 10, FIFO)
  - [x] 7.4: Integration test: full async flow with mocked Modal endpoint (`cover_jobs` creation → polling → completion)
  - [x] 7.5: Integration test: partial failure handling (2 of 4 blocked)
  - [x] 7.6: Integration test: full failure handling (all blocked)
  - [x] 7.7: Verify R2 upload to correct paths (tmp vs permanent)
  - [x] 7.8: Verify usage event logging (feature: `cover_generation`, model: `imagen-4.0`)
  - [x] 7.9: Verify prompt provenance saved (both user input and wrapped prompt in `cover_jobs`)
  - [x] 7.10: Test 429 quota handling: verify `cover_jobs` transitions to `queued`, retry-after respected, eventual completion or failure
  - [x] 7.11: Test concurrency lock: verify 409 returned when job already active for manuscript
  - [x] 7.12: Test polling backoff: verify client polls with increasing intervals (2s → 10s cap)
  - [x] 7.13: Test `gallery_assets` RLS: verify users cannot access other users' gallery entries
  - [x] 7.14: Test overlay persistence: verify font/position/color settings saved to and loaded from manuscript metadata
  - [x] 7.15: Test mobile responsive layout: image grid stacks on narrow viewport
  - [x] 7.16: Test `cover_jobs` and `gallery_assets` migration: verify tables created with correct RLS policies

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] R2 URL construction in Modal worker uses bucket name as hostname — images produce invalid URLs (`https://bearing-uploads/...`) that will never resolve. Add `R2_PUBLIC_URL` env var or align with Story 8.8 `storage_path` pattern. [modal/generate_book_asset.py, src/lib/covers/storage.ts]
- [x] [AI-Review][CRITICAL] Usage event logged even when Modal trigger fails — user loses rate-limit slot without results. Move `logUsageEvent()` inside success path only. [src/app/api/manuscripts/[id]/covers/jobs/route.ts]
- [x] [AI-Review][HIGH] `in_progress` status referenced in code but DB CHECK constraint only allows `queued|running|completed|failed`. Remove phantom status from `ACTIVE_JOB_STATUSES` and CoverGenerator types. [src/app/api/manuscripts/[id]/covers/jobs/route.ts, src/components/marketing/CoverGenerator.tsx]
- [x] [AI-Review][HIGH] No `try/catch` around `fetch()` in `generateCovers()` — unhandled network error crashes promise chain. Wrap like `pollJob()` does. [src/components/marketing/CoverGenerator.tsx]
- [x] [AI-Review][HIGH] `tokens_actual` always stores estimate (200k) for cover generation, never real Vertex usage. Either update from Modal worker or document limitation. [src/app/api/manuscripts/[id]/covers/jobs/route.ts, docs/architecture-ai.md]
- [x] [AI-Review][MEDIUM] `src/lib/covers/polling.ts` is a new file not documented in File List. Add to File List.
- [x] [AI-Review][MEDIUM] `package.json` modified but not documented in File List. Add to File List.
- [x] [AI-Review][MEDIUM] Divergent R2 URL pattern: Story 8.8 stores `storage_path` (key only), Story 5.9 stores full URLs. Align patterns to reduce maintenance overhead.
- [x] [AI-Review][LOW] `_public_origin_from_tmp_url` is unused dead code. Remove. [modal/generate_book_asset.py]
- [x] [AI-Review][LOW] RLS policy `cover_jobs_select_owner` runs a manuscripts subquery on every poll SELECT. Consider simplifying to `user_id` check only. [supabase/migrations/20260211120000_optimize_cover_jobs_select_rls.sql]
- [x] [AI-Review][MEDIUM] `saveToGallery()` and `selectAsBookCover()` lack `try/catch` around `fetch()` — same bug class as Round 3 Finding #4, fixed only in `generateCovers()` and `pollJob()`. Wrap to prevent unhandled promise rejections on network errors. [src/components/marketing/CoverGenerator.tsx]
- [x] [AI-Review][LOW] `buildCoverPromptPayload` called twice with identical args, `authorName` extraction duplicated in same function. Compute once and reuse. [src/app/api/manuscripts/[id]/covers/jobs/route.ts]
- [x] [AI-Review][LOW] No test exercises `parseModalActualTokens()` returning a real value — happy-path mock returns `{}` so the function always returns `null` in tests. Add a test where Modal response includes `{ tokens_actual: 150000 }`. [tests/api/covers-jobs-create.test.ts]

## Dev Notes

### Architecture
- **Modal.com as Async Worker**: Modal is the long-running worker that: (1) wraps prompts, (2) calls Vertex AI Imagen, (3) converts output to WebP, (4) uploads to R2, (5) progressively updates `cover_jobs.images[]` in Supabase via service role key. **Justification for Modal hop (Finding #12)**: Modal provides image post-processing capabilities (format conversion), centralized prompt management, and R2 streaming without routing large image binaries through the Next.js serverless function. The cold-start cost is acceptable given the async job pattern.
- **Modal Endpoint**: New `MODAL_COVER_URL` env var (separate from `MODAL_SDXL_URL`). Reuses existing `MODAL_API_KEY`. Modal needs Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) to update `cover_jobs` directly.
- **Imagen 4.0**: No fine-tuning needed. Quality controlled via prompt engineering on Modal side.
- **Aspect Ratio**: Portrait 2:3 (832x1248 or nearest Imagen-supported size). This matches standard 6x9 book cover proportions.
- **Text Rendering Strategy**: AI generates textless artwork only. Title/author text is overlaid by the frontend UI using customizable font/position controls. This avoids AI text hallucination issues.
- **Async Job Pattern**: No background jobs in Next.js (Vercel timeout limits). Next.js creates `cover_jobs` record in Supabase, fires POST to Modal endpoint, returns 202 immediately. Modal does all heavy lifting and updates job state directly. UI polls `GET /api/covers/jobs/:job_id` for results.
- **R2 Storage**: Temporary images go to `tmp/covers/{manuscript_id}/{job_id}/`. Permanent covers go to `covers/{account_id}/{manuscript_id}/`. Gallery saves go to `gallery/{account_id}/{image_id}/`. R2 lifecycle policy handles temp cleanup (48h TTL) - no application-level cleanup code.
- **Rate Limiting**: 5 generations/day/user. Each generation = up to 4 images = 1 rate limit event. Tracked via `ai_usage_events` with feature `cover_generation`.
- **Existing Patterns**: Story 8.8's [attachments/generate/route.ts](src/app/api/manuscripts/[id]/attachments/generate/route.ts) provides the reference pattern for Modal calls (`MODAL_API_KEY`, `fetch()`, R2 upload, `checkUsageLimit()`, `logUsageEvent()`). Story 5.9 extends this with async jobs instead of synchronous generation.
- **Credential Management (Finding #1)**: Vertex AI credentials on Modal are managed independently from Story 5.6.1's Next.js credentials. Document both credential sets in the same rotation runbook. Use the same GCP service account with scoped IAM roles where possible to reduce drift risk.
- **Stack Fragmentation (Finding #8)**: Maintaining both SDXL (Story 8.8 inline images) and Imagen 4.0 (covers) is intentional. Covers require higher quality at portrait ratios - Imagen excels here. Inline manuscript images are quick-generation use cases where SDXL's speed is preferred. If consolidation is desired later, migrate 8.8 to Imagen as a follow-up story.
- **Quota Management (Finding #11)**: Vertex AI Imagen has per-project QPM limits. Document the limit. If concurrent users could exceed it, the `cover_jobs` table already acts as a job queue with status transitions (`queued` → `running` → `completed`/`failed`).
- **Image Format (Finding #14)**: WebP (lossy, quality 85) for all generated images. Provides ~30-50% smaller files than PNG with negligible quality loss at cover resolutions. Modal converts Imagen output (PNG) to WebP before R2 upload.
- **Gallery ACLs (Finding #15)**: R2 paths include `account_id` for namespace isolation. `gallery_assets` table uses RLS policy on `account_id`. No cross-account access to gallery images.
- **Font Strategy (Finding #16)**: Text overlay uses system-safe font stacks (serif, sans-serif, monospace). No custom font loading or licensing required. If custom fonts are desired later, that's a follow-up story.
- **Overlay Persistence (Finding #17)**: Font, position, color/opacity settings stored in manuscript `metadata` JSONB field under a `cover_overlay_config` key. Loaded on Cover Lab mount, saved on change.
- **Polling Strategy (Finding #18)**: Exponential backoff starting at 2s, doubling to cap at 10s. Client gives up after 60 polls (~5 min). Poll response includes `completed_images[]` array that grows as images finish, enabling true progressive rendering without ambiguity between skeleton and "still loading" states (Finding #24).
- **Job Cleanup (Finding #19)**: `cover_jobs` records retained 30 days. Jobs linked to `gallery_assets` or `cover_url` selections retained indefinitely. Cleanup via scheduled task or manual SQL — no automatic cascade delete.
- **429 Retry (Finding #20)**: Modal detects Vertex AI 429, updates `cover_jobs.status` to `queued` with `retry_after` timestamp directly in Supabase. Modal retries after delay. Max 3 retries (`cover_jobs.retry_count`) before marking as failed with "high demand" message.
- **Regenerate UX (Finding #21)**: "Regenerate" creates a new job. Previous results stay visible until new results arrive. No implicit overwrite. Each generation is an independent job.
- **Accessibility (Finding #22)**: Alt text auto-populated from user's visual description. Preview modal: `role="dialog"`, `aria-label`, keyboard nav (arrows, Escape). Focus trap inside modal.
- **Concurrency Guard (Finding #23)**: One active job (`running` or `queued` in `cover_jobs`) per manuscript per user. API returns 409 if a job is already active. Generate button disabled client-side during active job.
- **Independence from 5.6.x**: This story does not depend on Stories 5.6.1 (Vertex AI Gemini), 5.6.2 (Modal Llama), or 5.6.3 (R2 manuscript migration). Uses separate Vertex AI credentials (Imagen-specific), separate Modal endpoint (`MODAL_COVER_URL`), and existing R2 bucket (`bearing-uploads`).

### Execution Order
1. Create migrations for `cover_jobs` and `gallery_assets` (Task 0)
2. Implement Next.js API routes (Task 1)
3. Build Cover Lab UI with polling (Task 4)
4. Implement Modal worker endpoint (Task 2)
5. Wire up selection & persistence (Task 3)
6. Add prompt engineering templates (Task 5)
7. Configure R2 lifecycle & job cleanup (Task 6)
8. QA end-to-end flow (Task 7)

### Usage Tracking
- Add `cover_generation` to `FEATURE_LABELS` in `src/lib/ai-usage.ts`
- Log model as `imagen-4.0` in usage events

### References
- [Vertex AI Imagen docs](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Modal.com web endpoints](https://modal.com/docs/guide/web-endpoints)
- [R2 Lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- Story 8.8: Inline manuscript image generation (Modal SDXL - separate feature)
- Story 5.6.1: Vertex AI setup for Gemini (independent - different auth context)

---

## Dev Agent Record

### Debug Log

- 2026-02-11: Executed BMAD `dev-story` workflow for Story 5.9 and implemented Tasks 0-7 in sequence.
- 2026-02-11: Ran targeted validation for new cover-generator tests, then full regression (`npm test`) and lint (`npm run lint`).
- 2026-02-11: Resolved an existing full-suite blocker in `src/app/api/services/request/route.ts` (metadata validation mismatch) to satisfy regression gates.
- 2026-02-11: Addressed all 10 Round 3 code-review follow-ups (2 critical, 3 high, 3 medium, 2 low), including R2 URL normalization, usage metering guardrails, status alignment, network-error handling, and RLS polling-policy simplification.
- 2026-02-11: Re-ran Story 5.9 focused tests, full `npm test`, and `npm run lint` (warnings only).
- 2026-02-11: Addressed all 3 Round 4 findings by adding fetch error guards for save/select actions, removing duplicate prompt/author derivation in create-job route, and adding a `tokens_actual` usage test. Re-ran targeted tests for updated API and component files.

### Completion Notes

- Implemented the full Cover Lab feature set: schema + RLS migrations, async cover job APIs, cover selection/gallery persistence, Cover Lab UI, prompt engineering utilities, and operations runbook/cleanup artifacts.
- Implemented Modal worker Vertex integration path in `modal/generate_book_asset.py` with token resolution, 429 retry handling, safety-block handling, progressive Supabase updates, and WebP upload flow.
- Resolved all Round 3 code-review findings. Critical fixes included valid public R2 URL derivation and preventing `ai_usage_events` logging when Modal trigger fails.
- Resolved all Round 4 follow-up findings (1 medium, 2 low) with regression tests covering the newly-added network-error handling and `tokens_actual` parsing path.
- Full regression passed: `Test Suites: 107 passed, 107 total` and `Tests: 773 passed, 5 skipped, 778 total`.
- Lint passed with existing repository warnings only (`0` errors).

## File List

- `.env.example` (modified)
- `docs/architecture-ai.md` (modified)
- `docs/cover-generator-ops-runbook.md` (new)
- `docs/story5.9.md` (modified)
- `package.json` (modified)
- `modal/generate_book_asset.py` (new)
- `scripts/purge-cover-jobs.sql` (new)
- `src/app/api/covers/jobs/[jobId]/route.ts` (new)
- `src/app/api/covers/jobs/[jobId]/save-to-gallery/route.ts` (new)
- `src/app/api/covers/jobs/[jobId]/select/route.ts` (new)
- `src/app/api/manuscripts/[id]/covers/jobs/route.ts` (new)
- `src/app/api/services/request/route.ts` (modified)
- `src/components/marketing/CoverGenerator.tsx` (new)
- `src/components/marketing/MarketingDashboard.tsx` (modified)
- `src/components/ui/skeleton.tsx` (new)
- `src/lib/ai-usage.ts` (modified)
- `src/lib/covers/polling.ts` (new)
- `src/lib/covers/prompt.ts` (new)
- `src/lib/covers/storage.ts` (new)
- `supabase/migrations/20260211000000_create_cover_generation_tables.sql` (new)
- `supabase/migrations/20260211001000_add_manuscript_cover_url.sql` (new)
- `supabase/migrations/20260211002000_cover_jobs_cleanup_function.sql` (new)
- `supabase/migrations/20260211120000_optimize_cover_jobs_select_rls.sql` (new)
- `tests/api/covers-job-save-to-gallery.test.ts` (new)
- `tests/api/covers-job-select.test.ts` (new)
- `tests/api/covers-job-status.test.ts` (new)
- `tests/api/covers-jobs-create.test.ts` (new)
- `tests/components/marketing/CoverGenerator.test.tsx` (new)
- `tests/components/marketing/MarketingDashboard.test.tsx` (modified)
- `tests/lib/ai-usage.test.ts` (modified)
- `tests/lib/cover-polling.test.ts` (new)
- `tests/lib/cover-prompt.test.ts` (new)
- `tests/lib/covers-storage.test.ts` (new)
- `tests/migrations/cover-generator-schema.test.ts` (new)

## Adversarial Review

### Round 1

**Reviewer:** Adversarial Agent
**Date:** 2026-02-10
**Findings:** 12 | **All addressed**

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | Duplicate Vertex AI secret management (Modal + Next.js) | Medium | Documented: use same GCP service account, shared rotation runbook. Independent secret stores are acceptable. |
| 2 | Ambiguous text rendering (AI vs UI overlay) | High | **Fixed**: AI generates textless art only. Explicit "no text" negative prompts. Title/author overlaid by frontend with customizable controls. |
| 3 | Missing aspect ratio specification | High | **Fixed**: Portrait 2:3 ratio (832x1248) specified. Matches standard 6x9 book proportions. |
| 4 | Timeout risk in synchronous flow | High | **Fixed**: Async job pattern. API returns 202 + job ID immediately. UI polls for completion. No long HTTP connections. |
| 5 | Destructive cover overwrite without safeguards | Medium | **Fixed**: Confirmation dialog with current vs new preview. Cover history preserved (max 10 entries, FIFO) for undo. |
| 6 | Unclear batch failure logic | Medium | **Fixed**: Partial results accepted (min 1 of 4). Per-image safety status returned. UI shows "X of 4 generated" with blocked count. |
| 7 | Unreliable fire-and-forget cleanup | Medium | **Fixed**: R2 bucket lifecycle policy (48h TTL on `tmp/covers/` prefix). No application-level cleanup code. |
| 8 | Stack fragmentation (Imagen + SDXL) | Low | **Acknowledged**: Intentional. Imagen for high-quality portrait covers, SDXL for fast inline images. Consolidation is a future option. |
| 9 | Missing Save/Download utility | Medium | **Fixed**: "Save to Gallery" action per image. Users can save concepts without applying as cover. |
| 10 | Prompt provenance ambiguity | Medium | **Fixed**: Both user input AND wrapped prompt saved to job metadata and gallery records. |
| 11 | Cost/quota spike risk | Medium | **Fixed**: Document Imagen QPM limits. Add server-side queue if concurrent load exceeds quota. Rate limit at 5 requests/day/user. |
| 12 | Unnecessary Modal hop latency | Low | **Acknowledged**: Modal provides prompt management, R2 streaming, and future post-processing capabilities. Async pattern makes the extra hop latency irrelevant to UX. |

### Round 2

**Reviewer:** Adversarial Agent
**Date:** 2026-02-10
**Findings:** 12 | **All addressed**

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 13 | Missing mobile design specs | Medium | **Fixed**: AC 5.9.24 added. Single-column stacked layout or carousel on < 768px. Full-screen preview on mobile. Form fields stack vertically. |
| 14 | Ambiguous image format (PNG vs WebP) | Medium | **Fixed**: WebP (lossy, quality 85) specified. Modal converts Imagen PNG output to WebP before R2 upload. ~30-50% smaller files. |
| 15 | Gallery permission scope / ACLs | High | **Fixed**: R2 paths include `account_id`. Gallery table uses RLS on `account_id`. No cross-account access. |
| 16 | Font licensing & lazy loading for text overlay | Medium | **Fixed**: System-safe font stacks only (serif, sans-serif, monospace). No custom font loading or licensing complexity. Custom fonts deferred to follow-up. |
| 17 | Overlay config not persisted | Medium | **Fixed**: Font/position/color/opacity saved to manuscript `metadata.cover_overlay_config`. Loaded on mount, saved on change. |
| 18 | Polling vs SSE - no interval cap or backoff | Medium | **Fixed**: Exponential backoff (2s start, 10s cap, max 60 polls ~5 min timeout). SSE not needed given async job pattern. |
| 19 | Job record cleanup retention policy missing | Medium | **Fixed**: 30-day retention for completed/failed jobs. Jobs linked to gallery/cover selections retained indefinitely. AC 5.9.28 added. |
| 20 | Quota 429 handling (retry, not just documentation) | High | **Fixed**: Modal surfaces 429 with `retry_after`. Job transitions to `queued` state. Background retry (max 3 attempts). AC 5.9.26 added. |
| 21 | No regenerate / "more like this" workflow | Medium | **Fixed**: "Regenerate" button re-submits inputs (user can tweak). New job created, previous results preserved. AC 5.9.27 added. |
| 22 | Accessibility (alt text, keyboard nav) | Medium | **Fixed**: Alt text from user description. Keyboard-navigable preview modal with focus trap. `role="dialog"`, `aria-label`. AC 5.9.25 added. |
| 23 | Concurrency edge case (parallel jobs) | High | **Fixed**: One active job per manuscript per user. API returns 409 Conflict. Generate button disabled during active job. |
| 24 | Inconsistent skeleton vs progressive loading | Medium | **Fixed**: Poll response returns `completed_images[]` array. Skeletons shown for unfilled slots. No ambiguity between "loading" and "blocked." |

### Round 3 (Code Review)

**Reviewer:** Adversarial Code Reviewer (AI)
**Date:** 2026-02-11
**Findings:** 10 | **All addressed**

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | R2 URL construction uses bucket name as hostname — all cover image URLs are invalid and will never resolve in browser | Critical | Resolved |
| 2 | Usage event logged even when Modal trigger fails — user loses rate-limit slot without results | Critical | Resolved |
| 3 | `in_progress` status referenced in code but not in DB CHECK constraint (`queued\|running\|completed\|failed`) | High | Resolved |
| 4 | No `try/catch` around `fetch()` in `generateCovers()` — unhandled network error | High | Resolved |
| 5 | `tokens_actual` always stores estimate (200k), never real Vertex AI usage | High | Resolved |
| 6 | `src/lib/covers/polling.ts` new file missing from File List | Medium | Resolved |
| 7 | `package.json` modified but not in File List | Medium | Resolved |
| 8 | Divergent R2 URL pattern from existing Story 8.8 `storage_path` approach | Medium | Resolved |
| 9 | `_public_origin_from_tmp_url` unused dead code in Modal worker | Low | Resolved |
| 10 | RLS policy `cover_jobs_select_owner` runs manuscripts subquery on every poll | Low | Resolved |

### Round 4 (Re-Review)

**Reviewer:** Adversarial Code Reviewer (AI)
**Date:** 2026-02-11
**Findings:** 3 (all new) | **All addressed** (Round 3 fixes remained resolved)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | `saveToGallery()` and `selectAsBookCover()` lack `try/catch` around `fetch()` — same bug class as Round 3 #4 | Medium | Resolved |
| 2 | `buildCoverPromptPayload` called twice with identical args, `authorName` extraction duplicated | Low | Resolved |
| 3 | No test exercises `parseModalActualTokens()` returning a real value — function always returns `null` in tests | Low | Resolved |

---

### Change Log

- 2026-02-11: Completed Round 4 follow-ups. Added `try/catch` guards for gallery-save and cover-select fetch flows, refactored prompt/author derivation to compute once in create-job route, and added `tokens_actual` usage logging test coverage (`{ tokens_actual: 150000 }`).
- 2026-02-11: Code review round 4 (re-review) — verified all 10 Round 3 fixes resolved. 3 new findings (1 medium, 2 low). Action items added to Review Follow-ups.
- 2026-02-11: Completed Round 3 follow-up implementation. Fixed R2 URL construction with `R2_PUBLIC_URL` + `storage_path` alignment, moved usage logging behind successful/queued Modal trigger, removed phantom `in_progress` state, added fetch error handling in CoverGenerator, documented/parsed actual token usage fallback, removed dead Modal helper, optimized poll RLS policy, and updated Story File List artifacts.
- 2026-02-11: Code review round 3 — 10 findings (2 critical, 3 high, 3 medium, 2 low). Action items added to Tasks/Subtasks. Story status remains in-progress pending critical R2 URL and usage-logging fixes.
- 2026-02-11: Completed Story 5.9 implementation and validation. Added migrations for `cover_jobs`/`gallery_assets` + manuscript `cover_url`, implemented Cover Lab APIs/UI/prompt library, wired Modal worker Vertex call path, added runbook + cleanup SQL, and added/updated automated tests for API/UI/prompt/schema paths. Full regression and lint gates passed.
- 2026-02-11: Fixed full-suite regression in `POST /api/services/request` by restoring metadata validation coverage for `author-website`/`social-media` and supporting current + legacy marketing budget formats.
- 2026-02-10: Architecture finalization. Clarified Modal as async worker (not Vertex replacement). Added concrete table schemas (`cover_jobs`, `gallery_assets`). Updated API routes (`POST /api/manuscripts/:id/covers/jobs`, `GET /api/covers/jobs/:job_id`, `POST /api/covers/jobs/:job_id/select`). Added Non-Goals section. Added execution order. Task 0 (migrations) added. Confirmed independence from Story 5.6.x. Added `MODAL_COVER_URL` env var.
- 2026-02-10: Addressed 12 round 2 adversarial findings (#13-#24). Added: mobile responsive layout, WebP format, gallery ACLs, system-safe fonts, overlay persistence, polling backoff, job cleanup retention, 429 retry logic, regenerate workflow, accessibility (alt text + keyboard nav), concurrency guard, progressive loading via `completed_images[]` array. 5 new ACs (5.9.24-5.9.28), 12 new subtasks.
- 2026-02-10: Addressed 12 round 1 adversarial review findings. Major changes: async job pattern, textless art + UI overlay, portrait 2:3 ratio, partial failure handling, cover history, gallery save, R2 lifecycle policy, prompt provenance.
- 2026-02-10: Major rewrite. Replaced SDXL with Imagen 4.0 via Vertex AI. Fixed NestJS -> Next.js. Updated architecture to reflect Modal orchestration + Vertex AI generation + R2 streaming flow.

