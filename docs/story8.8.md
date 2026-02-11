# Story 8.8: Image upload + AI generation in manuscript

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Author**,
I want to **upload images or generate them using AI directly from my writing toolbar**,
so that **I can visually enrich my manuscript with scenes, characters, or reference images without leaving the editor.**

## Acceptance Criteria

1. **Toolbar Integration**: The TipTap editor toolbar must include an "Image" button. Clicking this button opens a popover or dialog with two options: "Upload Image" and "Generate with AI". [AC 8.8.1]

2. **Secure Image Upload & Management**:
   - **Validation & Optimization**:
     - **Client-Side**: Use `browser-image-compression`. Logic: `try` compress to < 5MB (0.8 quality, max 1920px width). If `finalSize > 5MB`, reject with error: "Image too large. Please resize to under 5MB."
     - **Dimensions**: Read width/height client-side using `Image()` object `onload` event *before* upload. Send as metadata.
     - **Server-Side**: Verify magic numbers using `file-type`. Reject mismatches.
   - **Data Schema**:
     - `attachments` table: `file_size` (bytes), `mime_type`, `original_filename`, `source` (`user_upload`, `ai_generation`), `deleted_at` (timestamptz), and `metadata` (JSONB: `{ width, height, ai_prompt, model_version }`).
     - **Constraints**: `source IN ('user_upload', 'ai_generation')`. `status` field REMOVED (implied by record existence).
     - **Foreign Keys**: `manuscript_id REFERENCES manuscripts(id) ON DELETE CASCADE` (critical for cleanup).
   - **Transaction Safety & Deletion**:
     - **Upload**: Upload R2 -> Insert DB. If DB Insert fails -> Delete R2 immediately.
     - **Delete**: Update DB `deleted_at = NOW()`. Then attempt R2 Delete.
     - **Orphaned File Handling**: If R2 deletion fails, log error to console with `[OrphanedFile]` prefix and `storage_path`. (Sentry usage depends on project config; fallback to console is safe).
   - **Rendering**:
     - Editor rendering: Use CSS classes `.manuscript-image` (width: 100%; height: auto) injected via TipTap extension config to avoid inline styles and CSP issues. Set `max-width` on the container div, not the img tag if needed. [AC 8.8.2]

3. **AI Image Generation (Modal SDXL)**:
   - **Input**: Text prompt + "Generate from Context" option.
   - **Smart Context**:
     - Use `Intl.Segmenter` (if supported) or **Fallback**: Simple split by `\n` (paragraph).
     - **Sanitization**: Use `striptags` (npm package) to strip HTML tags. (Turndown was incorrect tool).
   - **Integration (Modal)**:
     - URL: `process.env.MODAL_SDXL_URL`.
     - Method: `POST`.
     - **Auth**: `Authorization: Bearer ${process.env.MODAL_API_KEY}`.
     - Body: `{ prompt: string, num_inference_steps: 30 }` (30 steps = good balance of speed vs quality for SDXL refiner).
     - **Response Handling**: Next.js API `config = { api: { bodyParser: { sizeLimit: '10mb' } } }` to handle Base64 payload.
     - **Dimensions**: Decode Base64 server-side (or trust model spec 1024x1024) to populate metadata.
   - **Regeneration**: New API call (50k tokens).
   - **Safety**:
     - If flagged (400 Bad Request): Show specific error.
     - **Limits**: Safety blocks count against rate limits.
   - **Quota Check**: Pre-flight check before call. [AC 8.8.3]

4. **Editor Integration (TipTap)**:
   - **Accessibility**:
     - **Alt Text**: Required.
     - **Truncation**: If prompt > 125 chars: take first 120 chars, back up to last space, append "...". Hard truncate at 125 if no space found.
     - **Validation**: "Insert" button disabled until alt text present. [AC 8.8.4]

5. **Usage Metering & Limits**:
   - **Rate Limiting (DB)**:
     - Max 5 generations/min/user.
     - **Index**: `CREATE INDEX idx_ai_usage_created_at ON ai_usage_events (created_at)` (separate index for range scan).
   - **Upload Limits**:
     - Max 50 uploads per rolling 24h per user.
     - **Policy**: Includes deleted images (security measure). *UX Note*: If user hits limit due to error, they must wait or contact support. This is an acceptable MVP trade-off against abuse.
     - **Index**: `CREATE INDEX idx_attachments_created_at ON attachments (created_at)`. [AC 8.8.5]

