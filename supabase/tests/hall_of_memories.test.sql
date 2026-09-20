-- Run against the LOCAL reset database: supabase test db
-- All fixtures and Storage metadata changes are rolled back. No media bytes.
begin;
-- Local synthetic metadata only, with no object bytes and a final rollback.
-- Current Storage guards raw SQL DELETE even before RLS; opt in transactionally
-- so these tests exercise row policies. Production deletion uses the Storage API.
set local storage.allow_delete_query = 'true';
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, email) values
 ('10000000-0000-0000-0000-000000000001', 'hall-admin@example.invalid'),
 ('10000000-0000-0000-0000-000000000002', 'hall-editor@example.invalid'),
 ('10000000-0000-0000-0000-000000000003', 'hall-no-role@example.invalid');
insert into public.profiles(id, role) values
 ('10000000-0000-0000-0000-000000000001', 'admin'),
 ('10000000-0000-0000-0000-000000000002', 'editor')
on conflict(id) do update set role = excluded.role;
delete from public.profiles where id = '10000000-0000-0000-0000-000000000003';

select ok((select relrowsecurity from pg_class where oid = 'public.memory_albums'::regclass), 'albums enable RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.memory_photos'::regclass), 'photos enable RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.past_members'::regclass), 'past members enable RLS');
select ok(not has_table_privilege('anon', 'public.memory_albums', 'INSERT,UPDATE,DELETE,TRUNCATE'), 'anon has no album write grants');
select ok(not has_table_privilege('anon', 'public.memory_photos', 'INSERT,UPDATE,DELETE,TRUNCATE'), 'anon has no photo write grants');
select ok(not has_table_privilege('authenticated', 'public.past_members', 'TRUNCATE'), 'authenticated cannot truncate past members');
select ok(not has_function_privilege('anon', 'public.swap_memory_photo_order(uuid,uuid,integer,integer)', 'EXECUTE'), 'photo RPC not executable by anon or PUBLIC');
select ok(not has_function_privilege('anon', 'public.swap_past_member_order(uuid,uuid,integer,integer)', 'EXECUTE'), 'member RPC not executable by anon or PUBLIC');
select ok(has_function_privilege('authenticated', 'public.swap_memory_photo_order(uuid,uuid,integer,integer)', 'EXECUTE'), 'authenticated has explicit photo RPC grant');
select ok(has_function_privilege('authenticated', 'public.swap_past_member_order(uuid,uuid,integer,integer)', 'EXECUTE'), 'authenticated has explicit member RPC grant');
select ok(not has_function_privilege('authenticated', 'public.memory_photo_guard()', 'EXECUTE'), 'photo trigger not directly executable');
select ok(not has_function_privilege('anon', 'public.memory_album_publish_guard()', 'EXECUTE'), 'publish trigger not directly executable');
select ok(not (select prosecdef from pg_proc where oid = 'public.swap_memory_photo_order(uuid,uuid,integer,integer)'::regprocedure), 'photo swap is invoker');
select ok(not (select prosecdef from pg_proc where oid = 'public.swap_past_member_order(uuid,uuid,integer,integer)'::regprocedure), 'past member swap is invoker');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(public.current_user_role(), 'editor', 'fixture is editor');
select lives_ok($$insert into public.events(id,slug,title,starts_at,is_published) values
 ('20000000-0000-0000-0000-000000000001','hall-test-event','Hall test event',now(),false)$$, 'editor still creates event');
select lives_ok($$update public.events set title = 'Updated event' where id = '20000000-0000-0000-0000-000000000001'$$, 'editor still updates event');
select lives_ok($$insert into public.memory_albums(id,title,linked_event_id) values
 ('30000000-0000-0000-0000-000000000001','Draft album','20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002','Other draft',null)$$, 'editor creates empty draft albums');
select throws_ok($$update public.memory_albums set is_published = true where id = '30000000-0000-0000-0000-000000000001'$$,
 '23514', 'an album needs at least one photo before publishing', 'empty album cannot publish');
