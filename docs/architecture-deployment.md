# Architecture: Deployment & Operations (Vercel, ECS, Modal, Monitoring)

**Scope:** Frontend deployment, backend infrastructure, job orchestration, observability, scaling, CI/CD.

**Owner:** Phase 2 Setup and Phase 4 Stabilization & Deployment

---

## Overview

The Bearing deploys across multiple managed services for reliability and scale:
- **Frontend (Next.js):** Vercel with automatic deployments
- **Backend (NestJS):** AWS ECS Fargate for stateless API
- **Jobs (Export, Parse, AI):** Modal.com for AI + ECS workers for parsing/exports
- **Database:** Supabase (managed PostgreSQL)
- **Storage:** Cloudflare R2 (zero egress)
- **Monitoring:** Sentry, Vercel Analytics, Modal metrics

---

## Local Development Environment

### Prerequisites
```bash
# Node.js 18+
node --version

# Docker (for Supabase local)
docker --version

# Install dependencies
npm install -g @supabase/cli
npm install -g wrangler  # For Cloudflare dev
```

### Setup Script (Reproducible)
```bash
#!/bin/bash
# scripts/setup-dev.sh

# 1. Clone repo
git clone <repo>
cd bearing-app

# 2. Install deps
npm install

# 3. Create .env.local
cp .env.example .env.local

# 4. Start Supabase local
supabase start

# 5. Run migrations
npm run db:migrate:dev

# 6. Start backend
npm run dev:backend

# 7. Start frontend (in new terminal)
npm run dev:frontend

# 8. Open browser
open http://localhost:3000
```

### .env.local (Local Dev)
```
# Supabase Local (started via 'supabase start')
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<output from 'supabase start'>
SUPABASE_SERVICE_ROLE_KEY=<output from 'supabase start'>

# Modal (dev endpoint)
MODAL_LLAMA_URL=https://api.modal.com/v1/models/bearing-llama-dev
MODAL_API_TOKEN=<dev token>

# Gemini (sandbox credentials)
GEMINI_API_KEY=<sandbox key>

# Encryption (local only, not secure)
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENCRYPTION_IV=00000000000000000000000000000000

# Local backend port
NestJS_PORT=3001
```

---

## Staging Environment

### Staging Deployment (Automatic via GitHub Actions)
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Frontend to Vercel
      - uses: vercel/action@v4
        with:
          token: ${{ secrets.VERCEL_TOKEN }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

      # Backend to ECS
      - name: Deploy to ECS Staging
        run: |
          aws ecs update-service \
            --cluster bearing-staging \
            --service bearing-api \
            --force-new-deployment \
            --region us-east-1

      # Supabase staging migrations
      - name: Run migrations (staging DB)
        run: |
          npm run db:migrate:prod \
            --env=staging
```

### Staging URLs
- **Frontend:** https://staging.bearing.dev
- **Backend API:** https://api-staging.bearing.dev
- **Supabase:** Separate staging project (staging-db)
- **R2:** Staging bucket prefix: `staging/`

### Staging Data
- Test with 2-3 mock accounts
- 10 test manuscripts with various lengths
- Monitor cost: should be <$1/day

---

## Production Environment

### Production Deployment (Manual, Reviewed)
```bash
# Only after staging validation

# 1. Tag release
git tag -a v1.0.0-mvp -m "MVP release"
git push origin v1.0.0-mvp

# 2. GitHub Actions trigger (configured for tags)
# Automatically builds and deploys to production

# 3. Canary rollout (Vercel + ECS)
# Week 1: 10% traffic
# Week 2: 50% traffic
# Week 3: 100% traffic

# 4. Monitor (48h)
# - Sentry error rate
# - Vercel analytics
# - Modal metrics
# - Cost trends
```

### Production URLs
- **Frontend:** https://bearing.dev
- **Backend API:** https://api.bearing.dev
- **Database:** Production Supabase project
- **R2:** Production bucket

### Environment Secrets (AWS Secrets Manager)
```json
{
  "SUPABASE_URL": "https://prod.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY": "...",
  "GEMINI_API_KEY": "...",
  "MODAL_API_TOKEN": "...",
  "AWS_SECRET_ACCESS_KEY": "...",
  "ENCRYPTION_KEY": "..."
}
```

---

## Vercel Frontend Deployment

### Configuration (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "envs": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Performance Optimization
- **Image optimization:** Vercel auto-optimizes via `next/image`
- **Code splitting:** Next.js automatic per-route
- **ISR (Incremental Static Regeneration):** For public pages (landing, docs)

### Monitoring
- **Vercel Analytics:** Track Core Web Vitals
- **Sentry:** Frontend error tracking
- **Custom metrics:** Track suggestion latency, consistency check latency

---

## AWS ECS Fargate Backend Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

### ECS Task Definition
```json
{
  "family": "bearing-api",
  "containerDefinitions": [
    {
      "name": "bearing-api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/bearing:latest",
      "memory": 512,
      "cpu": 256,
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:bearing/prod/db:SUPABASE_SERVICE_ROLE_KEY::"
        }
      ]
    }
  ]
}
```

### ECS Service (Auto-Scaling)
```json
{
  "serviceName": "bearing-api",
  "taskDefinition": "bearing-api:1",
  "desiredCount": 2,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-xxx", "subnet-yyy"],
      "securityGroups": ["sg-xxx"]
    }
  },
  "autoScalingGroupProvider": {
    "autoScalingGroupArn": "arn:aws:autoscaling:...",
    "managedScaling": {
      "status": "ENABLED",
      "targetCapacity": 75,
      "minimumScalingStepSize": 1,
      "maximumScalingStepSize": 10
    }
  }
}
```

**Scaling behavior:**
- Min 2 tasks (high availability)
- Max 10 tasks (cost cap)
- Target 75% CPU utilization

---

## Modal.com AI Jobs

### Modal Endpoint Configuration
```python
# modal_deployment.py
import modal

