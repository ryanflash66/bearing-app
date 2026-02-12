# Story 5.6.1: Vertex AI + Context Caching for Gemini Consistency Checks

Status: in-progress

Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
Dependencies: None
Blocks: Story 5.6.3, Story 5.6.4

## Story

As a **Platform Architect**,
I want **to replace the OpenRouter-proxied Gemini calls with direct Vertex AI integration and enable Context Caching**,
so that **consistency checks are faster, more cost-effective (up to 75% savings on cached content), and we control the full request pipeline**.

## Background / Current State

- Consistency checks currently use OpenRouter as a proxy to Gemini Flash (`src/lib/gemini.ts`)
- Caching is application-level only: SHA-256 hash of manuscript content matched against `consistency_checks` table
- No Vertex AI Context Caching (server-side cache of large context windows)
- Model ID logged as OpenRouter model name in `ai_usage_events`

### Key Files Affected
- `src/lib/gemini.ts` - Complete refactor (OpenRouter -> Vertex AI SDK)
- `src/lib/openrouter.ts` - Remove Gemini-related model configs (keep Llama until 5.6.2)
- `src/lib/ai-usage.ts` - Add metadata column support for cache tracking
- `src/lib/config/ai-models.ts` - Update model registry
- `src/app/api/manuscripts/[id]/consistency-check/route.ts` - Update if interface changes
- Supabase migration: Add `metadata` JSONB column to `ai_usage_events`

## Acceptance Criteria

1. **Vertex AI Integration**: Replace OpenRouter Gemini calls with direct Vertex AI SDK (`@google-cloud/vertexai`). All consistency checks route through Vertex AI. [AC 5.6.1.1]

2. **Context Caching**: Implement Vertex AI Context Caching for manuscript content. Cache the full manuscript context so repeat checks (e.g., after minor edits) reuse the cached context at reduced cost. [AC 5.6.1.2]

3. **Cache ID Tracking**: Store Vertex AI cache IDs in Supabase. Link cache entries to manuscript IDs so cached contexts can be reused or invalidated when manuscripts change significantly. [AC 5.6.1.3]

4. **Hash-Based Invalidation**: Invalidate (delete/ignore) cached context when manuscript content changes (detected by strict SHA-256 hash mismatch of normalized content). **Crucial**: Do NOT use fuzzy "content delta" logic; rely on strict hash matching to prevent stale context errors. [AC 5.6.1.4]

5. **Usage Metadata & Cost Tracking**: Add `metadata` JSONB column to `ai_usage_events` table. Log distinct cost drivers: `cache_creation_tokens` (full cost) vs `cache_hit_tokens` (reduced cost). Merge with existing metadata. [AC 5.6.1.5]

6. **Backward Compatibility**: Output format must match existing `ConsistencyReport` schema exactly. Map Vertex SDK response artifacts (candidates, safety ratings) to match existing interface. [AC 5.6.1.6]

7. **Availability & Fallback**: If Vertex AI is unavailable (5xx or Region Outage), log detailed error and return a specific user message: "AI Service Temporarily Unavailable - Please try again in a few minutes." Do NOT fall back to OpenRouter. [AC 5.6.1.7]

8. **Secure Environment Config**: Configure Vertex AI using `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` standard variables. Do NOT support local JSON file paths in production. [AC 5.6.1.8]

9. **Performance & Latency**: Consistency check total latency must not regress. Target: P95 < 20s (adjusted from 15s to account for potential cache creation overhead). [AC 5.6.1.9]

10. **Admin Transparency**: Model ID in usage logs updates to Vertex AI model name (e.g., `gemini-2.0-flash`). Dashboard must distinguish "Cache Creation" operations from "Cache Hit" inference to track full costs. [AC 5.6.1.10]

## Tasks / Subtasks

