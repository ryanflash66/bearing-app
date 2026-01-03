-- View: user_current_usage
-- Aggregates usage for the current open billing cycle per user
-- AC 4.2.1: Admin dashboard usage table
-- AC 4.2.4: Fast queries

create or replace view public.user_current_usage as
select 
  e.user_id,
  c.account_id,
  c.id as cycle_id,
  c.start_date as cycle_start,
  coalesce(sum(e.tokens_actual), 0) as total_tokens,
  count(*) filter (where e.feature = 'consistency_check') as total_checks,
  max(e.created_at) as last_activity
from public.billing_cycles c
left join public.ai_usage_events e on c.id = e.cycle_id
where c.status = 'open'
group by c.id, c.account_id, e.user_id;

-- Grant access
grant select on public.user_current_usage to authenticated;