select throws_ok($$insert into public.memory_albums(title,is_published) values ('Empty published',true)$$,
 '23514', null, 'cannot insert empty published album');
select throws_ok($$insert into public.memory_albums(title) values ('  ')$$, '23514', null, 'album title cannot be blank');
select lives_ok($$insert into public.memory_photos(id,album_id,image_url,thumbnail_url,alt_text,sort_order) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','https://example.invalid/original.jpg','https://example.invalid/thumbnail.webp','First photo',999),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','https://example.invalid/original2.jpg','https://example.invalid/thumbnail2.webp','Second photo',999),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','https://example.invalid/original3.jpg','https://example.invalid/thumbnail3.webp','Other photo',999)$$, 'editor appends photos');
select results_eq($$select sort_order from public.memory_photos where album_id = '30000000-0000-0000-0000-000000000001' order by sort_order,created_at,id$$,
 $$values (0),(1)$$, 'DB assigns append positions ignoring supplied values');
select throws_ok($$update public.memory_photos set album_id = '30000000-0000-0000-0000-000000000002' where id = '40000000-0000-0000-0000-000000000001'$$,
 '23514', 'photo identity and album cannot change', 'cannot reparent a photo');
select throws_ok($$update public.memory_photos set id = '40000000-0000-0000-0000-000000000099' where id = '40000000-0000-0000-0000-000000000001'$$,
 '23514', null, 'cannot change photo identity');
select throws_ok($$update public.memory_photos set alt_text = ' ' where id = '40000000-0000-0000-0000-000000000001'$$,
 '23514', null, 'cannot remove meaningful alt text');
select throws_ok($$update public.memory_photos set thumbnail_url = '' where id = '40000000-0000-0000-0000-000000000001'$$,
 '23514', null, 'cannot remove thumbnail');
select lives_ok($$update public.memory_photos set caption = 'A caption' where id = '40000000-0000-0000-0000-000000000001'$$, 'editor edits caption');
select lives_ok($$select public.swap_memory_photo_order('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',0,1)$$, 'editor swaps photo order');
select is((select id::text from public.memory_photos where album_id = '30000000-0000-0000-0000-000000000001' order by sort_order,created_at,id limit 1),
 '40000000-0000-0000-0000-000000000002', 'first ordered photo becomes cover');
select throws_ok($$select public.swap_memory_photo_order('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',0,1)$$,
 '40001', null, 'stale photo order rejected');
select throws_ok($$select public.swap_memory_photo_order('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',1,0)$$,
 '22023', 'photos must belong to the same album', 'cross-album swap rejected');
select lives_ok($$update public.memory_albums set is_published = true where id = '30000000-0000-0000-0000-000000000001'$$, 'populated album publishes');
select throws_ok($$insert into public.past_members(name) values ('Unauthorized')$$, '42501', null, 'editor cannot insert past member');
select throws_ok($$insert into public.team_members(slug,name,role) values ('hall-unauthorized','Unauthorized','Test')$$, '42501', null, 'editor still cannot create team member');
select throws_ok($$select public.swap_past_member_order('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',0,1)$$,
 '42501', null, 'editor cannot call past member reorder');

-- Exercise storage metadata policies, not the remote Storage API.
select lives_ok($$insert into storage.objects(bucket_id,name) values ('media','gallery/hall-test/original.jpg')$$, 'editor uploads gallery prefix');
select lives_ok($$update storage.objects set name = 'gallery/hall-test/renamed.jpg' where bucket_id = 'media' and name = 'gallery/hall-test/original.jpg'$$, 'editor can rename within gallery');
select throws_ok($$update storage.objects set name = 'past-members/hall-test/stolen.jpg' where bucket_id = 'media' and name = 'gallery/hall-test/renamed.jpg'$$,
 '42501', null, 'editor cannot move gallery upload into past-members');
select throws_ok($$update storage.objects set name = 'arbitrary/hall-test.jpg' where bucket_id = 'media' and name = 'gallery/hall-test/renamed.jpg'$$,
 '42501', null, 'editor cannot move upload into arbitrary prefix');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','past-members/hall-test/editor.jpg')$$,
 '42501', null, 'editor cannot upload past member image');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','team/hall-test/editor.jpg')$$,
 '42501', null, 'editor still cannot upload team image');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','arbitrary/hall-test.jpg')$$,
 '42501', null, 'unsupported storage prefix rejected');