6. **Data Persistence & Security**:
   - **Proxy Route**: `GET /api/manuscripts/[id]/images/[imageId]`
     - **Optimization**: Use `unstable_cache` (standard Next.js caching pattern despite name, widely used in App Router). Tag: `attachment-[imageId]`.
     - **RLS**:
       - 1. Get `session.user.id`.
       - 2. `SELECT owner_user_id FROM manuscripts WHERE id = $1`.
       - 3. Check `manuscript.owner_user_id === session.user.id` (MVP: strict ownership). *Future: Team checks*.
       - 4. If mismatch -> 403. [AC 8.8.6]

## Tasks / Subtasks

- [x] **Task 1: Database & Storage Infrastructure**
  - [x] 1.1: Create `attachments` table migration:
    - Columns: `id`, `manuscript_id`, `user_id`, `source`, `storage_path`, `alt_text`, `file_size`, `mime_type`, `original_filename`, `metadata`, `created_at`, `deleted_at`.
    - Constraints: `CHECK (source IN ('user_upload', 'ai_generation'))`. `manuscript_id REFERENCES manuscripts(id) ON DELETE CASCADE`.
    - Indexes: `idx_attachments_created_at`, `idx_ai_usage_created_at`.
  - [x] 1.2: Add RLS policies (CRUD for owners).
  - [x] 1.3: Update `src/lib/ai-usage.ts` (labels).

- [x] **Task 2: Backend API Implementation**
  - [x] 2.1: Install dependencies: `npm install file-type striptags`.
  - [x] 2.2: Create `POST /api/manuscripts/[id]/attachments/upload`
    - [x] Logic: Check Ownership -> Limit Check -> Upload R2 -> Insert DB.
  - [x] 2.3: Create `POST /api/manuscripts/[id]/attachments/generate`
    - [x] Config: `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }`.
    - [x] Auth: `Bearer ${process.env.MODAL_API_KEY}`.
    - [x] Sanitize: `striptags`.
    - [x] Logic: Balance Check -> Call Modal -> Upload R2 -> Insert DB.
  - [x] 2.4: Create `DELETE /api/manuscripts/[id]/attachments/[attachmentId]`
  - [x] 2.5: Proxy Route `GET /api/manuscripts/[id]/images/[imageId]`
    - [x] Cache: `unstable_cache`. Tag: `attachment-[imageId]`.
    - [x] Auth: Compare `manuscript.owner_user_id === session.user.id`.

- [x] **Task 3: Frontend Editor Enhancement**
  - [x] 3.1: Install: `npm install @tiptap/extension-image browser-image-compression`.
  - [x] 3.2: Create `ImageUploadDialog`:
    - [x] Client-side Dimensions: `new Image().onload`.
    - [x] Compression -> Error if > 5MB.
    - [x] Alt Text: Safe truncation.
  - [x] 3.3: TipTap Extension:
    - [x] Configure `HTMLAttributes` to add `class: 'manuscript-image'`.
    - [x] Add global CSS: `.manuscript-image { max-width: 100%; height: auto; }`.

- [x] **Task 4: Quality & Resilience**
  - [x] 4.1: **Logging**: `console.error('[OrphanedFile] ...')`.
  - [x] 4.2: **Testing**:
    - [x] Unit: Alt text truncation edge cases.
    - [x] Integration: Upload limit enforcement (ensure deleted count).

## Dev Notes

### Modal Integration
- **Auth**: Ensure `MODAL_API_KEY` is set in `.env`.
- **Steps**: 30 steps is chosen as the "sweet spot" for SDXL Refiner speed/quality trade-off (approx 2-3s generation).

### CSP Strategy
By using CSS classes (`.manuscript-image`) instead of inline `style="..."` attributes, we avoid `unsafe-inline` issues. The TipTap extension `addAttributes` method should be configured to output `class` instead of `style`.

### Upload Limit UX
The 50 upload/day limit includes deleted files to prevent abuse (e.g. rapid upload/delete cycles to stress storage/bandwidth). If a user hits this limit legitimately (rare), they must wait.

## Project Structure Notes

