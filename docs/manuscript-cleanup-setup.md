# Manuscript Cleanup Job Setup

This document describes how to set up the scheduled cleanup job for soft-deleted manuscripts (Story 2.1.4: 30-day retention).

## Overview

The cleanup job permanently deletes manuscripts that have been soft-deleted for more than 30 days. This ensures compliance with the retention policy while allowing recovery within the retention period.

**Endpoint:** `POST /api/manuscripts/cleanup`  
**Retention Period:** 30 days  
**Authentication:** API key via `x-api-key` header

---

## Prerequisites

1. **Environment Variables:**
   - `CLEANUP_API_KEY` - Secret key for authenticating cleanup job requests
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS for cleanup)
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL

2. **Access:**
   - Access to your deployment platform's cron/scheduled job configuration
   - Supabase service role key (found in Supabase Dashboard → Settings → API)

---

## Setup Instructions

### Option 1: Vercel Cron Jobs (Recommended)

If deploying to Vercel, add a cron job configuration:

1. **Create `vercel.json` in project root:**

```json
{
  "crons": [
    {
      "path": "/api/manuscripts/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC.

2. **Set Environment Variables in Vercel:**

```bash
# In Vercel Dashboard → Settings → Environment Variables
CLEANUP_API_KEY=your-secret-api-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. **Deploy:**

The cron job will be automatically configured on your next deployment.

### Option 2: External Cron Service

Use a service like **cron-job.org**, **EasyCron**, or **GitHub Actions**:

**Example: GitHub Actions (`.github/workflows/cleanup.yml`):**

```yaml
name: Manuscript Cleanup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run Cleanup Job
        run: |
          curl -X POST \
            -H "x-api-key: ${{ secrets.CLEANUP_API_KEY }}" \
            https://your-domain.com/api/manuscripts/cleanup
```

**Secrets to configure:**
- `CLEANUP_API_KEY` - Your secret API key

### Option 3: AWS EventBridge / Lambda

If using AWS:

1. **Create Lambda function** that calls your API endpoint
2. **Create EventBridge rule** with schedule: `cron(0 2 * * ? *)`
3. **Set Lambda environment variables:**
   - `CLEANUP_API_KEY`
   - `API_ENDPOINT` (your Next.js API URL)

---

## API Endpoint Details

### Request

```http
POST /api/manuscripts/cleanup
x-api-key: your-secret-api-key
```

### Response (Success)

```json
{
  "message": "Successfully cleaned up 5 manuscripts",
  "deletedCount": 5,
  "cutoffDate": "2024-11-23T02:00:00.000Z"
}
```

### Response (No Work)

```json
{
  "message": "No manuscripts to clean up",
  "deletedCount": 0
}
```

### Response (Error)

```json
{
  "error": "Unauthorized"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid API key)
- `500` - Server error

---

## Health Check

The endpoint also supports GET for health checks:

```http
GET /api/manuscripts/cleanup
```

**Response:**
```json
{
  "status": "ok",
  "endpoint": "manuscript-cleanup",
  "retentionDays": 30
}
```

---

## Monitoring

### Logs

The cleanup job logs:
- Number of manuscripts deleted
- Individual manuscript IDs and titles
- Any errors encountered

Check your deployment platform's logs for:
- `Cleaning up X manuscripts deleted before Y`
- `Successfully cleaned up X manuscripts`

### Audit Trail

All purged manuscripts are logged to the `audit_logs` table with:
- `action`: `"manuscript_purged"`
- `entity_type`: `"manuscript"`
- `metadata`: Contains title, deleted_at, purged_at, retention_days

Query audit logs:
```sql
SELECT * FROM audit_logs 
WHERE action = 'manuscript_purged' 
ORDER BY created_at DESC;
```

---

## Testing

### Manual Test

```bash
# Test locally (requires local Supabase)
curl -X POST http://localhost:3000/api/manuscripts/cleanup \
  -H "x-api-key: your-test-key"

# Test production
curl -X POST https://your-domain.com/api/manuscripts/cleanup \
  -H "x-api-key: your-production-key"
```

### Verify Cleanup

1. Create a test manuscript
2. Soft delete it
3. Manually set `deleted_at` to 31 days ago:
   ```sql
   UPDATE manuscripts 
   SET deleted_at = NOW() - INTERVAL '31 days' 
   WHERE id = 'test-id';
   ```
4. Run cleanup job
5. Verify manuscript is permanently deleted

---

## Security Considerations

1. **API Key:** Use a strong, randomly generated key (e.g., `openssl rand -hex 32`)
2. **Service Role Key:** Never expose this key in client-side code
3. **Rate Limiting:** Consider adding rate limiting to prevent abuse
4. **IP Whitelisting:** Optionally restrict to specific IPs (if using external cron)

---

## Troubleshooting

### "Unauthorized" Error

- Verify `CLEANUP_API_KEY` matches in both environment and request header
- Check environment variables are set correctly in deployment platform

### "Server configuration error"

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set

### No Manuscripts Deleted

- Check if any manuscripts have `deleted_at` older than 30 days
- Verify RLS policies allow service role to delete
- Check logs for specific error messages

---

## Schedule Recommendations

- **Frequency:** Daily (recommended)
- **Time:** Off-peak hours (e.g., 2 AM UTC)
- **Timezone:** Use UTC for consistency

**Common Cron Patterns:**
- Daily: `0 2 * * *` (2 AM UTC)
- Weekly: `0 2 * * 0` (2 AM UTC, Sundays)
- Twice daily: `0 2,14 * * *` (2 AM and 2 PM UTC)

---

## Related Documentation

- Story 2.1: Manuscript CRUD + Autosave
- Architecture: Database & Data Model
- Supabase RLS Policies

