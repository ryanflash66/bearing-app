# API Contracts

## Overview
The application uses Next.js App Router API Routes (`src/app/api`) to provide backend services. These routes are secured using Supabase Authentication.

## Endpoints

### Manuscripts

**Base Path**: `/api/manuscripts`

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/manuscripts` | GET | List manuscripts for current user/account | Yes |
| `/api/manuscripts` | POST | Create a new manuscript | Yes |
| `/api/manuscripts/[id]` | GET | Retrieve a specific manuscript | Yes |
| `/api/manuscripts/[id]` | PUT | Update manuscript content (autosave) | Yes |
| `/api/manuscripts/[id]` | DELETE | Soft delete a manuscript | Yes |
| `/api/manuscripts/cleanup` | POST | Trigger cleanup of soft-deleted items | Yes (Admin) |

## Authentication
All API routes require a valid Supabase session. The `middleware.ts` handles session validation and refreshes tokens.

## Error Handling
Standard HTTP status codes are used:
- `200`: Success
- `400`: Bad Request (Validation failed)
- `401`: Unauthorized (No session)
- `403`: Forbidden (RLS violation or insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error
