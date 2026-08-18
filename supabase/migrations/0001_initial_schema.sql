-- ============================================================================
-- DBAS admin dashboard — initial schema, roles, and Row Level Security
-- ============================================================================
-- Run this once, in full, in the Supabase dashboard: SQL Editor → New query →
-- paste → Run. It is safe to re-run; every statement is idempotent.
--
-- READ THIS FIRST. The website is served to browsers that hold a PUBLIC key.
-- Nothing in the JavaScript protects your data. Every protection lives in the
-- policies below, enforced by Postgres on every single request. If you weaken
-- a policy here, you weaken the live site — there is no second line of defence.
--
-- Two roles:
--   admin  — everything, including the team list and handing out roles
--   editor — events only; cannot touch team members, cannot change any role
--
-- See PLAN.md for the reasoning behind each decision.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- One row per person who can sign in. Created automatically by the trigger in
-- section 3 when an admin adds a user in the Supabase dashboard.
--
-- NOTE ON NAMING: profiles.role is a PERMISSION LEVEL.
-- team_members.role (further down) is a JOB TITLE, e.g. "Treasurer".
-- They are unrelated. Never mix them up in policy code.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'editor' check (role in ('admin', 'editor')),
  created_at  timestamptz not null default now()
);

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  -- Stable key so the JSON import can be re-run without creating duplicates.
  slug          text unique not null,
  title         text not null,
  tag           text not null default 'Social',
  -- Nullable on purpose: none of the three existing past events has one.
  description   text,
  -- Replaces the old free-text "21 July 2026" + "6:00 PM" pair. Upcoming vs
  -- past is derived from this, so nobody has to move events between lists.
  starts_at     timestamptz not null,
  location      text,
  -- Either a full Supabase Storage URL, or a legacy /public path such as
  -- "events/party.png". The site renders both.
  image_url     text,
  cta           text,
  link          text,
  is_featured   boolean not null default false,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  -- Carries over the existing string ids, e.g. "livroop-gill".
  slug          text unique not null,
  name          text not null,
  -- JOB TITLE (President, Treasurer, ...). Not a permission. See note above.
  role          text not null,
  image_url     text,
  bio           text,
  tags          text[] not null default '{}',
  linkedin_url  text,
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_starts_at_idx   on public.events (starts_at desc);
create index if not exists team_sort_order_idx    on public.team_members (sort_order);


-- ----------------------------------------------------------------------------
-- 2. ROLE LOOKUP
-- ----------------------------------------------------------------------------

-- Returns the signed-in caller's permission level, or NULL when signed out.
--
-- SECURITY DEFINER matters here. Policies on events and team_members need to
-- read profiles; if this ran as the caller it would re-trigger the profiles
-- policies and recurse forever. Running as the function owner bypasses RLS and
-- breaks the loop.
--
-- Consequence: do NOT run "alter table public.profiles force row level
-- security". FORCE applies RLS to the owner too, which reintroduces the
-- recursion this function exists to prevent.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. TRIGGERS
-- ----------------------------------------------------------------------------

-- 3a. New sign-in accounts get a profile automatically, as 'editor'.
-- An admin promotes the few who need more (see section 7).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'editor')
  on conflict (id) do nothing;
  return new;
end
$$;

-- auth.users is owned by supabase_auth_admin, not postgres. On some projects
-- CREATE TRIGGER here fails with "must be owner of relation users" (42501).
-- Because the whole file runs as one transaction, an unguarded failure would
-- roll back EVERYTHING above — tables, policies, grants included. This block
-- catches that so the rest still commits, and tells you what to do instead.
do $$
begin
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'create trigger on_auth_user_created after insert on auth.users
           for each row execute function public.handle_new_user()';
  raise notice 'OK: profiles will be created automatically for new users.';
exception when others then
  raise notice 'NOTE: could not create the auth.users trigger (%). This is not fatal.', sqlerrm;
  raise notice 'Run the backfill in section 7 after adding each user instead.';
end
$$;


-- 3b. THE PRIVILEGE ESCALATION GUARD.
--
-- Without this, an editor runs one line from the browser console —
--   update profiles set role = 'admin' where id = auth.uid()
-- — and every other policy in this file becomes meaningless.
--
-- This is a trigger rather than a policy because Postgres policies cannot say
-- "you may update these columns but not that one, unless you are an admin".
-- Column-level GRANTs can't express the exception either.
-- The "auth.uid() is not null" clause is load-bearing, and subtle.
--
-- It restricts this guard to requests carrying a logged-in user's token —
-- i.e. anything coming from the website. A raw SQL Editor session has no token,
-- so auth.uid() is NULL and the guard steps aside. That is deliberate: without
-- it, the very first admin could never be created, because promoting someone
-- would require an admin who does not exist yet. Anyone with SQL Editor access
-- already holds full database credentials and could simply drop this trigger,
-- so exempting them concedes nothing.
--
-- The browser-facing guarantee is untouched: a signed-in editor always has a
-- non-null auth.uid(), so they are always checked, and always refused.
--
-- Do NOT rewrite this as "current_user <> 'postgres'". Inside a SECURITY
-- DEFINER function current_user is the function's OWNER, not the caller, so
-- that test would always be false and would silently disable the guard.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'only an admin may change a role';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.prevent_role_self_escalation();


-- 3c. At most one featured event, enforced in the database so it holds even
-- against direct API calls that bypass the dashboard UI.
-- The WHEN clause stops the inner UPDATE from re-firing this trigger.
-- BEFORE, not AFTER: the un-featuring has to happen before the new row lands,
-- so the unique index below is satisfied rather than violated. The WHEN clause
-- means the inner UPDATE (which sets is_featured = false) never re-fires this.
create or replace function public.enforce_single_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.events
     set is_featured = false
   where is_featured and id <> new.id;
  return new;