select lives_ok($$insert into storage.objects(bucket_id,name) values ('media','events/hall-test/editor.jpg')$$, 'editor events storage remains allowed');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok($$insert into public.past_members(id,name,is_published,sort_order) values
 ('50000000-0000-0000-0000-000000000001','Published past member',true,999),
 ('50000000-0000-0000-0000-000000000002','Draft past member',false,999)$$, 'admin creates past members');
select results_eq($$select sort_order-min(sort_order) over () from public.past_members where id in ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002') order by sort_order$$,
 $$values (0),(1)$$, 'past members receive consecutive DB append order even with existing preview data');
select lives_ok($$select public.swap_past_member_order('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',
 (select sort_order from public.past_members where id='50000000-0000-0000-0000-000000000001'),
 (select sort_order from public.past_members where id='50000000-0000-0000-0000-000000000002'))$$, 'admin swaps past members');
select is((select sort_order from public.past_members where id = '50000000-0000-0000-0000-000000000001'),
 (select sort_order+1 from public.past_members where id='50000000-0000-0000-0000-000000000002'), 'member order changed');
select throws_ok($$select public.swap_past_member_order('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',0,1)$$,
 '40001', null, 'stale past member swap rejected');
select lives_ok($$insert into public.team_members(id,slug,name,role) values ('60000000-0000-0000-0000-000000000001','hall-team','Hall team member','Test')$$, 'admin still creates team member');
select lives_ok($$update public.team_members set bio = 'Updated' where id = '60000000-0000-0000-0000-000000000001'$$, 'admin still updates team member');
select lives_ok($$insert into storage.objects(bucket_id,name) values ('media','past-members/hall-test/admin.jpg'),('media','team/hall-test/admin.jpg')$$, 'admin uploads past member and team images');

