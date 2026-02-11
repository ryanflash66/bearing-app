# Story 5.6.1: Vertex AI + Context Caching for Gemini Consistency Checks

Status: deferred

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

4. **Cache Invalidation**: Invalidate cached context when manuscript content changes beyond a configurable threshold (e.g., >10% content delta from cached version). Use existing `input_hash` comparison to detect changes. [AC 5.6.1.4]

5. **Usage Metadata**: Add `metadata` JSONB column to `ai_usage_events` table. Log Context Cache hit/miss and token savings per request: `{ "cache_hit": boolean, "cached_tokens": number, "cache_id": string }`. [AC 5.6.1.5]

6. **Backward Compatibility**: Existing consistency check API endpoints must maintain the same request/response interface. No changes to `ConsistencyReport`, `ConsistencyIssue`, or `ConsistencyCheckJob` types. [AC 5.6.1.6]

7. **Fallback**: If Vertex AI is unavailable, log an error and return a user-friendly message. Do NOT fall back to OpenRouter (clean cut). Development/test environments continue to use mock responses. [AC 5.6.1.7]

8. **Environment Config**: Add Vertex AI credentials to environment config: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS`. Update `.env.example`. [AC 5.6.1.8]

9. **Performance**: Consistency check latency must not regress. Target: P95 < 15s for manuscripts up to 100k words (comparable to current OpenRouter performance). [AC 5.6.1.9]

10. **Admin Transparency**: Model ID in usage logs updates from OpenRouter model name to Vertex AI model name (e.g., `gemini-2.0-flash`). Existing admin dashboard continues to display usage correctly with no UI changes required. [AC 5.6.1.10]

## Tasks / Subtasks

- [ ] **Task 1: Vertex AI SDK Setup**
  - [ ] 1.1: Install `@google-cloud/vertexai` package
  - [ ] 1.2: Create `src/lib/vertex-ai.ts` with Vertex AI client initialization
  - [ ] 1.3: Add environment variables to `.env.example` and document setup
  - [ ] 1.4: Configure authentication (service account JSON or workload identity)

- [ ] **Task 2: Context Caching Implementation**
  - [ ] 2.1: Implement `createCachedContent()` - cache full manuscript context via Vertex AI API
  - [ ] 2.2: Implement `getCachedContent()` - retrieve existing cache by manuscript ID
  - [ ] 2.3: Implement `invalidateCache()` - delete cached context when content changes
  - [ ] 2.4: Create Supabase table `vertex_ai_caches` (cache_id, manuscript_id, input_hash, created_at, expires_at)
  - [ ] 2.5: Add cache invalidation logic based on content delta threshold

- [ ] **Task 3: Refactor gemini.ts**
  - [ ] 3.1: Replace `analyzeConsistencyWithGemini()` to use Vertex AI SDK + cached context
  - [ ] 3.2: Keep same function signatures and return types (backward compat)
  - [ ] 3.3: Update `createConsistencyCheckJob()` to use Vertex AI model name
  - [ ] 3.4: Remove OpenRouter imports and Gemini-specific model configs from `openrouter.ts`
  - [ ] 3.5: Update mock responses for dev/test environments

- [ ] **Task 4: Usage Tracking Updates**
  - [ ] 4.1: Supabase migration: Add `metadata` JSONB column to `ai_usage_events` (nullable, default null)
  - [ ] 4.2: Update `logUsageEvent()` in `ai-usage.ts` to accept optional metadata parameter
  - [ ] 4.3: Log cache hit/miss, cached_tokens, and cache_id in metadata
  - [ ] 4.4: Verify admin dashboard displays usage correctly with new model names

- [ ] **Task 5: Testing & Validation**
  - [ ] 5.1: Unit tests for cache creation, retrieval, invalidation
  - [ ] 5.2: Unit tests for Vertex AI call with cached vs uncached context
  - [ ] 5.3: Integration test: full consistency check flow with Vertex AI
  - [ ] 5.4: Verify existing consistency check API endpoints unchanged
  - [ ] 5.5: Performance benchmark: compare latency vs OpenRouter baseline

## Dev Notes

- Vertex AI Context Caching has a minimum cache size (32,768 tokens). Short manuscripts may not benefit from caching.
- Cached content has a TTL (default 60 minutes, configurable up to 7 days). Consider setting TTL based on manuscript activity patterns.
- Vertex AI pricing: cached tokens are charged at ~75% discount vs uncached. Track actual savings.
- The `openrouter.ts` module stays for Llama calls until Story 5.6.2 completes. Only remove Gemini model configs.
- Authentication: Prefer workload identity in production, service account JSON in development.

## References

- [Vertex AI Context Caching docs](https://cloud.google.com/vertex-ai/docs/generative-ai/context-caching/context-cache-overview)
- Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
- Current implementation: `src/lib/gemini.ts`, `src/lib/openrouter.ts`
- Story 3.1: Original Gemini consistency check implementation
- Story 8.7: Consistency check enhancement (grammar/style types)

---

### Change Log

- 2026-02-10: Created as sub-story of Story 5.6 split
