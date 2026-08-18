-- ============================================================================
-- Atomic team reordering
-- ============================================================================
-- Swapping two members' positions was originally two separate round trips from
-- the browser. If the second one failed, both rows ended up holding the same
-- sort_order while the screen still showed the old order — and Postgres gives
-- no stable ordering for tied values, so the list would then shuffle itself.
--
-- One call, one transaction. security invoker so the caller's own permissions
-- apply and the team_write policy still governs who may write.
--
-- The explicit admin check is not the security boundary — RLS already reduced
-- a non-admin's updates to zero rows. It is there because doing so returned
-- success while changing nothing, and a silent no-op is the failure mode this
-- project's edge-case policy rules out.
-- ============================================================================

create or replace function public.swap_team_sort_order(id_a uuid, id_b uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_a int;
  order_b int;
begin
  if coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'only an admin may reorder team members';
  end if;

  if id_a = id_b then
    return;
  end if;

  -- Lock both rows in a fixed id order. Without this, two admins swapping the
  -- same pair in opposite directions could deadlock.
  perform 1 from public.team_members
   where id in (id_a, id_b)
   order by id
     for update;

  select sort_order into order_a from public.team_members where id = id_a;
  select sort_order into order_b from public.team_members where id = id_b;

  if order_a is null or order_b is null then
    raise exception 'both members must exist to swap positions';
  end if;

  update public.team_members set sort_order = order_b where id = id_a;
  update public.team_members set sort_order = order_a where id = id_b;
end
$$;

revoke all on function public.swap_team_sort_order(uuid, uuid) from public, anon;
grant execute on function public.swap_team_sort_order(uuid, uuid) to authenticated;
