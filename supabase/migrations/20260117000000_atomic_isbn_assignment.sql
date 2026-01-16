-- Migration: Atomic ISBN pool assignment
-- PR Review Fix: Race condition in ISBN auto-assignment
-- Creates RPC function that atomically claims an ISBN from the pool

-- ============================================================================
-- RPC: claim_isbn_from_pool
-- Atomically claims the next available ISBN and assigns it to a request
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
-- ============================================================================
create or replace function public.claim_isbn_from_pool(p_request_id uuid)
returns table(id uuid, isbn text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isbn_id uuid;
  v_isbn text;
begin
  -- Atomically select and lock an unassigned ISBN
  select ip.id, ip.isbn into v_isbn_id, v_isbn
  from public.isbn_pool ip
  where ip.assigned_to_request_id is null
  limit 1
  for update skip locked;

  -- If no ISBN available, return empty
  if v_isbn_id is null then
    return;
  end if;

  -- Claim the ISBN
  update public.isbn_pool
  set
    assigned_to_request_id = p_request_id,
    assigned_at = now()
  where isbn_pool.id = v_isbn_id;

  -- Return the claimed ISBN
  return query select v_isbn_id, v_isbn;
end;
$$;

-- Grant execute to authenticated users (will be called by service role anyway)
grant execute on function public.claim_isbn_from_pool(uuid) to authenticated;
grant execute on function public.claim_isbn_from_pool(uuid) to service_role;

comment on function public.claim_isbn_from_pool is
  'Atomically claims an available ISBN from the pool and assigns it to a service request. Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';
