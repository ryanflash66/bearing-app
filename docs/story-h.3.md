# Story H.3: Performance & Latency Baselines

## Description
Instrument the application to capture and log performance metrics for critical user interactions, specifically AI generation tasks (Llama suggestions, Gemini consistency checks). Establish a baseline for current performance to inform future optimization work (caching, edge deployment).

## Acceptance Criteria

### AC H.3.1: AI Latency Tracking
- **Given** a user requests an AI suggestion or consistency check
- **When** the request completes (success or failure)
- **Then** the total duration (in milliseconds) is logged to the `ai_usage_events` table (or separate metric log).
- **And** distinguishing between "queue time" vs "processing time" if possible.

### AC H.3.2: Performance Utility
- **Given** a `measurePromise` wrapper utility
- **When** wrapping any async operation
- **Then** it returns the result and the duration.

### AC H.3.3: Baseline Report
- **Given** the instrumented code
- **When** we run the standard `tests/manual/test-consistency.ts` flow (or similar scripts)
- **Then** we can query the database to see the average latency for `consistency_check` and `suggestion` events.

## Implementation Tasks

- [x] Create `src/lib/monitoring/performance.ts` utility.
- [x] Add `latency_ms` column to `ai_usage_events` table (migration).
- [x] Instrument `src/lib/gemini.ts` to track full job duration.
- [x] Instrument `src/lib/llama.ts` to track API request duration.
- [x] Update `logUsageEvent` to accept metrics.
- [x] Run a manual test suite to generate baseline data.

## Technical Notes
- Use `performance.now()` for high-precision timing.
- Store metrics in `ai_usage_events.metadata` JSONB column if we want to avoid schema changes, OR just add a dedicated column. A dedicated `latency_ms` integer column is better for querying averages.