app = modal.App("bearing-ai")

# Llama endpoint
@app.function(
    gpu="A100",
    container_idle_timeout=120,
    keep_warm=1  # Keep 1 instance warm to avoid cold starts
)
def llama_suggest(selection_text: str, instruction: str) -> dict:
    # Implementation (see architecture-ai.md)
    pass

# Deploy to Modal
if __name__ == "__main__":
    with app.run():
        print("Modal endpoint deployed")
```

### Monitoring Modal Metrics
```bash
# Check endpoint status
modal run modal_deployment.py

# View logs
modal logs --app bearing-ai

# Check cost
# View in Modal dashboard: https://modal.com/dashboard
```

---

## Database Migrations

### Supabase Migration Management
```bash
# Create a new migration
supabase migration new create_users_table

# This creates: supabase/migrations/<timestamp>_create_users_table.sql

# Edit the file, then:
supabase db push

# In production, use GitHub Actions
npm run db:migrate:prod --env=production
```

### Zero-Downtime Migrations
- RLS policies: Safe to add/modify (no schema change)
- New columns: Add with DEFAULT value (backward compatible)
- Column removal: Requires 2-release deprecation period
- Index creation: Use CONCURRENTLY (doesn't lock)

---

## Monitoring & Observability

### Sentry (Error Tracking)
```typescript
// main.ts (NestJS bootstrap)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Automatic error capture
// Also manual:
try {
  await aiService.suggest(...);
} catch (error) {
  Sentry.captureException(error);
}
```

### Metrics Dashboard
```typescript
// Track custom metrics
const suggestionLatency = new Histogram({
  name: 'llama_suggestion_latency_ms',
  help: 'Llama suggestion response time in milliseconds',
  buckets: [100, 500, 1000, 2000, 5000]
});

const startTime = Date.now();
const suggestion = await llama.suggest(...);
suggestionLatency.observe(Date.now() - startTime);
```

### Key Metrics to Monitor

| Metric | Target | Alert |
|--------|--------|-------|
| Frontend load time P95 | <3s | >5s |
| API response time P95 | <200ms | >500ms |
| Llama suggestion latency P95 | <2s | >3s |
| Gemini check latency P95 | <15s | >20s |
| Error rate | <0.1% | >1% |
| Database CPU | <70% | >80% |
| Daily cost | <$7 (at 10 authors) | >$10 |
| Token usage per author | <10M/month | >12M |

### Alerting (PagerDuty)
```yaml
# Sentry alert rule
# If error rate > 1% in 5 minutes, page on-call engineer
```

---

## Cost Optimization

### Cost by Component (at 10 authors)
| Component | Cost | Optimization |
|-----------|------|--------------|
| Vercel Frontend | $0 | Free tier fine for MVP |
| ECS Fargate (2×256) | $15 | Bare minimum for HA |
| Supabase (base) | $25 | Includes 500MB storage |
| Modal Llama | $15 | 60% cache hit |
| Gemini | $8 | 90% cache via Google |
| R2 Storage | $3 | 50MB storage |
| Monitoring (Sentry, etc) | $10 | Free/paid hybrid |
| **Total** | **$76/month** | — |

### Cost Controls
- Supabase: Monitor database size (alert at 400MB)
- Modal: Set spending limit ($50/month) in dashboard
- Gemini: Request quota (1000 requests/day max for MVP)
- ECS: Auto-scale max 10 tasks (cost cap)
- R2: Enable lifecycle rules (delete exports older than 7 days)

---

## Security in Deployment

### TLS Certificates
- **Frontend:** Vercel auto-manages (LetsEncrypt)
- **Backend:** AWS Certificate Manager (auto-renew)
- **Internal:** mTLS between services (optional for MVP)

### Secrets Rotation
```bash
# Rotate API keys every 3 months
aws secretsmanager rotate-secret --secret-id bearing/prod/db

# Before rotating, update code to read new key
# Then notify team to update local .env files
```

### Backup & Disaster Recovery
- **Database:** Supabase automatic daily backups (7-day retention)
- **R2:** Cloudflare data is geo-replicated
- **RTO (Recovery Time Objective):** <1 hour
- **RPO (Recovery Point Objective):** <1 day

---

## Checklist: Ready for Production Launch

- [ ] All stories merged and integration tested
- [ ] Staging fully validated (2-3 week testing)
- [ ] Security audit passed (penetration testing)
- [ ] Performance baseline established (<2s suggestions, <15s checks)
- [ ] Cost baseline stable (<$10/day at 10 authors)
- [ ] Monitoring configured (Sentry, Vercel, custom metrics)
- [ ] Alerts configured (error rate, cost, latency)
- [ ] Backups tested (restore to staging)
- [ ] Runbook documented (incident response)
- [ ] DNS configured (bearing.dev, api.bearing.dev)
- [ ] SSL certificates valid
- [ ] Team training complete (deploy, monitor, debug)

---

## Post-Launch Operations (Week 1)

- **Day 1-3:** Canary rollout (10% → 50%)
- **Day 3-5:** Ramp to 100% if stable
- **Day 5-7:** Monitor error rates, cost, latency
- **End of Week:** Retrospective + v1.1 planning

---

## Ready for Development

**Estimated effort:** 8-10 hours (Phase 2 Setup + Phase 4 Deployment)

**Team:** 1 DevOps/SRE for setup, handoff to developers for maintenance
