# Cover Generator Ops Runbook (Story 5.9)

## 1) R2 Lifecycle Policy

Configure a lifecycle rule in Cloudflare R2:

- Prefix: `tmp/covers/`
- Expiration: `2 days` (48 hours)
- Action: delete objects

This keeps temporary generation artifacts short-lived without app-level cleanup code.

## 2) Permanent Path Protection

Do not include these prefixes in lifecycle expiration rules:

- `covers/`
- `gallery/`

Those objects are user-selected or gallery-saved assets and must persist.

## 3) Vertex Imagen Quota Guardrail

- Track Imagen QPM in Google Cloud Console (Vertex AI -> Quotas).
- If queue depth increases and QPM is constrained:
  - Keep new jobs in `cover_jobs.status = queued`
  - Dispatch workers at a throttled rate
  - Respect `retry_after` on 429 responses

## 4) Job Record Retention (30 Days)

Retention policy:

- Eligible for deletion:
  - `cover_jobs.status in ('completed', 'failed')`
  - older than 30 days (`completed_at` fallback `requested_at`)
  - not linked to `gallery_assets.job_id`
  - not currently selected on `manuscripts.cover_url` or `manuscripts.cover_image_url`
- Protected indefinitely:
  - jobs tied to gallery assets
  - jobs tied to currently selected covers

Database function:

- `public.purge_stale_cover_jobs(retention_days integer default 30)`

Manual execution:

```sql
select public.purge_stale_cover_jobs(30);
```

Convenience script:

- `scripts/purge-cover-jobs.sql`

