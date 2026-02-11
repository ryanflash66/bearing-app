# Story 5.6.3: R2 Manuscript Storage Migration

Status: deferred

Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
Dependencies: Story 5.6.1, Story 5.6.2
Blocks: Story 5.6.4, Story 9.1 (formerly 8.14)

## Story

As a **Platform Architect**,
I want **to migrate manuscript content storage from Supabase `content_text` to Cloudflare R2**,
so that **manuscripts are stored in a dedicated object store optimized for large files, reducing database bloat, enabling versioned storage, and unifying all file storage on R2**.

## Background / Current State

- Manuscripts are stored as `content_text` (text column) in the `manuscripts` Supabase table
- All manuscript CRUD operations read/write directly to this column
- Image attachments already use Cloudflare R2 (Story 8.8) via `src/lib/r2.ts`
- R2 client and bucket are already configured (`bearing-uploads` bucket)
- Gemini consistency checks read `content_text` from Supabase (`src/lib/gemini.ts:508`)
- Autosave writes to `content_text` directly

### Key Files Affected
- `src/lib/manuscripts.ts` - Read/write operations, autosave
- `src/lib/gemini.ts` - Reads manuscript content for consistency checks
- `src/lib/llama.ts` - Indirectly (suggestions operate on selected text, not full manuscript)
- `src/lib/r2.ts` - Add manuscript storage functions
- `src/lib/export.ts` - Reads `content_text` for export
- `src/lib/blog.ts` - Similar pattern but for blog posts (NOT in scope, only manuscripts)
- `src/app/api/manuscripts/` - API routes that read/write content
- Supabase migration: Add `r2_storage_path` column, eventual `content_text` deprecation

## Acceptance Criteria

1. **Dual-Write Pattern**: All manuscript save operations write to BOTH Supabase `content_text` AND R2. Supabase remains the source-of-truth during migration. [AC 5.6.3.1]

2. **Feature Flag**: Add `MANUSCRIPTS_READ_FROM_R2` environment variable (default: `false`). When `true`, manuscript reads come from R2. When `false`, reads come from Supabase. Flag enables instant rollback. [AC 5.6.3.2]

3. **R2 Storage Structure**: Manuscripts stored in R2 with path pattern: `manuscripts/{account_id}/{manuscript_id}/content.txt`. Versioned content uses: `manuscripts/{account_id}/{manuscript_id}/versions/{version_id}.txt`. [AC 5.6.3.3]

4. **Migration Script**: Background migration script that copies all existing `content_text` values from Supabase to R2. Script is idempotent (safe to re-run). Logs progress and errors. [AC 5.6.3.4]

5. **Data Integrity**: After migration, verify all manuscripts in R2 match Supabase `content_text` via hash comparison. Zero data loss tolerance. [AC 5.6.3.5]

6. **AI System Validation**: Both Vertex AI consistency checks (Story 5.6.1) and Modal.com suggestions (Story 5.6.2) work correctly when reading from R2. Run full consistency check and suggestion cycle against R2-stored manuscripts in staging. [AC 5.6.3.6]

7. **Admin Role Access**: Admin and super_admin roles can access R2-stored manuscripts through existing API patterns. RLS-equivalent access control enforced at the API layer (R2 has no native RLS). [AC 5.6.3.7]

8. **Autosave Compatibility**: Autosave continues to work with dual-write. No user-visible latency increase from writing to both stores. Autosave writes to R2 asynchronously (fire-and-forget with error logging) while Supabase write remains synchronous. [AC 5.6.3.8]

9. **Export Compatibility**: Manuscript export (`src/lib/export.ts`) reads from the correct source based on feature flag. [AC 5.6.3.9]

10. **Rollback Plan**: If issues arise after flipping to R2 reads, set `MANUSCRIPTS_READ_FROM_R2=false` to instantly revert to Supabase. Dual-write ensures Supabase stays up-to-date. [AC 5.6.3.10]

## Tasks / Subtasks

