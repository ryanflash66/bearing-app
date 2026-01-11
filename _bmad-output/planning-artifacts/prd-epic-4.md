# Epic 4: Support & Admin

**Duration:** Weeks 14-16 (3 weeks)  
**Stories:** 4.1, 4.2, 4.3 (3 stories)  
**Total Effort:** 54 hours (Dev + QA + Review)

---

## Epic Goal

Provide authors with support channels and admins with visibility, enforcement controls, and operational tools to manage usage and prevent cost/quality runaway.

This epic ensures:
- Authors can contact support directly from the app
- Admins see per-user and per-account usage dashboards
- Sustained over-usage triggers upgrades/overages (monetization hook)
- System abuse is detectable and enforceable

---

## Functional Requirements (Epic 4)

| FR | Requirement |
|----|----|
| **FR-19** | Detect sustained over-usage (two billing cycles) |
| **FR-20** | Trigger in-app upsell / overage workflow |
| **FR-21** | In-app support messaging between authors and admins |
| **FR-22** | Admin dashboard with per-author and per-account usage visibility |
| **FR-23** | Admin override controls (disable user, waive limits, etc.) |

---

## Non-Functional Requirements (Epic 4)

| NFR | Requirement |
|-----|---|
| **NFR-11** | Full administrative audit logs for key events (support, overrides, notes) |
| **NFR-14** | Hard caps per request, author, account |
| **NFR-15** | Graceful failure when caps reached |
| **NFR-16** | <$70/month at 10 authors |
| **NFR-17** | <$300/month at 100 authors |

---

## User Stories

### Story 4.1 – Usage Guardrails & Upsell Workflow

**Description**  
System detects when an active author's usage exceeds limits (10 checks/month OR 10M tokens/month) for two consecutive billing cycles, and triggers an in-app upsell workflow with clear messaging and upgrade options.

**Acceptance Criteria**
- **AC 4.1.1:** Given usage in Month 1 exceeds limit (e.g., 15 checks, 12M tokens), then record flagged but no action taken yet
- **AC 4.1.2:** Given usage in Month 2 also exceeds limit, then upsell triggered: in-app banner + modal appears
- **AC 4.1.3:** Given upsell modal, when "Upgrade to Pro" clicked, then user taken to pricing page (or upgrade form)
- **AC 4.1.4:** Given upsell modal, when "Continue without upgrade" clicked, then graceful overage pricing applied (or feature disabled)
- **AC 4.1.5:** Given upgrade completed, then usage limits reset and upsell dismissed

**Effort:** 22 hours  
**Dependencies:** 3.3 (Metering data required)

**Cost Estimate (at 10 authors)**
- Upsell logic: negligible compute
- Banner/modal rendering: negligible
- Database queries (usage lookup): included in Supabase
- **Monthly cost:** $0

**Pricing Model (example)**:
```
Standard Tier (included):
- 10 checks/month
- 10M tokens/month
- $5/month

Pro Tier (upsell):
- 40 checks/month
- 40M tokens/month
- $20/month

Overage (if no upgrade):
- $0.01 per check beyond limit
- $0.000075 per 1k tokens beyond limit
```

---

### Story 4.2 – Admin Dashboard & Overrides

**Description**  
Admins can access a dashboard showing per-author usage (checks/tokens), token spend, upsell status, and can override enforcement (waive limits, disable user, etc.). Every administrative action is captured in full administrative audit logs to harden accountability.

**Acceptance Criteria**
- **AC 4.2.1:** Given admin user, when accessing /admin/dashboard, then table shows: author_name, tokens_used, checks_used, status (active/flagged/over_limit), plan_tier
- **AC 4.2.2:** Given admin clicks override on a user, then enforcement state changes immediately (waive limits, downgrade, disable)
- **AC 4.2.3:** Given override applied, then audit log records: timestamp, admin_id, action, affected_user, reason, and full administrative context
- **AC 4.2.4:** Given large user base (100+ authors), when filtering/sorting, then dashboard remains responsive (<1s per query)
- **AC 4.2.5:** Given user flagged for abuse, then admin can add internal note (visible to admins only) and change status

**Effort:** 20 hours  
**Dependencies:** 4.1 (needs upsell data), 3.3 (needs metering data)

**Cost Estimate (at 10 authors)**
- Admin queries: included in Supabase base plan
- Audit logs: ~500 bytes per action × 10 actions/day = 150KB/month (negligible)
- **Monthly cost:** $0

---

### Story 4.3 – In-App Support Messaging

**Description**  
Authors can send support messages from within the app (simple form, no threaded conversation for MVP). Admins receive notifications and can reply via email or admin panel. Replies are shown in-app.

