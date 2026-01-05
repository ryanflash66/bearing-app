-- Story H.4: Job Resilience
-- Function to identify and fail stale consistency check jobs

create or replace function public.recover_stale_jobs(
  timeout_minutes int default 30
)
returns table (
  failed_count bigint,
  job_ids uuid[]
)
language plpgsql
security definer
as $$
declare
  failed_ids uuid[];
  count_val bigint;
begin
  -- Identify stale jobs
  -- Logic: status='running' AND created_at < now() - interval 'X minutes'
  
  with stalled as (
    update public.consistency_checks
    set 
      status = 'failed',
      error_message = 'Job timed out or system restarted (resilience recovery)',
      completed_at = now()
    where 
      status = 'running' 
      and created_at < now() - (timeout_minutes || ' minutes')::interval
    returning id
  )
  select 
    count(*),
    array_agg(id)
  into 
    count_val,
    failed_ids
  from stalled;

  -- Ensure we return 0/empty array if no rows found
  if count_val is null then
    count_val := 0;
    failed_ids := array[]::uuid[];
  end if;

  return query select count_val, failed_ids;
end;
$$;
