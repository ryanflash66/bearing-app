# Story 4.4: Support Agent Dashboard

## Description

As a Support Agent, I want a dedicated dashboard with a queue and user context snapshot, so that I can resolve issues efficiently without asking basic questions. This workspace aggregates all open issues and provides the data needed to solve them.

## Acceptance Criteria (Gherkin Format)

### AC 4.4.1: User Snapshot Side-Panel

- **Given:** An agent viewing a specific ticket
- **When:** The page loads
- **Then:** A side panel displays key user context: Subscription Tier, Usage Limit Status, Last Error Log (if available)

### AC 4.4.2: Queue Management & Stale Detection

- **Given:** The main ticket queue view
- **When:** Loaded
- **Then:** Tickets are sorted by priority/age
- **And:** 'Stale' tickets (e.g., pending agent > 48h) are visually highlighted (Red indicator/border)

### AC 4.4.3: PII Masking

- **Given:** Sensitive user data in the snapshot (Email, Billing)
- **When:** Displayed to the Agent
- **Then:** PII is masked or hidden by default (e.g., `j***@gmail.com`), unless a specific "Reveal" action is taken (if architected), or simply kept minimized. *Refining per Principle: Strict Privacy.* PII should be minimized.

### AC 4.4.4: Agent Actions

- **Given:** A ticket
- **When:** Agent enters a reply and clicks "Send & Resolve" (or just Send)
- **Then:** The message is sent and status updated atomically (RPC call)

## Dependencies

- **Story 4.1:** Roles (Agent Access)
- **Story 4.2:** Ticket Engine

## Implementation Tasks (for Dev Agent)

- [ ] Build Page: `/admin/support` (Agent Queue) with filtering/sorting.
- [ ] Build Page: `/admin/support/[id]` (Agent Ticket View).
- [ ] Implement "User Snapshot" component (fetching data from profile/usage tables).
- [ ] Implement "Stale" logic in the UI or backend query.
- [ ] Ensure Role Guards protect these routes (Admin/Support only).

## Cost Estimate

- **Storage:** None
- **Compute:** Complex queries (joins on user/usage)
- **Total:** Minimal

## Latency SLA

- **P95 target:** <1s for dashboard load
- **Rationale:** Internal tool, data density is higher

## Success Criteria (QA Gate)

- [ ] Agent can see queue
- [ ] Agent can see user context
- [ ] Reply updates status correctly
- [ ] Non-agents cannot access these pages
