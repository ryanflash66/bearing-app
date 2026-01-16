-- Migration: Add avatar_url and bio fields to users table
-- Story 6.2: Public Author Profile/Blog
-- Required for AC: "I see the author's bio, avatar, and list of published books"

-- Add avatar_url for profile pictures
alter table public.users
  add column if not exists avatar_url text;

-- Add bio for author description
alter table public.users
  add column if not exists bio text;

-- Comment for documentation
comment on column public.users.avatar_url is 'URL to author profile picture/avatar';
comment on column public.users.bio is 'Author biography shown on public profile';
