begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
create temporary table original_content as select
  (select md5(coalesce(jsonb_agg(to_jsonb(e) order by id)::text,'[]')) from public.events e) as events_hash,
  (select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from public.team_members t) as team_hash;
insert into auth.users(id,email) values
 ('71000000-0000-0000-0000-000000000001','cover-admin@example.invalid'),
 ('71000000-0000-0000-0000-000000000002','cover-editor@example.invalid'),
 ('71000000-0000-0000-0000-000000000003','cover-unassigned@example.invalid');
insert into public.profiles(id,role) values
 ('71000000-0000-0000-0000-000000000001','admin'),
 ('71000000-0000-0000-0000-000000000002','editor')
on conflict(id) do update set role=excluded.role;
delete from public.profiles where id='71000000-0000-0000-0000-000000000003';
select ok(not has_function_privilege('anon','public.reorder_memory_photos(uuid,uuid[],uuid[])','EXECUTE'),'anon has no reorder grant');
select ok(has_function_privilege('authenticated','public.reorder_memory_photos(uuid,uuid[],uuid[])','EXECUTE'),'authenticated has explicit reorder grant');
select ok(not has_function_privilege('authenticated','public.memory_album_cover_guard()','EXECUTE'),'cover trigger not directly callable');
select ok(not (select prosecdef from pg_proc where oid='public.reorder_memory_photos(uuid,uuid[],uuid[])'::regprocedure),'reorder is invoker');
select is((select proconfig::text from pg_proc where oid='public.reorder_memory_photos(uuid,uuid[],uuid[])'::regprocedure),'{"search_path=\"\""}','reorder pins empty search path');

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
insert into public.memory_albums(id,title) values
 ('72000000-0000-0000-0000-000000000001','Cover test'),
 ('72000000-0000-0000-0000-000000000002','Other cover test'),
 ('72000000-0000-0000-0000-000000000003','Empty test');
insert into public.memory_photos(id,album_id,image_url,thumbnail_url,alt_text) values
 ('73000000-0000-0000-0000-000000000001','72000000-0000-0000-0000-000000000001','one.jpg','one.webp','One'),
 ('73000000-0000-0000-0000-000000000002','72000000-0000-0000-0000-000000000001','two.jpg','two.webp','Two'),
 ('73000000-0000-0000-0000-000000000003','72000000-0000-0000-0000-000000000001','three.jpg','three.webp','Three'),
 ('73000000-0000-0000-0000-000000000004','72000000-0000-0000-0000-000000000002','other.jpg','other.webp','Other');
select is((select cover_photo_id from public.memory_albums where id='72000000-0000-0000-0000-000000000001'),null::uuid,'default cover uses fallback');
select results_eq($$select cover_offset_x,cover_offset_y,cover_zoom from public.memory_albums where id='72000000-0000-0000-0000-000000000001'$$,$$values (0,0,100)$$,'default framing unchanged');
select lives_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000002',cover_offset_x=25,cover_offset_y=-30,cover_zoom=160,is_published=true where id='72000000-0000-0000-0000-000000000001'$$,'editor saves chosen cover and framing atomically');
select results_eq($$select cover_offset_x,cover_offset_y,cover_zoom from public.memory_albums where id='72000000-0000-0000-0000-000000000001'$$,$$values (25,-30,160)$$,'supplied framing retained');
select throws_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000004' where id='72000000-0000-0000-0000-000000000001'$$,'23514','cover photo must belong to this album','cross-album cover rejected');
select throws_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000099' where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'missing cover rejected');
select throws_ok($$update public.memory_albums set cover_offset_x=201 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'x upper bound');
select throws_ok($$update public.memory_albums set cover_offset_x=-201 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'x lower bound');
select throws_ok($$update public.memory_albums set cover_offset_y=201 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'y upper bound');
select throws_ok($$update public.memory_albums set cover_offset_y=-201 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'y lower bound');
select throws_ok($$update public.memory_albums set cover_zoom=19 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'zoom lower bound');
select throws_ok($$update public.memory_albums set cover_zoom=401 where id='72000000-0000-0000-0000-000000000001'$$,'23514',null,'zoom upper bound');
select lives_ok($$update public.memory_albums set cover_offset_x=-200,cover_offset_y=200,cover_zoom=20 where id='72000000-0000-0000-0000-000000000001'$$,'boundary framing accepted');
with changed as (update public.memory_albums set cover_zoom=200 where id='72000000-0000-0000-0000-000000000001' and updated_at='2000-01-01'::timestamptz returning id)
select is(count(*)::int,0,'stale updated_at cover save changes zero rows') from changed;
select lives_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000003']::uuid[],
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002']::uuid[])$$,'editor arbitrarily reorders three photos');
select results_eq($$select id::text,sort_order from public.memory_photos where album_id='72000000-0000-0000-0000-000000000001' order by sort_order,id$$,
 $$values ('73000000-0000-0000-0000-000000000003',0),('73000000-0000-0000-0000-000000000001',1),('73000000-0000-0000-0000-000000000002',2)$$,'order is exact and contiguous');
