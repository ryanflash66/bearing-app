# Story 4.1: Usage Guardrails & Upsell Workflow

## Description

As the system, we automatically detect sustained AI over-usage by active authors across billing cycles and trigger an in-app upsell or overage workflow. The system enforces hard caps gracefully, communicates clearly to users, and integrates with billing while logging all enforcement actions for auditability.

## Acceptance Criteria (Gherkin Format)

### AC 4.1.1

- **Given:** An author exceeds either 10 consistency checks or 10M tokens in a billing cycle
- **When:** The billing cycle closes
- **Then:** The author is marked as "flagged" but no upsell or enforcement action is triggered yet

### AC 4.1.2

- **Given:** The same author exceeds limits again in the next consecutive billing cycle
- **When:** The second cycle closes
- **Then:** An `upsell_required` flag is set and an in-app banner and modal are displayed on next login

### AC 4.1.3

- **Given:** The upsell modal is shown
- **When:** The author clicks "Upgrade to Pro"
- **Then:** They are routed to the upgrade flow and, upon success, limits are updated immediately

### AC 4.1.4

- **Given:** The upsell modal is shown
- **When:** The author declines upgrade
- **Then:** Overage pricing is applied or AI features are disabled with a clear explanation

### AC 4.1.5

- **Given:** An upsell or overage enforcement occurs
- **When:** The action is applied
- **Then:** An immutable audit log entry is recorded with user, account, and reason

## Dependencies

- **Story 3.3:** AI Usage Metering & Hard Caps
- **Infrastructure requirement:** `billing_cycles` and `ai_usage_events` tables
- **Infrastructure requirement:** Frontend modal and banner components

## Implementation Tasks (for Dev Agent)

- [ ] Implement monthly billing cycle close job
- [ ] Aggregate per-author usage per cycle and detect over-limit conditions
- [ ] Track consecutive over-limit cycles and set `upsell_required` flag
- [ ] Implement in-app banner + modal logic
- [ ] Integrate upgrade / overage handling (stub billing if needed)
- [ ] Log all enforcement actions to `audit_logs`
- [ ] Write unit tests for detection logic and state transitions

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** negligible (flags + audit logs)
- **Compute:** ~$0
- **Total:** $0/month at 10 authors, $0 at 100

## Latency SLA

- **P95 target:** <100ms for upsell state check
- **Rationale:** Must not impact dashboard or editor performance

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Two-cycle detection accurate
- [ ] No false positives
- [ ] Audit logs complete
- [ ] Cost within estimate

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 8 hours
- **Total:** 22 hours