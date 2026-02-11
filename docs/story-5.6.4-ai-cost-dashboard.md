# Story 5.6.4: Unified AI Cost & Performance Dashboard

Status: deferred

Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
Dependencies: Story 5.6.1, Story 5.6.2 (5.6.3 recommended but not required)

## Story

As a **Super Admin / Admin**,
I want **a unified dashboard showing real-time AI costs, performance metrics, and Context Cache efficiency across all providers (Vertex AI, Modal.com)**,
so that **I can monitor spend, identify optimization opportunities, and make informed decisions about AI infrastructure**.

## Background / Current State

- AI usage is tracked in `ai_usage_events` table (tokens estimated/actual, feature, model)
- User dashboard shows token usage with monthly cap (10M tokens)
- Admin dashboard shows per-user usage table and "Waive Limits" button
- No cost-in-dollars tracking exists (only token counts)
- No Context Cache hit rate visibility
- No provider-level breakdown (everything lumped together)
- Story 5.6.1 adds `metadata` JSONB column with cache hit/miss data

### Key Files Affected
- `src/lib/ai-usage.ts` - Add cost calculation logic
- `src/lib/usage-admin.ts` - Add provider-level and cost aggregation queries
- `src/app/dashboard/admin/page.tsx` - Enhance admin Usage & Controls section
- `src/app/dashboard/admin/super/page.tsx` - Add system-wide cost view
- `src/components/admin/` - New cost dashboard components
- `src/components/dashboard/AiTokensDetailsSheet.tsx` - Add cost column to user breakdown

## Acceptance Criteria

1. **Cost Calculation**: Convert token counts to USD costs based on provider pricing. Support configurable rate cards per model: Vertex AI Gemini (input/output/cached token rates), Vertex AI Imagen 4.0 (per-image rate, via Modal), Modal.com Llama (per-second compute rate), Modal.com SDXL (per-image rate for inline manuscript images). Store rates in a `ai_model_pricing` config table or environment config. [AC 5.6.4.1]

2. **Admin Cost Dashboard**: Admin dashboard shows per-user cost breakdown with columns: User, Feature, Provider, Tokens Used, Estimated Cost (USD), Actions (last 30 days). Sortable and filterable. [AC 5.6.4.2]

3. **Super Admin System View**: Super admin dashboard shows system-wide metrics:
   - Total spend by provider (Vertex AI vs Modal.com) for current billing period
   - Cost trend chart (daily spend over last 30 days)
   - Top 10 accounts by spend
   - Context Cache hit rate and savings (tokens saved, dollars saved) [AC 5.6.4.3]

4. **Context Cache Metrics**: Display Context Cache efficiency from `ai_usage_events.metadata`:
   - Hit rate percentage (hits / total Gemini requests)
   - Total cached tokens (sum of `metadata.cached_tokens`)
   - Estimated savings in USD (cached_tokens * cache_discount_rate) [AC 5.6.4.4]

5. **User Token Details Enhancement**: Update existing `AiTokensDetailsSheet` component to show estimated cost alongside token counts. Add a "Cost" column to the per-feature breakdown. [AC 5.6.4.5]

6. **Cost Alerts**: Super admins can configure cost alert thresholds. When daily or monthly spend exceeds threshold, create a notification via the existing critical notification system (Story 4.6). Alert config stored in Supabase. [AC 5.6.4.6]

7. **Performance Metrics**: Display P50/P95 latency for each AI feature (consistency checks, suggestions, image generation) using `latency_ms` from `ai_usage_events`. Show trend over last 7 days. [AC 5.6.4.7]

8. **Data Freshness**: Dashboard data refreshes on page load. No real-time WebSocket updates needed (server-rendered). Add "Last updated" timestamp. [AC 5.6.4.8]

## Tasks / Subtasks

- [ ] **Task 1: Cost Calculation Infrastructure**
  - [ ] 1.1: Create `src/lib/ai-pricing.ts` with model pricing rates
  - [ ] 1.2: Implement `calculateCost(model, inputTokens, outputTokens, cachedTokens)` function
  - [ ] 1.3: Add pricing config (environment variables or Supabase config table)
  - [ ] 1.4: Unit tests for cost calculation across all models

