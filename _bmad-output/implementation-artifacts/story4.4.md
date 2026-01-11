# Story 4.4: Admin Dashboard (System View)

Status: completed

## Story
As a Super Admin,
I want a dashboard to see high-level system health and critical alerts,
So that I can monitor platform stability.

## Acceptance Criteria
1.  **Global Metrics:** Dashboard displays Global User Count, Active Tickets (Active meaning non-resolved), and AI Error Rates.
2.  **Role Guard:** Super Admin dashboard is strictly restricted to users with the `super_admin` role. Support Agents or regular Admins MUST be redirected if they attempt to access it.
3.  **Real-Time Data:** Metrics should reflect the current system state, specifically regarding ticket counts.

## Tasks
- [ ] Update `getGlobalMetrics` to include AI Error Rate <!-- id: 4.4.1 -->
- [ ] Add AI Error Rate metric card to Super Admin Dashboard <!-- id: 4.4.2 -->
- [ ] Verify Role Guard for Super Admin dashboard <!-- id: 4.4.3 -->
- [ ] Update metrics layout for better scannability <!-- id: 4.4.4 -->
