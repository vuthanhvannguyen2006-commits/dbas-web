-- Hall of Memories: additive only. Existing events, team and compatibility
-- columns/policies remain untouched. Public media URLs are intentionally public;
-- draft metadata is private, but draft uploads must not contain private images.
create table public.memory_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  event_date date,
  story text,
  linked_event_id uuid references public.events(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.memory_albums(id) on delete cascade,
  image_url text not null check (length(btrim(image_url)) > 0),
  thumbnail_url text not null check (length(btrim(thumbnail_url)) > 0),
  alt_text text not null check (length(btrim(alt_text)) > 0),
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create table public.past_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  former_role text,
  years_active text,
  image_url text,
  thumbnail_url text,
  bio text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memory_albums_event_idx on public.memory_albums(linked_event_id);
create index memory_albums_date_idx on public.memory_albums(event_date desc, created_at desc, id);
-- The first photo in this ordering is the album cover. Ties are deterministic.
create index memory_photos_order_idx on public.memory_photos(album_id, sort_order, created_at, id);
create index past_members_order_idx on public.past_members(sort_order, created_at, id);

alter table public.memory_albums enable row level security;
alter table public.memory_photos enable row level security;
alter table public.past_members enable row level security;
revoke all on public.memory_albums, public.memory_photos, public.past_members from public, anon, authenticated;
grant select on public.memory_albums, public.memory_photos, public.past_members to anon, authenticated;
grant insert, update, delete on public.memory_albums, public.memory_photos, public.past_members to authenticated;

create policy memory_albums_read on public.memory_albums for select to anon, authenticated
  using (is_published or (select public.current_user_role()) in ('admin', 'editor'));
create policy memory_albums_write on public.memory_albums for all to authenticated
  using ((select public.current_user_role()) in ('admin', 'editor'))
  with check ((select public.current_user_role()) in ('admin', 'editor'));
create policy memory_photos_read on public.memory_photos for select to anon, authenticated
  using ((select public.current_user_role()) in ('admin', 'editor') or exists (
    select 1 from public.memory_albums a where a.id = album_id and a.is_published
  ));
create policy memory_photos_write on public.memory_photos for all to authenticated
  using ((select public.current_user_role()) in ('admin', 'editor'))
  with check ((select public.current_user_role()) in ('admin', 'editor'));
create policy past_members_read on public.past_members for select to anon, authenticated
  using (is_published or (select public.current_user_role()) = 'admin');
create policy past_members_write on public.past_members for all to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

-- Updating an album already locks its row. Photo mutations take the same lock,
-- so publishing and removal of its last photo cannot both commit an empty
-- published album. These volatile trigger queries see newly committed changes
-- after waiting for the parent lock under the default READ COMMITTED isolation.
-- Direct photo UPDATE/DELETE takes a child row lock before its trigger takes
-- the parent lock. A concurrent parent-first swap or album cascade can therefore
-- deadlock; PostgreSQL aborts one transaction without breaking these invariants.
-- Clients must report the conflict and let the user refresh/retry the action.
create function public.memory_album_publish_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.is_published and not exists (
    select 1 from public.memory_photos where album_id = new.id
  ) then
    raise exception 'an album needs at least one photo before publishing' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger memory_album_publish_guard before insert or update on public.memory_albums
  for each row execute function public.memory_album_publish_guard();
create trigger memory_albums_touch_updated_at before update on public.memory_albums
  for each row execute function public.touch_updated_at();
create trigger past_members_touch_updated_at before update on public.past_members
  for each row execute function public.touch_updated_at();

create function public.memory_photo_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare parent_id uuid;
begin
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.album_id is distinct from old.album_id) then
    raise exception 'photo identity and album cannot change' using errcode = '23514';
  end if;
  parent_id := case when tg_op = 'DELETE' then old.album_id else new.album_id end;
  -- Also version the parent: at REPEATABLE READ a competing writer must retry
  -- rather than validate publication against an older photo snapshot.
  update public.memory_albums set updated_at = now() where id = parent_id;
  -- Cascading album deletion has already removed the parent. Do not obstruct it.
  if not found and tg_op <> 'DELETE' then
    raise exception 'album does not exist or is not writable' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' then
    select coalesce(max(sort_order), -1) + 1 into new.sort_order
      from public.memory_photos where album_id = parent_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
create trigger memory_photo_guard before insert or update or delete on public.memory_photos
  for each row execute function public.memory_photo_guard();

create function public.memory_photo_unpublish_empty() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.memory_albums set is_published = false
    where id = old.album_id and is_published
      and not exists (select 1 from public.memory_photos where album_id = old.album_id);
  return old;
