# The Bearing: Cost Tracking

## MVP Tier (10 Authors) - Target: $50-70/month

| Component | Unit Cost | Usage | Monthly |
|-----------|-----------|-------|---------|
| Supabase | $25/month | 1 instance | $25 |
| Modal.com (Llama) | $0.000208/sec | [tracked per epic] | $15 |
| Gemini API | $0.075/1M tokens | [tracked per epic] | $8 |
| Vercel | Free | Frontend hosting | $0 |
| Cloudflare R2 | $0.015/GB | 50MB | $3 |
| **TOTAL** | | | **$51** |

## Cost by Epic (Update as stories ship)

### Epic 1: Foundation & Auth
- Story 1.1 (Auth): $0 (no AI)
- Story 1.2 (Dashboard): $0 (no AI)
- Story 1.3 (DB): $0 (infrastructure)
- Story 1.4 (Admin): $0 (no AI)
- **Epic 1 Total**: $0

### Epic 2: Editor + Llama AI
- Story 2.1 (Upload): $0.50/month (storage)
- Story 2.2 (Editor): $0 (no AI yet)
- Story 2.3 (Llama Suggestions): $15/month (with 60% cache)
- **Epic 2 Total**: $15.50

### Epic 3: Consistency Engine
- Story 3.1 (Gemini Checks): $8/month (with 90% cache)
- Story 3.2 (Character Tracking): $0 (parsing)
- Story 3.3 (Plot/Tone): $0 (analysis of existing checks)
- **Epic 3 Total**: $8

### Epic 4: Support & Admin
- Story 4.1 (Messaging): $0 (storage)
- Story 4.2 (Admin): $0
- **Epic 4 Total**: $0

## Running Total: $23.50 (Well within $50 baseline!)