- [x] **Task 1: Vertex AI SDK Configuration**
  - [x] 1.1: Install `@google-cloud/vertexai` (latest stable). Pin version in `package.json`.
  - [x] 1.2: Create `src/lib/vertex-ai.ts`: Initialize with `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PROJECT_ID`.
  - [x] 1.3: **IAM Setup**: Document required IAM roles in `README.md` (`aiplatform.user`, `aiplatform.cacheAdmin`).
  - [x] 1.4: **Region Strategy**: Config defaults to `us-central1`. Allow override via `GOOGLE_CLOUD_REGION` env var.

- [x] **Task 2: Context Caching Implementation**
  - [x] 2.1: Implement `createCachedContent()`:
    - **Minimum Check**: Only cache if content > 33,000 tokens (or model-specific limit). Fallback to standard `generateContent` if smaller.
    - **Concurrency**: Use Supabase row lock (`FOR UPDATE SKIP LOCKED`) or simple job queue to prevent race conditions on simultaneous checks.
    - **Thrashing Guard**: Enforce a minimum interval (e.g., 5 mins) between cache recreations for the same manuscript.
    - **Payload Size**: Verify gRPC limits (e.g., 10MB). Implement chunking if manuscript exceeds limit.
  - [x] 2.2: Implement `getCachedContent()`:
    - **ID Safety**: Query by `manuscript_id` AND `account_id` (RLS).
    - **Validation**: Check `expires_at` in DB. If valid, try Vertex. Handle 404 as miss (eviction).
    - **Refresh**: On hit, update `expires_at` in DB and call Vertex `updateCachedContent` to extend TTL.
  - [x] 2.3: Implement `invalidateCache()`: Delete Vertex resource. Handle non-existent resource errors gracefully.
  - [x] 2.4: Create Supabase table `vertex_ai_caches` (cache_id, manuscript_id, input_hash, created_at, expires_at).
  - [x] 2.5: **Cleanup Job**: Add a cron function `api/cron/cleanup-caches` to delete rows where `expires_at < NOW()` from DB and Vertex. Implement "forget and sweep" to reconcile orphaned caches.

- [x] **Task 3: Refactor gemini.ts**
  - [x] 3.1: Replace `analyzeConsistencyWithGemini()` to use Vertex AI.
  - [x] 3.2: **Hardcoded Models**: Centralize model ID constants in `src/lib/config/ai-models.ts` (e.g., `gemini-1.5-pro-001`).
  - [x] 3.3: **Response Mapping**: Transform Vertex SDK response to exact `ConsistencyReport` JSON.
  - [x] 3.4: **Mock Updates**: Create `MockVertexClient` class in `src/lib/mocks/vertex-ai.ts` to simulate cache lifecycle (hit/miss/expire/evict) for unit tests.

- [x] **Task 4: Usage Tracking Updates**
  - [x] 4.1: Supabase migration: Add `metadata` JSONB to `ai_usage_events` (safe `IF NOT EXISTS` to avoid locks). Verify table size is manageable before running.
  - [x] 4.2: Update `logUsageEvent()`:
    - Accept `metadata` object.
    - Merge with existing metadata.
  - [x] 4.3: **Cost Visibility**: Log distinct event types/flags:
    - `cache_creation` -> `cache_creation_tokens` (full cost)
    - `cache_hit` -> `cache_hit_tokens` (reduced cost)
  - [x] 4.4: Verify consistency check report shows token counts (input, output, total) and model name.

- [x] **Task 5: Testing & Validation**
  - [x] 5.1: Unit tests for SDK initialization with env vars (no file paths).
  - [x] 5.2: Unit tests for `logUsageEvent` metadata merging.
  - [x] 5.3: Integration test: Create cache -> Use cache -> Expire cache -> Re-create.
  - [ ] 5.4: **Load Test**: Simulate 5 concurrent submissions to test concurrency locking and backoff.
  - [ ] 5.5: **Performance Benchmark**: Benchmark cache creation latency.
  - [x] 5.6: **Test Costs**: Use mocks (`MockVertexClient`) for CI/CD. Restrict live Vertex calls to manual "e2e" scripts.

