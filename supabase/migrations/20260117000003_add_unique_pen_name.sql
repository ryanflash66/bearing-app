-- Enforce unique pen_name handles for public profile routing.
create unique index if not exists users_pen_name_unique
  on public.users (pen_name)
  where pen_name is not null;
