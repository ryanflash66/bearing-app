-- Story 5.9 review follow-up:
-- Optimize cover job polling query path by removing manuscript subquery from SELECT policy.

drop policy if exists "cover_jobs_select_owner" on public.cover_jobs;

create policy "cover_jobs_select_owner"
  on public.cover_jobs for select
  using (user_id = public.get_current_user_id());

