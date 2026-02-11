-- Migration: cover job retention cleanup function
-- Story 5.9

create or replace function public.purge_stale_cover_jobs(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with deletable as (
    select cj.id
    from public.cover_jobs cj
    where cj.status in ('completed', 'failed')
      and coalesce(cj.completed_at, cj.requested_at) < now() - make_interval(days => retention_days)
      and not exists (
        select 1
        from public.gallery_assets ga
        where ga.job_id = cj.id
      )
      and not exists (
        select 1
        from public.manuscripts m
        where m.cover_url = cj.selected_url
           or m.cover_image_url = cj.selected_url
      )
  )
  delete from public.cover_jobs cj
  using deletable d
  where cj.id = d.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_stale_cover_jobs(integer) to service_role;