select is((select cover_photo_id::text from public.memory_albums where id='72000000-0000-0000-0000-000000000001'),'73000000-0000-0000-0000-000000000002','reorder preserves independent cover');
select is((select cover_zoom from public.memory_albums where id='72000000-0000-0000-0000-000000000001'),20,'reorder preserves framing');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000003']::uuid[], '{}'::uuid[])$$,
 '40001','photo order changed; refresh and retry','stale full snapshot rejected');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002']::uuid[],
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001']::uuid[])$$,'22023',null,'missing photo rejected');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002']::uuid[],
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001']::uuid[])$$,'22023',null,'duplicate photo rejected');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002']::uuid[],
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000004']::uuid[])$$,'22023',null,'cross-album photo rejected');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',null,'{}'::uuid[])$$,'22023',null,'null expected array rejected');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001','{}'::uuid[],array[null]::uuid[])$$,'22023',null,'null element rejected');
select lives_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000003','{}'::uuid[],'{}'::uuid[])$$,'empty draft ordering is valid no-op');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select cover_photo_id::text from public.memory_albums where id='72000000-0000-0000-0000-000000000001'),'73000000-0000-0000-0000-000000000002','anon reads published selected cover');
select throws_ok($$update public.memory_albums set cover_zoom=100 where id='72000000-0000-0000-0000-000000000001'$$,'42501',null,'anon cannot frame cover');
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001','{}'::uuid[],'{}'::uuid[])$$,'42501',null,'anon cannot reorder');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001','{}'::uuid[],'{}'::uuid[])$$,'42501',null,'unassigned cannot reorder');
with changed as (update public.memory_albums set cover_zoom=100 where id='72000000-0000-0000-0000-000000000001' returning id)
select is(count(*)::int,0,'unassigned cannot frame cover') from changed;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.reorder_memory_photos('72000000-0000-0000-0000-000000000001',
 array['73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002']::uuid[],
 array['73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000003']::uuid[])$$,'admin reorders');
select lives_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000001',cover_zoom=175 where id='72000000-0000-0000-0000-000000000001'$$,'admin changes cover and framing together');
select is((select cover_zoom from public.memory_albums where id='72000000-0000-0000-0000-000000000001'),175,'new selected cover retains supplied framing');
select lives_ok($$delete from public.memory_photos where id='73000000-0000-0000-0000-000000000001'$$,'selected cover can be deleted');
select results_eq($$select cover_photo_id,cover_offset_x,cover_offset_y,cover_zoom,is_published from public.memory_albums where id='72000000-0000-0000-0000-000000000001'$$,
 $$values (null::uuid,0,0,100,true)$$,'selected deletion clears/resets cover while other photos remain published');
select lives_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000004',cover_zoom=150,is_published=true where id='72000000-0000-0000-0000-000000000002'$$,'select sole cover');
select lives_ok($$delete from public.memory_photos where id='73000000-0000-0000-0000-000000000004'$$,'delete final selected cover without FK/publication conflict');
select results_eq($$select cover_photo_id,cover_zoom,is_published from public.memory_albums where id='72000000-0000-0000-0000-000000000002'$$,
 $$values (null::uuid,100,false)$$,'final selected deletion clears and unpublishes');
select lives_ok($$update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000002' where id='72000000-0000-0000-0000-000000000001'$$,'select cover before cascade');
select lives_ok($$delete from public.memory_albums where id='72000000-0000-0000-0000-000000000001'$$,'album cascade with cyclic cover FK succeeds');
select is((select count(*)::int from public.memory_photos where album_id='72000000-0000-0000-0000-000000000001'),0,'cascade removes photos');
insert into public.memory_photos(id,album_id,image_url,thumbnail_url,alt_text) values
 ('73000000-0000-0000-0000-000000000005','72000000-0000-0000-0000-000000000003','five.jpg','five.webp','Five'),
 ('73000000-0000-0000-0000-000000000006','72000000-0000-0000-0000-000000000003','six.jpg','six.webp','Six');
update public.memory_albums set cover_photo_id='73000000-0000-0000-0000-000000000005',is_published=true where id='72000000-0000-0000-0000-000000000003';
select lives_ok($$delete from public.memory_photos where album_id='72000000-0000-0000-0000-000000000003'$$,'bulk delete including selected cover succeeds');
select results_eq($$select cover_photo_id,is_published from public.memory_albums where id='72000000-0000-0000-0000-000000000003'$$,
 $$values (null::uuid,false)$$,'bulk deletion clears cover and publication');
reset role;
select is((select md5(coalesce(jsonb_agg(to_jsonb(e) order by id)::text,'[]')) from public.events e),(select events_hash from original_content),'existing event rows unchanged');
select is((select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from public.team_members t),(select team_hash from original_content),'existing team rows unchanged');
-- Force the deferred cover FK to validate before the rollback-only test ends.
set constraints all immediate;
select * from finish();
rollback;