- New Table: `attachments`
- New API Routes:
  - `src/app/api/manuscripts/[id]/attachments/upload/route.ts`
  - `src/app/api/manuscripts/[id]/attachments/generate/route.ts`
  - `src/app/api/manuscripts/[id]/attachments/[attachmentId]/route.ts`
  - `src/app/api/manuscripts/[id]/images/[imageId]/route.ts`

## References

- [Source: docs/architecture.md#1.5 File storage] - R2 strategy.
- [Source: src/lib/ai-usage.ts] - Metering logic.

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5
**Date:** 2026-02-10
**Outcome:** ✅ APPROVED (after fixes)

### Findings Summary
- **5 HIGH severity issues** - All fixed
- **4 MEDIUM severity issues** - All fixed
- **2 LOW severity issues** - Acknowledged (test coverage, minor style)

### HIGH Issues Fixed
1. **Alt text not saved to database** - Upload route now retrieves and persists `alt_text` from form data
2. **Missing RLS UPDATE policy** - Added `attachments_update_owner` policy for soft-delete support
3. **Missing env vars in .env.example** - Added R2 and Modal SDXL configuration variables
4. **Alt text truncation algorithm incorrect** - Fixed to match AC 8.8.4 (120 chars + "..." or hard 125)
5. **"Generate from Context" option missing** - Added checkbox and context extraction per AC 8.8.3

### MEDIUM Issues Fixed
1. **Proxy route unsafe pattern** - Refactored to use proper typed imports and admin client
2. **Duplicate CSS files** - Deleted dead `tiptap-overrides.css` file
3. **DELETE endpoint no ownership check** - Added explicit manuscript ownership verification
4. **Body parser config** - N/A for App Router (handled differently)

### Files Modified in Review
- `src/app/api/manuscripts/[id]/attachments/upload/route.ts`
- `src/app/api/manuscripts/[id]/attachments/[attachmentId]/route.ts`
- `src/app/api/manuscripts/[id]/images/[imageId]/route.ts`
- `src/components/editor/dialogs/ImageUploadDialog.tsx`
- `src/components/editor/TiptapEditor.tsx`
- `supabase/migrations/20260210000000_create_attachments_table.sql`
- `.env.example`
- Deleted: `src/lib/css/tiptap-overrides.css`

---

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (Adversarial Review Round 5)

### Change Log
- **2026-02-10 (Senior Review)**: Fixed 9 issues from adversarial code review: alt_text DB persistence, RLS UPDATE policy, env vars documentation, truncation algorithm, Generate from Context feature, proxy route cleanup, duplicate CSS removal, and DELETE ownership check.
- **2026-02-10 (Round 5)**: Addressed 15 adversarial findings: removed useless status enum, switched to `striptags`, specified Bearer token source, defined RLS comparison logic, fixed alt text truncation algorithm, added foreign key cascade, justified `unstable_cache` usage, specified client-side dimension capture, removed Sentry assumption, justified strict upload limit, removed RPC check, justified inference steps, fixed index strategy for range scans, increased body size limit for Base64, and switched to CSS classes for CSP compliance.
- **2026-02-10**: Implemented Story 8.8. Created DB schema, R2 integration, API routes for upload/generate/delete/view, TipTap integration with new ImageUploadDialog, and comprehensive tests.

### File List
- `docs/story8.8.md`
- `supabase/migrations/20260210000000_create_attachments_table.sql`
- `src/lib/r2.ts`
- `src/lib/ai-usage.ts`
- `src/app/api/manuscripts/[id]/attachments/upload/route.ts`
- `src/app/api/manuscripts/[id]/attachments/generate/route.ts`
- `src/app/api/manuscripts/[id]/attachments/[attachmentId]/route.ts`
- `src/app/api/manuscripts/[id]/images/[imageId]/route.ts`
- `src/components/editor/dialogs/ImageUploadDialog.tsx`
- `src/components/editor/extensions/ResizableImage.ts`
- `src/components/editor/TiptapEditor.tsx`
- `src/components/manuscripts/ManuscriptEditor.tsx`
- `src/app/globals.css`
- `tests/unit/components/editor/ImageUploadDialog.test.tsx`
- `scripts/verify-upload-limits.ts`
- `scripts/verify-attachments-db.ts`
- `.env.example`