- [ ] **Task 2: Usage Admin Queries**
  - [ ] 2.1: Add `getProviderBreakdown()` to `usage-admin.ts` (aggregate by provider)
  - [ ] 2.2: Add `getCostByAccount()` to `usage-admin.ts` (per-account cost totals)
  - [ ] 2.3: Add `getCacheMetrics()` to `usage-admin.ts` (hit rate, savings from metadata)
  - [ ] 2.4: Add `getDailySpendTrend()` for chart data (last 30 days)
  - [ ] 2.5: Add `getLatencyMetrics()` for P50/P95 calculations

- [ ] **Task 3: Admin Dashboard Enhancement**
  - [ ] 3.1: Add cost column to `UserUsageTable` component
  - [ ] 3.2: Add provider breakdown card to admin dashboard
  - [ ] 3.3: Add Context Cache efficiency card (if 5.6.1 metadata is available)

- [ ] **Task 4: Super Admin Cost Dashboard**
  - [ ] 4.1: Create `CostOverviewCard` component (total spend by provider)
  - [ ] 4.2: Create `SpendTrendChart` component (daily spend, last 30 days)
  - [ ] 4.3: Create `TopAccountsTable` component (top 10 by spend)
  - [ ] 4.4: Create `CacheEfficiencyCard` component (hit rate, savings)
  - [ ] 4.5: Create `LatencyMetricsCard` component (P50/P95 by feature)
  - [ ] 4.6: Integrate all components into super admin dashboard page

- [ ] **Task 5: Cost Alerts**
  - [ ] 5.1: Create `cost_alert_config` table (account_id, threshold_daily, threshold_monthly)
  - [ ] 5.2: Add alert check logic to `logUsageEvent()` (or as a separate periodic check)
  - [ ] 5.3: Integrate with existing notification system (Story 4.6)
  - [ ] 5.4: Super admin UI to configure alert thresholds

- [ ] **Task 6: User Token Details Enhancement**
  - [ ] 6.1: Add cost column to `AiTokensDetailsSheet` breakdown table
  - [ ] 6.2: Show estimated cost per feature alongside token counts

- [ ] **Task 7: Testing**
  - [ ] 7.1: Unit tests for cost calculation functions
  - [ ] 7.2: Unit tests for aggregation queries
  - [ ] 7.3: Component tests for new dashboard cards
  - [ ] 7.4: Integration test: full dashboard render with realistic data

## Dev Notes

- Vertex AI pricing (as of 2026): Gemini 2.0 Flash input ~$0.075/1M tokens, output ~$0.30/1M tokens, cached input ~$0.01875/1M tokens (75% discount). Verify current rates before implementation.
- Modal.com pricing: A10G GPU ~$0.000164/sec. Convert per-second to per-request based on average latency. For Llama, estimate tokens/sec throughput to derive cost.
- SDXL image generation (Story 8.8 inline images): fixed per-image cost based on inference time (~2-3s on A10G).
- Imagen 4.0 cover generation (Story 5.9): Vertex AI per-image pricing. Modal compute cost is minimal (orchestration only).
- Cost calculation doesn't need to be exact to the penny. Estimates within 10% are acceptable for dashboard purposes. Actual billing comes from provider invoices.
- The `latency_ms` field was added in the ai-usage tracking updates. Verify it's populated for all recent events.
- Consider adding a "Cost Explorer" page later for deeper analysis (date range filtering, grouping by dimensions). Not in scope for this story.

## References

- Parent: [Story 5.6](story-5.6-integrate-custom-models.md)
- Story 5.6.1: Adds `metadata` JSONB column with cache hit/miss data
- Story 3.3: Original AI usage metering implementation
- Story 4.5: Super admin dashboard
- Story 4.6: Critical notification system (for cost alerts)
- Story 8.19: AI tokens display clarification
- Current usage tracking: `src/lib/ai-usage.ts`, `src/lib/usage-admin.ts`
- [Vertex AI pricing](https://cloud.google.com/vertex-ai/pricing)
- [Modal.com pricing](https://modal.com/pricing)

---

### Change Log

- 2026-02-10: Created as sub-story of Story 5.6 split
