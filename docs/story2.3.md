# Story 2.3: Real-Time Llama AI Suggestions

## Description

As an author, I can request AI suggestions on selected text or the current paragraph. The system sends a context-limited request to Llama, streams results in under 2 seconds, never auto-applies changes, tracks token usage, and enforces hard monthly caps.

## Acceptance Criteria (Gherkin Format)

### AC 2.3.1

- **Given:** I select text and click "Suggest"
- **When:** The request is sent
- **Then:** A suggestion streams within 2 seconds (P95)

### AC 2.3.2

- **Given:** A suggestion is returned
- **When:** I do not click apply
- **Then:** The manuscript text remains unchanged

### AC 2.3.3

- **Given:** The same text and instruction were recently requested
- **When:** I request again within cache TTL
- **Then:** The cached response is returned without new inference

### AC 2.3.4

- **Given:** My token cap would be exceeded
- **When:** I request a suggestion
- **Then:** The request is rejected with a clear upgrade message

### AC 2.3.5

- **Given:** A suggestion is shown
- **When:** It has confidence <50%
- **Then:** It is labeled as "beta" or "low confidence"

## Dependencies

- **Story 2.1:** Editor exists
- **Story 3.3:** AI usage metering
- **Infrastructure requirement:** Modal.com Llama endpoint reachable

## Implementation Tasks (for Dev Agent)

- [ ] Implement Llama service wrapper (hashing, caching, streaming)
- [ ] Enforce context window limits (<1000 tokens)
- [ ] Add pre-execution token estimation and hard caps
- [ ] Log estimated + actual tokens
- [ ] Implement streaming UI with apply / dismiss controls

## Cost Estimate

- **AI inference:** ~180K tokens/month at 10 authors
- **Storage:** negligible (usage logs)
- **Compute:** ~$0
- **Total:** ~$0.10/month at 10 authors, ~$1 at 100

## Latency SLA

- **P95 target:** 2s end-to-end
- **Rationale:** AI suggestions must feel interactive

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Cache hit rate ≥60%
- [ ] Suggestions never auto-apply
- [ ] Token caps enforced
- [ ] Cost within estimate

## Effort Estimate

- **Dev hours:** 18 hours
- **QA hours:** 8 hours
- **Total:** 26 hours