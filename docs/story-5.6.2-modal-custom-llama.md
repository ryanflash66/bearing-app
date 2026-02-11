# Story 5.6.2: Modal.com Custom Llama-3 (Unsloth) Integration

Status: deferred

Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
Dependencies: None
Blocks: Story 5.6.3, Story 5.6.4

## Story

As a **Platform Architect**,
I want **to replace the OpenRouter-proxied Llama calls with a custom fine-tuned Llama-3 model hosted on Modal.com**,
so that **writing suggestions are higher quality (tuned to our domain), faster (serverless cold starts < 2s), and we own the model pipeline end-to-end**.

## Background / Current State

- Writing suggestions currently use OpenRouter as a proxy to generic Llama 3.1 8B (`src/lib/llama.ts`)
- No fine-tuning: uses stock Llama 3.1 8B with generic writing assistant prompts
- Streaming support exists via `openRouterChatStream()`
- Session-level cache with 5-minute TTL for repeat requests
- Modal.com is already used for SDXL image generation (Story 8.8), so the platform relationship exists

### Key Files Affected
- `src/lib/llama.ts` - Complete refactor (OpenRouter -> Modal.com API)
- `src/lib/openrouter.ts` - Remove entirely after this story (Gemini removed in 5.6.1)
- `src/lib/config/ai-models.ts` - Update model registry
- `src/app/api/manuscripts/[id]/suggest/route.ts` - Update if interface changes
- `.env.example` - Add Modal Llama endpoint config

## Acceptance Criteria

1. **Modal.com Integration**: Replace OpenRouter Llama calls with direct Modal.com API calls to the custom Llama-3 (Unsloth) endpoint. All writing suggestions route through Modal.com. [AC 5.6.2.1]

2. **Custom Model Deployment**: Unsloth fine-tuned Llama-3 model is deployed on Modal.com as a serverless function. Model weights and inference code are version-controlled in the Modal deployment. [AC 5.6.2.2]

3. **Streaming Support**: Maintain streaming response support. Modal.com endpoint must support SSE or chunked transfer for real-time suggestion delivery to the editor. [AC 5.6.2.3]

4. **Backward Compatibility**: Existing suggestion API endpoints must maintain the same request/response interface. No changes to `LlamaSuggestion`, `LlamaRequest`, or `LlamaResponse` types. [AC 5.6.2.4]

5. **Session Caching**: Preserve existing session-level cache (5-minute TTL) for repeat requests. Cache key logic (request hash) remains unchanged. [AC 5.6.2.5]

6. **Performance**: Suggestion response time < 2s P95 (including Modal cold start). Modal function should use `keep_warm=1` to minimize cold starts during active hours. [AC 5.6.2.6]

7. **Fallback**: If Modal.com is unavailable, log an error and return a user-friendly message. Do NOT fall back to OpenRouter (clean cut). Development/test environments continue to use mock responses. [AC 5.6.2.7]

8. **Environment Config**: Add Modal Llama endpoint to environment config: `MODAL_LLAMA_URL`, reuse existing `MODAL_API_KEY` (shared with SDXL). Update `.env.example`. [AC 5.6.2.8]

9. **Remove OpenRouter**: After this story completes, `src/lib/openrouter.ts` is no longer used by any production code and can be removed entirely (both Gemini and Llama have been migrated). [AC 5.6.2.9]

10. **Usage Tracking**: Model ID in usage logs updates from OpenRouter model name to Modal model identifier. Token tracking continues to work correctly. [AC 5.6.2.10]

## Tasks / Subtasks

- [ ] **Task 1: Modal.com Llama Endpoint**
  - [ ] 1.1: Create Modal function for Llama-3 (Unsloth) inference with streaming support
  - [ ] 1.2: Deploy fine-tuned model weights to Modal volume
  - [ ] 1.3: Configure `keep_warm=1` for production
  - [ ] 1.4: Add health check endpoint for monitoring
  - [ ] 1.5: Test endpoint independently (curl/Postman)

- [ ] **Task 2: Refactor llama.ts**
  - [ ] 2.1: Create `src/lib/modal-llama.ts` with Modal.com API client
  - [ ] 2.2: Replace `callLlamaAPI()` to call Modal.com endpoint
  - [ ] 2.3: Replace `callLlamaAPIStream()` to use Modal.com streaming (SSE)
  - [ ] 2.4: Keep same function signatures and return types (backward compat)
  - [ ] 2.5: Update model name in `logUsageEvent()` calls
  - [ ] 2.6: Update mock responses for dev/test environments

- [ ] **Task 3: Remove OpenRouter**
  - [ ] 3.1: Verify no production code imports from `openrouter.ts`
  - [ ] 3.2: Remove `src/lib/openrouter.ts`
  - [ ] 3.3: Remove `OPENROUTER_API_KEY` from `.env.example`
  - [ ] 3.4: Update `src/lib/config/ai-models.ts` to remove OpenRouter model mappings
  - [ ] 3.5: Clean up any remaining OpenRouter references in tests

- [ ] **Task 4: Testing & Validation**
  - [ ] 4.1: Unit tests for Modal.com API client (streaming + non-streaming)
  - [ ] 4.2: Unit tests for error handling (timeout, 500, rate limit)
  - [ ] 4.3: Integration test: full suggestion flow with Modal.com
  - [ ] 4.4: Verify existing suggestion API endpoints unchanged
  - [ ] 4.5: Performance benchmark: cold start latency, warm latency vs OpenRouter baseline
  - [ ] 4.6: Verify session cache still works correctly

## Dev Notes

- Modal.com auth uses `Bearer ${MODAL_API_KEY}` - same pattern as SDXL endpoint (Story 8.8)
- Streaming: Modal supports FastAPI `StreamingResponse` which works with SSE. Match the chunked format that `openRouterChatStream` currently produces.
- Unsloth fine-tuning: Model should be tuned on writing improvement examples (grammar, clarity, style). Training data and config are outside this story's scope but must be completed before deployment.
- `keep_warm=1` costs ~$0.15/hr on A10G. Consider scheduling warm hours based on usage patterns.
- The OpenRouter removal (Task 3) should be the LAST task, only after confirming both Gemini (5.6.1) and Llama (this story) are fully migrated and stable.

## References

- [Modal.com web endpoints docs](https://modal.com/docs/guide/web-endpoints)
- [Unsloth fine-tuning](https://github.com/unslothai/unsloth)
- Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
- Current implementation: `src/lib/llama.ts`, `src/lib/openrouter.ts`
- Story 2.3: Original Llama suggestions implementation
- Story 8.8: Existing Modal.com integration for SDXL image generation

---

### Change Log

- 2026-02-10: Created as sub-story of Story 5.6 split
