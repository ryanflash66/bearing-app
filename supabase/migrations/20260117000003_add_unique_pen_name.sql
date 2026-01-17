
do $$
declare
  v_dup_count int;
begin
  -- Check for duplicates
  select count(*) into v_dup_count
  from (
    select pen_name
    from public.users
    where pen_name is not null
    group by pen_name
    having count(*) > 1
  ) t;

  if v_dup_count > 0 then
    raise exception 'Cannot apply unique index: Found % duplicate pen_name(s). Please cleanup data first.', v_dup_count;
  end if;

  -- Create the unique index if it passes checks
  create unique index if not exists users_pen_name_unique
    on public.users (pen_name)
    where pen_name is not null;
end $$;