end
$$;

drop trigger if exists events_single_featured on public.events;
create trigger events_single_featured
before insert or update of is_featured on public.events
for each row when (new.is_featured)
execute function public.enforce_single_featured();

-- Backstop. The trigger gives the friendly behaviour — featuring event B
-- quietly un-features event A. This index makes "two featured events" flatly
-- impossible even if two people click at the same instant, which the trigger
-- alone cannot guarantee.
create unique index if not exists events_one_featured_idx
  on public.events (is_featured) where is_featured;


-- 3d. Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

drop trigger if exists team_touch_updated_at on public.team_members;
create trigger team_touch_updated_at
before update on public.team_members
for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- 4. GRANTS
-- ----------------------------------------------------------------------------
-- RLS decides WHICH ROWS. Grants decide whether the role may touch the table
-- at all. Both are required; a missing grant shows up as a confusing
-- "permission denied for table" that looks nothing like a policy failure.

grant usage on schema public to anon, authenticated;

grant select                         on public.events       to anon, authenticated;
grant insert, update, delete         on public.events       to authenticated;

grant select                         on public.team_members to anon, authenticated;
grant insert, update, delete         on public.team_members to authenticated;

-- No insert or delete for clients: profiles are created by the trigger in 3a
-- and removed by the cascade from auth.users.
grant select, update                 on public.profiles     to authenticated;

-- Defence in depth. RLS already refuses inserts and deletes on profiles
-- (no policy covers them), but some Supabase projects carry default privileges
-- that grant these automatically. If anyone ever disables RLS on this table
-- "just for a minute", a leftover grant would become live instantly.
revoke insert, delete on public.profiles from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.events       enable row level security;
alter table public.team_members enable row level security;

-- --- profiles ---------------------------------------------------------------
-- Read your own row; admins read everyone.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');

-- Update your own row (name/email); admins update anyone. Role changes are
-- blocked by the trigger in 3b regardless of who you are.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using      (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

-- Deliberately NO insert and NO delete policy. With RLS on, anything without a
-- matching policy is refused. Profiles arrive via trigger 3a only.

-- --- events -----------------------------------------------------------------
-- Visitors see published events. Signed-in staff also see unpublished drafts.
-- For a signed-out caller current_user_role() is NULL, and "NULL in (...)" is
-- NULL, which Postgres treats as false — so drafts stay hidden.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to anon, authenticated
  using (is_published or public.current_user_role() in ('admin', 'editor'));

drop policy if exists events_write on public.events;
create policy events_write on public.events
  for all to authenticated
  using      (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

-- --- team_members -----------------------------------------------------------
drop policy if exists team_select on public.team_members;
create policy team_select on public.team_members
  for select to anon, authenticated
  using (is_published or public.current_user_role() = 'admin');

-- Admins only. An editor reaching this table gets refused by the database,
-- not merely by a hidden tab in the dashboard.
drop policy if exists team_write on public.team_members;
create policy team_write on public.team_members
  for all to authenticated
  using      (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ----------------------------------------------------------------------------
-- 6. STORAGE
-- ----------------------------------------------------------------------------
-- Public read, 5 MB limit, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select
  using (bucket_id = 'media');

-- Write policies are PATH-SCOPED so they mirror the table rules. A blanket
-- "any signed-in user" rule would let an editor delete team photos even though
-- the team_members table is admin-only — the row would survive with a dead
-- image URL, or worse, a replaced photo.
drop policy if exists media_events_write on storage.objects;
create policy media_events_write on storage.objects
  for all to authenticated
  using      (bucket_id = 'media'
              and (storage.foldername(name))[1] = 'events'
              and public.current_user_role() in ('admin', 'editor'))
  with check (bucket_id = 'media'
              and (storage.foldername(name))[1] = 'events'
              and public.current_user_role() in ('admin', 'editor'));

drop policy if exists media_team_write on storage.objects;
create policy media_team_write on storage.objects
  for all to authenticated
  using      (bucket_id = 'media'
              and (storage.foldername(name))[1] = 'team'
              and public.current_user_role() = 'admin')
  with check (bucket_id = 'media'
              and (storage.foldername(name))[1] = 'team'
              and public.current_user_role() = 'admin');


-- ----------------------------------------------------------------------------
-- 7. AFTER RUNNING THIS
-- ----------------------------------------------------------------------------
-- 1. Check the messages panel for the notices from section 3a. If it says the
--    auth.users trigger could NOT be created, that is fine — you just have to
--    run the backfill in step 3 each time you add someone.
-- 2. Authentication → Settings: confirm "Allow new users to sign up" is OFF.
-- 3. Authentication → Users: add your committee accounts. Then run this to
--    give anyone still missing a profile row the default 'editor' level. It is
--    safe to run any time, and does nothing if everyone already has one:
--
--      insert into public.profiles (id, email, role)
--      select id, email, 'editor' from auth.users
--      on conflict (id) do nothing;
--
-- 4. Promote whoever should be an admin, using their address:
--
--      update public.profiles set role = 'admin' where email = 'you@example.com';
--
--    This works here in the SQL Editor and nowhere else. Trigger 3b refuses
--    role changes from the website unless an admin makes them — so the first
--    admin has to be created from a raw database session like this one.
-- 5. Confirm it worked:
--
--      select email, role from public.profiles order by role, email;
--
-- 5. Run the adversarial checks in PLAN.md → Verification. Do not skip them.
--    They are the only proof that these policies do what this file claims.
-- ============================================================================
