# Story 5.6: Integrate Custom Fine-Tuned Models (Hybrid AI Stack)

Status: split

> **This story has been split into 4 sub-stories for safe, incremental delivery.**
> Each sub-story is independently deployable and testable.

## Sub-Stories

| Story | Title | Dependencies | Status |
|-------|-------|-------------|--------|
| [5.6.1](story-5.6.1-vertex-ai-context-caching.md) | Vertex AI + Context Caching for Gemini | None | deferred |
| [5.6.2](story-5.6.2-modal-custom-llama.md) | Modal.com Custom Llama Integration | None | deferred |
| [5.6.3](story-5.6.3-r2-manuscript-storage.md) | R2 Manuscript Storage Migration | 5.6.1, 5.6.2 | deferred |
| [5.6.4](story-5.6.4-ai-cost-dashboard.md) | Unified AI Cost & Performance Dashboard | 5.6.1, 5.6.2 | deferred |

## Dependency Graph

```
5.6.1 (Vertex AI) ──┐
                     ├──> 5.6.3 (R2 Migration) ──> 5.6.4 (Dashboard)
5.6.2 (Modal.com) ──┘
```

- 5.6.1 and 5.6.2 can run in parallel (independent AI provider swaps)
- 5.6.3 requires both AI providers migrated so R2 validation covers the full stack
- 5.6.4 best value after all infrastructure is migrated, but can start after 5.6.1 + 5.6.2

## Original Story

As a **Platform Architect**,
I want **to integrate a hybrid AI stack for manuscript editing and consistency checks**,
so that **authors benefit from both long-context analysis and fast, high-quality writing edits, with cost and performance optimized**.

## Architecture Overview

- **Gemini 2.5 Flash on Vertex AI**: Long-context consistency checks using Context Caching to keep costs low
- **Custom-tuned Llama-3 (Unsloth) on Modal.com**: Fast, serverless writing quality edits
- **Supabase**: Cache IDs, metadata, billing cycles, usage tracking
- **Cloudflare R2**: Manuscript file storage (images already on R2 via Story 8.8)

## Impact on Existing Features

### Major Refactors Required
- **Epic 2 (Llama suggestions)**: `src/lib/llama.ts` - Replace OpenRouter with Modal.com (Story 5.6.2)
- **Epic 3 (Gemini consistency)**: `src/lib/gemini.ts` - Replace OpenRouter with Vertex AI (Story 5.6.1)
- **Manuscript storage**: Move `content_text` from Supabase to R2 (Story 5.6.3)

### Admin Feature Impact
- **Admin dashboard**: Model IDs in usage logs will change (transparent to UI)
- **Usage tracking**: New metadata column for Context Cache hit/miss (Story 5.6.1)
- **Cost dashboard**: New admin feature for provider-level cost tracking (Story 5.6.4)
- **Story 9.1** (admin manuscript viewing): Must be implemented AFTER Story 5.6.3

### No Conflict
- **Story 8.8** (image upload): R2 already set up for images, no changes needed

## References

- Story 8.8: Image upload/generation (done - R2 already integrated)
- Story 8.24: Absorbed into this story (removed as standalone)
- Epic 5 PRD: Services & Monetization
- Cloudflare R2, Supabase, Modal.com, Vertex AI docs

---

### Change Log

- 2026-02-10: Split into 4 sub-stories (5.6.1-5.6.4) for incremental delivery with admin impact analysis
- 2026-02-10: Updated to include Story 8.24 and hybrid AI stack details per platform plan