### Review Follow-ups (AI)
- [x] [AI-Review][MEDIUM] 4.4: Token counts (input/output/total) and model name now displayed in ConsistencyReportSidebar
- [ ] [AI-Review][MEDIUM] 5.4: Implement load test for concurrent submissions
- [ ] [AI-Review][MEDIUM] 5.5: Implement performance benchmark (AC 5.6.1.9 P95 < 20s)
- [ ] [AI-Review][LOW] Clean up Gemini model configs from `src/lib/openrouter.ts` (deferred to Story 5.6.2)

## Dev Notes

- **Secrets**: Use `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` (standard Vercel pattern).
- **Cache Isolation**: The `vertex_ai_caches` table must have RLS enabled.
- **Cost**: Cache *creation* acts like a standard high-token prompt. Ensure `ai_usage_events` reflects this.
- **Quotas**: Vertex AI `ContentCache` API has strict rate limits. Handle 429s gracefully.
- **Cleanup**: The cron job is critical. Vertex charges for *storage* of caches (uptime). Orphaned caches burn money.
- **Token Limits**: Always check token count before caching. Short manuscripts = standard API call.

### References

- [Vertex AI Context Caching docs](https://cloud.google.com/vertex-ai/docs/generative-ai/context-caching/context-cache-overview)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
- Current implementation: `src/lib/gemini.ts`, `src/lib/openrouter.ts`

### Change Log

- 2026-02-10: Created as sub-story of Story 5.6 split
- 2026-02-11: Updated with comprehensive addressing of security, regional, and operational risks. Refined logic for hash-based invalidation, concurrency, and cost tracking.
- 2026-02-11: Code review by Claude Opus 4.6. Fixed 7 HIGH and 5 MEDIUM issues.
- 2026-02-11: Adversarial code review and automated fixes:
  - Fixed HIGH issue: Replaced heuristic `estimateTokens` with accurate Vertex AI `countTokens` for caching decisions.
  - Fixed HIGH issue: Updated `getCachedContent` to return `null` on validation errors, preventing stale cache usage.
  - Fixed MEDIUM issue: Synchronized `File List` with actual git changes (docs/sprint-status.yaml, docs/story5.9.md).
- 2026-02-12: ISS-1 fix (Manual QA): Added token count display (input/output/total + model) to ConsistencyReportSidebar. Task 4.4 completed.

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash (implementation), Claude Opus 4.6 (initial review), Gemini 2.0 Flash (adversarial review + fixes)

### File List
- `src/lib/gemini.ts` (refactored: Vertex AI integration, actual token counts)
- `src/lib/ai-usage.ts` (added metadata parameter)
- `src/lib/vertex-ai.ts` (new: Vertex AI client, caching, shared auth helper)
- `src/lib/config/ai-models.ts` (added VERTEX_AI_MODELS)
- `src/app/api/cron/cleanup-caches/route.ts` (new: cache cleanup cron)
- `src/lib/mocks/vertex-ai.ts` (new: MockVertexClient for tests)
- `supabase/migrations/20260212000000_vertex_ai_caching.sql` (new: vertex_ai_caches table, metadata column, advisory locks)
- `tests/lib/vertex-ai.test.ts` (new: SDK init, metadata, cache lifecycle tests)
- `tests/manuscripts/consistency.test.ts` (updated: Vertex AI mocks)
- `package.json` (added @google-cloud/vertexai, google-auth-library)
- `README.md` (added Vertex AI env vars and IAM docs)
- `vercel.json` (new: cron schedule for cache cleanup)
- `docs/sprint-status.yaml` (updated: story status)
- `docs/story5.9.md` (updated: related Imagen 4.0 changes)
- `src/components/manuscripts/ConsistencyReportSidebar.tsx` (updated: token usage display — AC 5.6.1.5)
- `src/components/manuscripts/ConsistencyReportSidebar.test.tsx` (updated: 4 token usage tests)
- `src/components/manuscripts/ManuscriptEditor.tsx` (updated: pass token counts to sidebar)