-- anon can see only published metadata, including parent-protected photos.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.memory_albums where id in ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002')), 1, 'anon sees published album only');
select is((select count(*)::int from public.memory_photos where album_id = '30000000-0000-0000-0000-000000000002'), 0, 'anon cannot read draft child photos');
select is((select count(*)::int from public.memory_photos where album_id = '30000000-0000-0000-0000-000000000001'), 2, 'anon reads published photos');
select is((select count(*)::int from public.past_members where id in ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002')), 1, 'anon sees published past member only');
select throws_ok($$insert into public.memory_albums(title) values ('Anon')$$, '42501', null, 'anon cannot create album');
select throws_ok($$update public.memory_albums set title = 'Anon' where id = '30000000-0000-0000-0000-000000000001'$$, '42501', null, 'anon cannot update album');
select throws_ok($$delete from public.memory_photos where id = '40000000-0000-0000-0000-000000000001'$$, '42501', null, 'anon cannot delete photo');
select throws_ok($$insert into public.past_members(name) values ('Anon')$$, '42501', null, 'anon cannot create member');
select throws_ok($$select public.swap_memory_photo_order('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',1,0)$$, '42501', null, 'anon photo RPC refused');
select throws_ok($$select public.swap_past_member_order('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',1,0)$$, '42501', null, 'anon member RPC refused');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','gallery/hall-test/anon.jpg')$$, '42501', null, 'anon cannot upload');
select is((select count(*)::int from storage.objects where bucket_id = 'media' and name = 'gallery/hall-test/renamed.jpg'), 1, 'existing public media read preserved');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(public.current_user_role(), null::text, 'fixture has no permission role');
select is((select count(*)::int from public.memory_albums where id = '30000000-0000-0000-0000-000000000002'), 0, 'no-role cannot read draft album');
select is((select count(*)::int from public.memory_photos where album_id = '30000000-0000-0000-0000-000000000002'), 0, 'no-role cannot read draft photos');
select is((select count(*)::int from public.past_members where id = '50000000-0000-0000-0000-000000000002'), 0, 'no-role cannot read draft past member');
select throws_ok($$insert into public.memory_albums(title) values ('No role')$$, '42501', null, 'no-role cannot create album');
select throws_ok($$select public.swap_memory_photo_order('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',1,0)$$, '42501', null, 'no-role cannot reorder');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','gallery/hall-test/no-role.jpg')$$, '42501', null, 'no-role cannot upload gallery');
with changed as (update public.memory_albums set title = 'No role' where id = '30000000-0000-0000-0000-000000000001' returning id) select is(count(*)::int, 0, 'no-role album update affects zero rows') from changed;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
with changed as (update public.past_members set name = 'Editor change' where id = '50000000-0000-0000-0000-000000000001' returning id) select is(count(*)::int, 0, 'editor cannot update published past member') from changed;
with changed as (delete from public.past_members where id = '50000000-0000-0000-0000-000000000001' returning id) select is(count(*)::int, 0, 'editor cannot delete past member') from changed;
with changed as (update public.team_members set name = 'Editor change' where id = '60000000-0000-0000-0000-000000000001' returning id) select is(count(*)::int, 0, 'editor still cannot update team member') from changed;
with changed as (delete from storage.objects where bucket_id = 'media' and name = 'past-members/hall-test/admin.jpg' returning id) select is(count(*)::int, 0, 'editor cannot delete past member image') from changed;
with changed as (update storage.objects set name = 'gallery/hall-test/stolen.jpg' where bucket_id = 'media' and name = 'past-members/hall-test/admin.jpg' returning id) select is(count(*)::int, 0, 'editor cannot move protected source into gallery') from changed;
select lives_ok($$delete from public.events where id = '20000000-0000-0000-0000-000000000001'$$, 'editor still deletes event');
select is((select linked_event_id from public.memory_albums where id = '30000000-0000-0000-0000-000000000001'), null::uuid, 'event deletion detaches album');
select lives_ok($$delete from public.memory_photos where id = '40000000-0000-0000-0000-000000000001'$$, 'editor deletes non-final photo');
select is((select is_published from public.memory_albums where id = '30000000-0000-0000-0000-000000000001'), true, 'nonempty album remains published');
select lives_ok($$delete from public.memory_photos where id = '40000000-0000-0000-0000-000000000002'$$, 'editor deletes final photo');
select is((select is_published from public.memory_albums where id = '30000000-0000-0000-0000-000000000001'), false, 'last photo deletion unpublishes atomically');
select lives_ok($$delete from public.memory_albums where id = '30000000-0000-0000-0000-000000000002'$$, 'album deletion cascades without child trigger failure');
select is((select count(*)::int from public.memory_photos where id = '40000000-0000-0000-0000-000000000003'), 0, 'cascade removed child');
select lives_ok($$delete from storage.objects where bucket_id = 'media' and name = 'gallery/hall-test/renamed.jpg'$$, 'editor deletes gallery upload');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok($$update public.past_members set bio = 'Updated', is_published = true where id = '50000000-0000-0000-0000-000000000002'$$, 'admin updates and publishes past member');
select lives_ok($$delete from public.past_members where id = '50000000-0000-0000-0000-000000000002'$$, 'admin deletes past member');
select lives_ok($$delete from public.team_members where id = '60000000-0000-0000-0000-000000000001'$$, 'admin still deletes team member');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('media','arbitrary/hall-test-admin.jpg')$$, '42501', null, 'admin also limited to supported storage prefixes');
reset role;
select * from finish();
rollback;
