-- Independent album cover/framing and arbitrary photo ordering. Additive to Hall;
-- no events, team, profiles, Storage policies or earlier RPCs are changed.
alter table public.memory_albums
  add column cover_photo_id uuid,
  add column cover_offset_x integer not null default 0 check (cover_offset_x between -200 and 200),
  add column cover_offset_y integer not null default 0 check (cover_offset_y between -200 and 200),
  add column cover_zoom integer not null default 100 check (cover_zoom between 20 and 400),
  add constraint memory_albums_cover_photo_id_fkey foreign key (cover_photo_id)
    references public.memory_photos(id) on delete set null deferrable initially deferred;
-- Deferred FK checking permits parent touches during a multi-row photo delete;
-- its SET NULL action clears the cover before transaction-end validation. The
-- assignment guard below still rejects nonexistent/cross-album covers at once.
create index memory_albums_cover_photo_id_idx on public.memory_albums(cover_photo_id)
  where cover_photo_id is not null;

create function public.memory_album_cover_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Validate assignment, not unrelated album touches: a multi-row photo DELETE
  -- can touch this parent after removing its cover but before queued FK SET NULL.
  -- Photo identity/album are immutable and the FK handles removal afterwards.
  if new.cover_photo_id is not null
    and (tg_op = 'INSERT' or new.cover_photo_id is distinct from old.cover_photo_id or new.id is distinct from old.id)
    and not exists (
    select 1 from public.memory_photos p where p.id = new.cover_photo_id and p.album_id = new.id
  ) then
    raise exception 'cover photo must belong to this album' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.cover_photo_id is not null and new.cover_photo_id is null then
    new.cover_offset_x := 0;
    new.cover_offset_y := 0;
    new.cover_zoom := 100;
    -- FK SET NULL may run before the existing AFTER DELETE unpublish trigger.
    -- Do not let that intermediate update violate the empty-publication guard.
    if not exists (select 1 from public.memory_photos p where p.album_id = new.id) then
      new.is_published := false;
    end if;
  end if;
  -- A nonnull selection can be saved together with custom framing atomically.
  -- Clients reset framing when choosing another photo unless intentionally set.
  return new;
end
$$;
-- PostgreSQL runs same-event triggers by name. "cover" must precede "publish"
-- so clearing the deleted final cover can unpublish before publication checking.
create trigger memory_album_cover_guard before insert or update on public.memory_albums
  for each row execute function public.memory_album_cover_guard();
revoke all on function public.memory_album_cover_guard() from public, anon, authenticated;

create function public.reorder_memory_photos(p_album_id uuid, p_expected_ids uuid[], p_ordered_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare actual_ids uuid[];
begin
  if coalesce(public.current_user_role(), '') not in ('admin', 'editor') then
    raise exception 'only an editor or admin may reorder photos' using errcode = '42501';
  end if;
  if p_album_id is null or p_expected_ids is null or p_ordered_ids is null
    or coalesce(array_ndims(p_expected_ids), 1) <> 1
    or coalesce(array_ndims(p_ordered_ids), 1) <> 1 then
    raise exception 'album and one-dimensional photo arrays are required' using errcode = '22023';
  end if;
  if array_position(p_expected_ids, null) is not null or array_position(p_ordered_ids, null) is not null then
    raise exception 'photo arrays cannot contain null' using errcode = '22023';
  end if;
  -- Parent first serializes appends and reorders. Fixed child order coordinates
  -- other reorder RPCs. Direct child writes can still deadlock; retry after 40P01.
  perform 1 from public.memory_albums where id = p_album_id for update;
  if not found then
    raise exception 'album does not exist or is not writable' using errcode = '22023';
  end if;
  perform 1 from public.memory_photos where album_id = p_album_id order by id for update;
  select coalesce(array_agg(id order by sort_order, id), '{}'::uuid[]) into actual_ids
    from public.memory_photos where album_id = p_album_id;
  if actual_ids is distinct from p_expected_ids then
    raise exception 'photo order changed; refresh and retry' using errcode = '40001';
  end if;
  -- Sorted-array equality checks cardinality, membership and duplicates at once;
  -- rows from another album or a partial desired list are never silently ignored.
  if (select coalesce(array_agg(x order by x), '{}'::uuid[]) from unnest(p_ordered_ids) x)
    is distinct from (select coalesce(array_agg(x order by x), '{}'::uuid[]) from unnest(actual_ids) x) then
    raise exception 'new order must contain every album photo exactly once' using errcode = '22023';
  end if;
  update public.memory_photos p set sort_order = (desired.position - 1)::integer
    from unnest(p_ordered_ids) with ordinality as desired(id, position)
    where p.id = desired.id and p.album_id = p_album_id;
end
$$;
revoke all on function public.reorder_memory_photos(uuid, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_memory_photos(uuid, uuid[], uuid[]) to authenticated;
