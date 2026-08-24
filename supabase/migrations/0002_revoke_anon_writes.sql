-- ============================================================================
-- Harden: strip write privileges from the anonymous (signed-out) role
-- ============================================================================
-- Run this in the SQL Editor the same way as 0001.
--
-- WHY THIS EXISTS. Testing the live database as a signed-out stranger, an
-- attempted insert into public.events was refused with:
--
--     42501 — new row violates row-level security policy for table "events"
--
-- ...rather than "permission denied for table events". The difference is
-- important. It means the anon role still HOLDS the table-level INSERT
-- privilege — granted automatically by this project's default privileges —
-- and the only thing standing in the way is Row Level Security.
--
-- One lock is currently doing all the work. If anyone ever runs
-- "alter table ... disable row level security" while debugging, the site would
-- be open to the entire internet for as long as it stayed off. Revoking the
-- privilege as well means that mistake is survivable.
--
-- Nothing about normal operation changes: signed-in committee members use the
-- authenticated role, which keeps its privileges.
-- ============================================================================

revoke insert, update, delete on public.events       from anon;
revoke insert, update, delete on public.team_members from anon;
revoke all                    on public.profiles     from anon;

-- Signed-out visitors must still be able to READ the website.
grant select on public.events       to anon;
grant select on public.team_members to anon;

-- Confirm the result. Expect SELECT only for anon on events and team_members,
-- and no rows at all for profiles.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee = 'anon'
 order by table_name, privilege_type;