**Acceptance Criteria**
- **AC 4.3.1:** Given author in app, when clicking "Contact Support", then form appears with subject + message fields
- **AC 4.3.2:** Given message submitted, then admin receives email notification (with reply-to link)
- **AC 4.3.3:** Given admin reply in email or dashboard, then author sees notification in app ("Your support request has been answered")
- **AC 4.3.4:** Given user views support inbox, then all past messages shown in reverse chronological order
- **AC 4.3.5:** Given message sent, then transcript is logged for compliance/audit
- **AC 4.3.6:** Given support queries, RLS policies must use cached auth lookups (via `is_platform_support`) to avoid "Auth RLS Init Plan" performance warnings

**Effort:** 12 hours  
**Dependencies:** 1.1 (Auth to identify author)

**Cost Estimate (at 10 authors)**
- Support messaging storage: ~2KB per message × 5 messages/month = 100KB/month (negligible)
- Email delivery: $0 (Supabase or SendGrid free tier)
- **Monthly cost:** $0

---

## Cost Summary (Epic 4)

### At 10 Authors
| Component | Cost |
|-----------|------|
| Upsell logic | $0 |
| Admin dashboard | $0 |
| Support messaging | $0 |
| Audit logs | $0 |
| **Total** | **$0/month** |

### At 100 Authors
| Component | Cost |
|-----------|------|
| Upsell logic | $0 |
| Admin dashboard | $0 |
| Support messaging | $0 |
| Audit logs | $0 |
| **Total** | **$0/month** |

### At 1000 Authors
| Component | Cost |
|-----------|------|
| Admin infrastructure | $0 |
| Audit log storage | $5 |
| Email delivery (SendGrid if needed) | $10 |
| **Total** | **$15/month** |

---

## Monetization Notes

**Epic 4 enables monetization via:**

1. **Upsell (Story 4.1)**
   - Standard Tier: 10 checks/10M tokens/month → $5/month
   - Pro Tier: 40 checks/40M tokens/month → $20/month
   - Overage: $0.01/check, $0.000075/1k tokens

2. **Price Anchoring**
   - At 10 authors × $5/month = $50/month revenue
   - Infra cost at 10 authors = $51/month
   - **Breakeven achieved at 10 authors in Standard tier**

3. **Path to Profitability**
   - 100 authors × 50% conversion to Pro ($20) + 50% Standard ($5)
   - Revenue: 50 × $20 + 50 × $5 = $1,250/month
   - Cost: ~$320/month (Epic 3 + infrastructure)
   - **Profit: $930/month**

---

## Implementation Notes

### Tech Stack
- **Upsell Logic:** Stripe or custom billing (simple state machine)
- **Admin Dashboard:** React + DataTable library (AG Grid or TanStack Table)
- **Audit Logs:** PostgreSQL with immutable trigger or event log table
- **Support Messaging:** Supabase DB + email notification (SendGrid or AWS SES)

### Admin Controls
```
Override Actions:
1. Waive limits for one billing cycle
2. Disable all AI features (keep editor)
3. Downgrade to free tier
4. Delete user account
5. Add manual token/check budget
```

### Success Criteria (QA Gate)
- ✓ All 12 ACs (4.1-4.3) verified
- ✓ Upsell triggers correctly on day 1 of Month 2 if over-usage in Month 1 and Month 2
- ✓ Admin dashboard loads <1s with 100+ users
- ✓ Full administrative audit logs complete for all intervenions/actions
- ✓ Support emails delivered and replies shown in-app
- ✓ Cost within estimate ($0)
- ✓ No data loss in messaging system

---

## Integration Notes

### Story 4.1 (Upsell) depends on:
- Story 3.3 (Metering) — must have accurate per-author usage data
- Stripe API integration (or custom billing)

### Story 4.2 (Admin) depends on:
- Story 1.3 (Role Management) — must identify admin role
- Story 3.3 (Metering) — must have usage data to display
- Story 4.1 (Upsell state) — must show upsell status

### Story 4.3 (Support) depends on:
- Story 1.1 (Auth) — must identify author sending message

---

## Ready for Development

This epic begins in **Week 14** (after Epic 3 completes).

**Timeline:**
- Week 14: Story 4.3 (support messaging) — lowest complexity, no dependencies on metering
- Week 14-15: Story 4.1 (upsell) — integrates with 3.3
- Week 15-16: Story 4.2 (admin) — integrates with 4.1 + 3.3

**Expected completion:** Week 16

**Gate before Stabilization (Week 17):** All 3 stories merged, upsell logic tested with mock usage data, admin dashboard functional.
