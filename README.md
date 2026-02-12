# Bearing App

AI-powered writing assistant for manuscript authors.

## Environment Variables

### Vertex AI (Story 5.6.1)

The following environment variables are required for Vertex AI integration:

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_PROJECT_ID` | Google Cloud project ID | `my-project-123` |
| `GOOGLE_CLIENT_EMAIL` | Service account email | `vertex-ai@my-project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Service account private key (PEM) | `-----BEGIN PRIVATE KEY-----\n...` |
| `GOOGLE_CLOUD_REGION` | (Optional) Vertex AI region. Default: `us-central1` | `us-east1` |

### Required IAM Roles

The service account (`GOOGLE_CLIENT_EMAIL`) requires the following IAM roles on the Google Cloud project:

- **`roles/aiplatform.user`** — Allows generating content with Vertex AI models
- **`roles/aiplatform.admin`** *(or `roles/aiplatform.cacheAdmin` if available)* — Allows creating, reading, updating, and deleting Vertex AI CachedContent resources

### Granting Roles

```bash
# Replace with your project ID and service account email
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/aiplatform.admin"
```

## Other Environment Variables

See `.env.local.example` for the full list of required environment variables.
