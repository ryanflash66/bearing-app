# Story 3.3: AI Usage Metering & Hard Caps

## Description

As the platform, every AI request (Llama and Gemini) must be metered with estimated and actual token counts. Usage records are immutable per billing cycle, hard caps are enforced before execution, and sustained overuse triggers an upsell flag.

## Acceptance Criteria (Gherkin Format)

### AC 3.3.1

- **Given:** An AI request is about to execute
- **When:** Estimated tokens exceed the remaining monthly allowance
- **Then:** The request is rejected with a clear, human-readable error message

### AC 3.3.2

- **Given:** An AI request completes
- **When:** Tokens are counted
- **Then:** An immutable usage event is recorded with estimated and actual tokens

### AC 3.3.3

- **Given:** A billing cycle ends
- **When:** The cycle is closed
- **Then:** Usage records become immutable and cannot be updated or deleted

### AC 3.3.4

- **Given:** A user views usage data
- **When:** The dashboard loads
- **Then:** Monthly token usage and check counts are shown accurately

### AC 3.3.5

- **Given:** An account exceeds limits for two consecutive cycles
- **When:** The second cycle closes
- **Then:** An `upsell_required` flag is set for consumption by Epic 4

## Dependencies

- **Story 2.3:** Llama suggestions
- **Story 3.1:** Gemini checks
- **Infrastructure requirement:** `billing_cycles` and `ai_usage_events` tables exist

## Implementation Tasks (for Dev Agent)

- [x] Implement token estimation helpers (shared across AI services)
- [x] Implement `ai_usage_events` append-only logging
- [x] Enforce hard caps pre-execution for all AI calls
- [x] Implement billing cycle open/close logic
- [x] Add aggregation queries for dashboard usage
- [x] Write immutability tests (updates/deletes denied)

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0.01/month (usage logs)
- **Compute:** ~$0
- **Total:** ~$0/month at 10 authors, ~$0 at 100

## Latency SLA

- **P95 target:** <50ms overhead per AI request
- **Rationale:** Metering must not materially affect AI latency

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Estimated vs actual tokens within ±5%
- [ ] Hard caps enforced consistently
- [ ] Usage records immutable
- [ ] Cost within estimate

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours