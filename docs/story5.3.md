# Story 5.3: Service Request Management

## Description
As an Author (Subscriber),
I want my service requests to be automatically logged and tracked by the system,
So that I can see the progress of my orders and the Bearing team can fulfill them efficiently.

## Acceptance Criteria

### AC 5.3.1: Backend Request Creation
- **Given** an authenticated user with an active `pro` or `subscriber` tier
- **When** a POST request is made to `/api/services/request` with a valid `serviceId`
- **Then** a new record is created in the `service_requests` table with:
    - `user_id`: Current user's ID
    - `service_type`: The provided `serviceId`
    - `status`: 'pending'
    - `metadata`: Any additional context (e.g., manuscript_id)

### AC 5.3.2: Subscription Gating
- **Given** a user with a `free` or `none` subscription tier
- **When** a request is made to `/api/services/request`
- **Then** the request is rejected with a 403 Forbidden status
- **And** no record is created in `service_requests`.

### AC 5.3.3: Request Visibility
- **Given** a successfully created service request
- **When** the author views their "Orders" or "Marketplace" page
- **Then** the request is visible in their request history.
- **And** the status correctly reflects 'pending'.

## Dev Notes
- Use the `service_requests` table created in migration `20260114000000_create_service_marketplace_tables.sql`.
- RLS should already ensure users can only see their own requests.
- Admins/Support agents should be able to see all requests via the fulfillment dashboard.

## Tasks
- [ ] Implement `/api/services/request/route.ts` API endpoint.
- [ ] Add subscription tier validation logic.
- [ ] Integrate with `MARKETPLACE_SERVICES` for ID validation.
- [ ] Add unit tests for request creation logic.
