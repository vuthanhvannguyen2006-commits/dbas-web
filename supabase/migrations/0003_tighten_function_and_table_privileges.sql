-- ============================================================================
-- Tighten function and table privileges
-- ============================================================================
-- Findings from auditing the live database, partly via Supabase's own security
-- advisor and partly by reading the raw privilege lists in pg_class.relacl.
--
-- ⚠️ READ SECTION 4 BEFORE RUNNING. One change in here is expected to be safe
-- but is not something the PostgreSQL documentation states outright, so there
-- is a test and a one-line rollback at the bottom. Run the test.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Trigger functions should not be callable by hand
-- ----------------------------------------------------------------------------
-- The advisor reported that handle_new_user and prevent_role_self_escalation
-- are SECURITY DEFINER and reachable at /rest/v1/rpc/<name> by anyone, signed
-- in or not.
--
-- In practice calling them fails — PostgreSQL refuses to run a function
-- returning `trigger` outside a trigger — so this is hygiene rather than an
-- open door. But a SECURITY DEFINER function that the public can invoke is
-- exactly the shape of thing that becomes a hole later, when someone edits it
-- without remembering it is publicly reachable.
revoke all on function public.handle_new_user()                from public, anon, authenticated;
revoke all on function public.prevent_role_self_escalation()   from public, anon, authenticated;
revoke all on function public.enforce_single_featured()        from public, anon, authenticated;
revoke all on function public.touch_updated_at()               from public, anon, authenticated;

-- current_user_role() is deliberately NOT revoked. The RLS policies on events
-- and team_members call it, and policy expressions run as the caller — so anon
-- and authenticated both need EXECUTE or every read breaks. It leaks nothing:
-- signed out it returns null, and signed in it returns only your own role,
-- which you can already read from your own profiles row.


-- ----------------------------------------------------------------------------
-- 2. Pin the last mutable search_path
-- ----------------------------------------------------------------------------
-- Missed in 0001 — the other four functions were pinned, this one was not.
-- Without it, whoever calls the function controls which schema its identifiers
-- resolve to.
alter function public.touch_updated_at() set search_path = '';


-- ----------------------------------------------------------------------------
-- 3. Strip the privileges the anon role should never have had
-- ----------------------------------------------------------------------------
-- Migration 0002 revoked INSERT, UPDATE and DELETE from anon. Reading the
-- actual ACL afterwards showed anon still holding:
--
--     events / team_members:  anon=rDxtm
--                                  ^^^^  D=TRUNCATE  x=REFERENCES
--                                        t=TRIGGER   m=MAINTAIN
--
-- TRUNCATE is the one that matters: it empties a table and, unlike DELETE, it
-- is not subject to Row Level Security at all. PostgREST exposes no TRUNCATE
-- endpoint, so this was not reachable from the website — but "not currently
-- reachable" is a weaker guarantee than "not granted".
--
-- Revoke everything and grant back only SELECT. This is what 0002 did for
-- profiles, which is why profiles has no anon entry at all.
revoke all on public.events       from anon;
revoke all on public.team_members from anon;

grant select on public.events       to anon;
grant select on public.team_members to anon;


-- ----------------------------------------------------------------------------
-- 4. TEST THIS NOW, then read the rollback below
-- ----------------------------------------------------------------------------
-- Section 1 revokes EXECUTE on functions that triggers call. PostgreSQL
-- documents that EXECUTE is required to CREATE a trigger; it does not state
-- whether the privilege is re-checked each time the trigger fires. It is not
-- expected to be — triggers fire as a property of the table, not as a call the
-- writing user makes — but that is inference, not a documented guarantee.
--
-- So confirm it, immediately, by signing in to /admin as the editor account
-- and creating an event. Creating one exercises three of the four functions:
-- touch_updated_at, enforce_single_featured, and the guard on profiles.
--
-- If writes fail with a permission error mentioning one of these functions,
-- undo section 1 with:
--
--   grant execute on function public.handle_new_user()              to authenticated;
--   grant execute on function public.prevent_role_self_escalation() to authenticated;
--   grant execute on function public.enforce_single_featured()      to authenticated;
--   grant execute on function public.touch_updated_at()             to authenticated;
--
-- ...and tell me, because the fix is then to move these functions to a private
-- schema that PostgREST does not expose, rather than to leave them public.


-- ----------------------------------------------------------------------------
-- 5. Confirm the result
-- ----------------------------------------------------------------------------
-- Expect anon to hold r (SELECT) and nothing else on both tables, and no row
-- at all for profiles.
select c.relname as tbl, unnest(coalesce(c.relacl, '{}'))::text as acl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('events', 'team_members', 'profiles')
 order by c.relname, acl;