end
$$;
create trigger memory_photo_unpublish_empty after delete on public.memory_photos
  for each row execute function public.memory_photo_unpublish_empty();

create function public.past_member_append_order() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- A namespace-specific transaction lock serializes empty-list and subsequent
  -- appends. Unlike a max()+1 client request, simultaneous inserts cannot tie.
  perform pg_catalog.pg_advisory_xact_lock(1936028274, 1);
  select coalesce(max(sort_order), -1) + 1 into new.sort_order from public.past_members;
  return new;
end
$$;
create trigger past_member_append_order before insert on public.past_members
  for each row execute function public.past_member_append_order();

create function public.swap_memory_photo_order(id_a uuid, id_b uuid, expected_order_a integer, expected_order_b integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.memory_photos; b public.memory_photos; parent_a uuid; parent_b uuid;
begin
  if coalesce(public.current_user_role(), '') not in ('admin', 'editor') then
    raise exception 'only an editor or admin may reorder photos' using errcode = '42501';
  end if;
  if id_a is null or id_b is null or id_a = id_b then
    raise exception 'two different photos are required' using errcode = '22023';
  end if;
  select album_id into parent_a from public.memory_photos where id = id_a;
  select album_id into parent_b from public.memory_photos where id = id_b;
  if parent_a is null or parent_b is null then
    raise exception 'both photos must exist' using errcode = '22023';
  end if;
  if parent_a <> parent_b then
    raise exception 'photos must belong to the same album' using errcode = '22023';
  end if;
  -- Parent first matches album deletion; fixed child order coordinates swaps
  -- with each other. It does not eliminate conflicts with direct photo writes
  -- (see the publication guard comment). Recheck rows after taking the locks.
  perform 1 from public.memory_albums where id = parent_a for update;
  perform 1 from public.memory_photos where id in (id_a, id_b) order by id for update;
  select * into a from public.memory_photos where id = id_a;
  select * into b from public.memory_photos where id = id_b;
  if a.id is null or b.id is null then
    raise exception 'both photos must exist' using errcode = '22023';
  end if;
  if a.album_id <> b.album_id then
    raise exception 'photos must belong to the same album' using errcode = '22023';
  end if;
  if a.sort_order is distinct from expected_order_a or b.sort_order is distinct from expected_order_b then
    raise exception 'photo order changed; refresh and retry' using errcode = '40001';
  end if;
  update public.memory_photos set sort_order = case id when id_a then b.sort_order else a.sort_order end
    where id in (id_a, id_b);
end
$$;

create function public.swap_past_member_order(id_a uuid, id_b uuid, expected_order_a integer, expected_order_b integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.past_members; b public.past_members;
begin
  if coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'only an admin may reorder past members' using errcode = '42501';
  end if;
  if id_a is null or id_b is null or id_a = id_b then
    raise exception 'two different past members are required' using errcode = '22023';
  end if;
  perform 1 from public.past_members where id in (id_a, id_b) order by id for update;
  select * into a from public.past_members where id = id_a;
  select * into b from public.past_members where id = id_b;
  if a.id is null or b.id is null then
    raise exception 'both past members must exist' using errcode = '22023';
  end if;
  if a.sort_order is distinct from expected_order_a or b.sort_order is distinct from expected_order_b then
    raise exception 'past member order changed; refresh and retry' using errcode = '40001';
  end if;
  update public.past_members set sort_order = case id when id_a then b.sort_order else a.sort_order end
    where id in (id_a, id_b);
end
$$;

revoke all on function public.memory_album_publish_guard(), public.memory_photo_guard(),
  public.memory_photo_unpublish_empty(), public.past_member_append_order() from public, anon, authenticated;
revoke all on function public.swap_memory_photo_order(uuid, uuid, integer, integer),
  public.swap_past_member_order(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.swap_memory_photo_order(uuid, uuid, integer, integer),
  public.swap_past_member_order(uuid, uuid, integer, integer) to authenticated;

-- Keep existing bucket limits, public read, events/ and team/ policies intact.
-- Both USING and WITH CHECK matter: renaming cannot escape a permitted prefix.
create policy media_gallery_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'gallery'
    and (select public.current_user_role()) in ('admin', 'editor'))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'gallery'
    and (select public.current_user_role()) in ('admin', 'editor'));
create policy media_past_members_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'past-members'
    and (select public.current_user_role()) = 'admin')
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'past-members'
    and (select public.current_user_role()) = 'admin');