- [ ] **Task 1: R2 Manuscript Storage Layer**
  - [ ] 1.1: Add manuscript storage functions to `src/lib/r2.ts`: `putManuscriptContent()`, `getManuscriptContent()`, `deleteManuscriptContent()`
  - [ ] 1.2: Define R2 path conventions for manuscripts and versions
  - [ ] 1.3: Add `r2_storage_path` column to `manuscripts` table (nullable, populated on first write)
  - [ ] 1.4: Ensure R2 bucket CORS and access policies allow server-side access

- [ ] **Task 2: Dual-Write Implementation**
  - [ ] 2.1: Update `manuscripts.ts` save/update functions to write to both Supabase and R2
  - [ ] 2.2: R2 write is async (fire-and-forget with error logging) to avoid latency increase
  - [ ] 2.3: Add feature flag `MANUSCRIPTS_READ_FROM_R2` to control read source
  - [ ] 2.4: Update read functions to check flag and route to R2 or Supabase
  - [ ] 2.5: Update autosave to use dual-write pattern

- [ ] **Task 3: Migration Script**
  - [ ] 3.1: Create `scripts/migrate-manuscripts-to-r2.ts`
  - [ ] 3.2: Iterate all manuscripts with `content_text`, upload to R2, set `r2_storage_path`
  - [ ] 3.3: Make script idempotent (skip manuscripts already in R2 via `r2_storage_path` check)
  - [ ] 3.4: Add hash verification step: compare R2 content hash vs Supabase content hash
  - [ ] 3.5: Log progress (batch size, success count, error count)

- [ ] **Task 4: Update Consumers**
  - [ ] 4.1: Update `src/lib/gemini.ts` - read manuscript content via feature-flag-aware function
  - [ ] 4.2: Update `src/lib/export.ts` - read manuscript content via feature-flag-aware function
  - [ ] 4.3: Update API routes that read `content_text` directly
  - [ ] 4.4: Verify version history reads work with R2 storage

- [ ] **Task 5: Admin Access Validation**
  - [ ] 5.1: Verify admin API routes can access R2 manuscripts
  - [ ] 5.2: Ensure super_admin dashboard works with R2 storage
  - [ ] 5.3: Document that Story 9.1 (admin manuscript viewing) must use R2 access patterns

- [ ] **Task 6: Testing & Validation**
  - [ ] 6.1: Unit tests for R2 manuscript storage functions
  - [ ] 6.2: Unit tests for dual-write (verify both stores written)
  - [ ] 6.3: Unit tests for feature flag toggle (read from correct source)
  - [ ] 6.4: Integration test: full manuscript lifecycle (create, edit, autosave, read, export) with R2
  - [ ] 6.5: Integration test: consistency check reading from R2
  - [ ] 6.6: Migration script dry-run on staging
  - [ ] 6.7: Data integrity verification after migration

## Post-Migration Cleanup (Separate Follow-Up Task)

After 2+ weeks of stable R2 reads in production:
- Remove dual-write: stop writing to `content_text`
- Drop `content_text` column from `manuscripts` table (or mark deprecated)
- Remove feature flag
- This is intentionally NOT part of this story to allow safe observation period

## Dev Notes

- R2 has no native row-level security. All access control must be enforced at the API layer. Every route that reads manuscripts must verify user ownership or admin role.
- Autosave frequency is high (every few seconds during active editing). R2 writes must not block the autosave response. Use fire-and-forget with error logging.
- Blog posts (`content_text` in blog-related tables) are NOT in scope. Only manuscripts migrate.
- Version history: if versions reference `content_text` snapshots, those need R2 storage too. Check `manuscript_versions` table structure.
- R2 costs: $0.015/GB/month storage + $0.36/million Class A (write) + $0.036/million Class B (read). Far cheaper than Supabase for large text blobs.

## References

- Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
- Current R2 setup: `src/lib/r2.ts` (from Story 8.8)
- Current manuscript storage: `src/lib/manuscripts.ts`
- Story 9.1: Admin manuscript viewing (must be implemented AFTER this story)
- [Cloudflare R2 docs](https://developers.cloudflare.com/r2/)

---

### Change Log

- 2026-02-10: Created as sub-story of Story 5.6 split
